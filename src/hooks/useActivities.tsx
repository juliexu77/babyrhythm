import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useHousehold } from "./useHousehold";
import { useToast } from "./use-toast";

export interface DatabaseActivity {
  id: string;
  household_id: string;
  type: 'feed' | 'diaper' | 'nap' | 'note';
  logged_at: string;
  timezone?: string; // IANA timezone name (e.g., "America/Los_Angeles")
  details: {
    // Feed details
    feedType?: "bottle" | "nursing" | "solid";
    quantity?: string;
    unit?: "oz" | "ml";
    // Diaper details
    diaperType?: "wet" | "poopy" | "both";
    hasLeak?: boolean;
    hasCream?: boolean;
    // Nap details
    startTime?: string;
    endTime?: string;
    duration?: string;
    // General
    note?: string;
    displayTime?: string; // Store the original selected time for consistent display
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

// DISPLAY CONVERSION: Convert UTC timestamp to local display time
// This happens at the edges - storage is UTC, display is local
export const convertToUIActivity = (dbActivity: DatabaseActivity) => {
  // Convert UTC timestamp to local display time
  const utcDate = new Date(dbActivity.logged_at); // PostgreSQL stores as UTC
  
  let displayTime: string;
  
  if (dbActivity.type === 'nap' && dbActivity.details.startTime) {
    // For naps, use the startTime directly as it's already in display format
    displayTime = dbActivity.details.startTime;
  } else {
    // Convert UTC to local display time
    displayTime = utcDate.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  }

  return {
    id: dbActivity.id,
    type: dbActivity.type,
    time: displayTime,
    loggedAt: dbActivity.logged_at, // Keep UTC timestamp for calculations
    timezone: dbActivity.timezone,   // Keep IANA timezone
    details: dbActivity.details
  };
};

export function useActivities() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const { toast } = useToast();
  const [activities, setActivities] = useState<DatabaseActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Since households are auto-created on login, we should always have one
    fetchActivities();
    
    // Set up real-time subscription - household will exist by the time this runs
    if (household) {
      const activitiesChannel = supabase
        .channel('activities-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `household_id=eq.${household.id}`
          },
          (payload) => {
            console.log('Activity change:', payload);
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(activitiesChannel);
      };
    }
  }, [user, household]);

  const fetchActivities = async () => {
    if (!household) {
      // Household should exist, but if not, wait for it
      setLoading(false);
      return;
    }

    try {
      // Get all activities from all time
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('household_id', household.id)
        .order('logged_at', { ascending: false });

      if (error) throw error;

      // Sort activities by actual activity time (startTime for naps, logged_at for others)
      const sortedData = (data || []).sort((a, b) => {
        const getActivityTime = (activity: any) => {
          if (activity.type === 'nap' && activity.details.startTime) {
            const base = new Date(activity.logged_at);
            const minutes = parseTimeToMinutes(activity.details.startTime);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            base.setHours(hours, mins, 0, 0);
            return base.getTime();
          }
          return new Date(activity.logged_at).getTime();
        };

        return getActivityTime(a) - getActivityTime(b); // Changed: ascending order (oldest first)
      });

      setActivities(sortedData as DatabaseActivity[]);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error loading activities",
        description: "Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (activity: {
    type: 'feed' | 'diaper' | 'nap' | 'note';
    time: string;
    details: any;
  }) => {
    if (!user || !household) throw new Error('User not authenticated or no household');

    try {
      // TIMEZONE ARCHITECTURE:
      // 1. User selects a local wall time (e.g., "6:45 PM")
      // 2. Interpret it in the BROWSER's timezone (baby's active timezone)
      // 3. Store as UTC + IANA timezone (no manual offset math - Date handles it)
      
      // Get user's IANA timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Parse the selected time string
      const [time, period] = activity.time.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      // CRITICAL: new Date(year, month, day, hour, minute) interprets in BROWSER's timezone
      // It creates a Date object that internally represents the correct UTC instant
      // for that local time. NO manual offset adjustment needed!
      const now = new Date();
      const localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour24,
        minutes,
        0,
        0
      );
      
      // Get offset for logging/validation only (NOT for conversion)
      const offsetMinutes = localDate.getTimezoneOffset();
      
      // toISOString() returns the correct UTC representation - NO additional conversion needed
      const logged_at = localDate.toISOString();
      
      console.log('🕐 Activity timestamp (NO DOUBLE SHIFT):', {
        userSelectedTime: activity.time,
        timezone,
        browserOffset: offsetMinutes,
        localDateDebug: localDate.toString(),
        storedUTC: logged_at,
        verification: `${activity.time} ${timezone} → ${logged_at}`
      });

      const { data, error } = await supabase
        .from('activities')
        .insert({
          household_id: household.id,
          type: activity.type,
          logged_at,      // UTC timestamp (already correct from Date.toISOString())
          timezone,       // IANA timezone for display/circadian features
          details: activity.details,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error adding activity",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<DatabaseActivity>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId)
        .eq('created_by', user.id) // Only allow updating own activities
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Activity updated!",
        description: "Changes have been saved."
      });

      return data;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error updating activity",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Rely on RLS to ensure only the creator can delete. Use RETURNING to detect if a row was actually deleted.
      const { data, error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      // If no data returned, nothing was deleted (likely due to permissions)
      if (!data) {
        throw new Error('You can only delete activities you created.');
      }

      // Immediately refetch to ensure UI is in sync with database
      await fetchActivities();

      toast({
        title: 'Activity deleted',
        description: 'Activity has been removed.'
      });
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Could not delete activity',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Auto-calculate missing durations
  const calculateDurations = () => {
    const napActivities = activities.filter(a => a.type === 'nap');
    const updates: Promise<any>[] = [];

    napActivities.forEach(nap => {
      const { startTime, endTime } = nap.details;
      if (startTime && endTime && !nap.details.duration) {
        // Calculate duration
        const start = parseTimeToMinutes(startTime);
        const end = parseTimeToMinutes(endTime);
        const duration = end - start;
        
        if (duration > 0) {
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          
          updates.push(
            updateActivity(nap.id, {
              details: { ...nap.details, duration: durationStr }
            })
          );
        }
      }
    });

    return Promise.all(updates);
  };

  // Helper function to parse time
  const parseTimeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    
    let hour24 = hours;
    if (period === "PM" && hours !== 12) hour24 += 12;
    if (period === "AM" && hours === 12) hour24 = 0;
    
    return hour24 * 60 + minutes;
  };

  return {
    activities,
    loading,
    addActivity,
    updateActivity,
    deleteActivity,
    calculateDurations,
    refetch: fetchActivities
  };
}