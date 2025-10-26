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

// Convert database activity to UI activity format
export const convertToUIActivity = (dbActivity: DatabaseActivity) => {
  // Use the same time logic as sorting - startTime for naps when available
  let displayTime;
  if (dbActivity.type === 'nap' && dbActivity.details.startTime) {
    // For naps, use the startTime directly as it's already in display format
    displayTime = dbActivity.details.startTime;
  } else {
    // Handle both old (UTC with 'Z') and new (local without 'Z') formats
    const hasZSuffix = dbActivity.logged_at.endsWith('Z') || dbActivity.logged_at.includes('+');
    
    if (hasZSuffix) {
      // OLD FORMAT: "2025-10-26T14:00:00.000Z" (UTC timestamp)
      // Convert from UTC to local display time
      const activityDate = new Date(dbActivity.logged_at);
      displayTime = activityDate.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });
    } else {
      // NEW FORMAT: "2025-10-26T07:00:00" (local time without 'Z')
      // Parse directly as local time
      const timeMatch = dbActivity.logged_at.match(/T(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const period = hours >= 12 ? 'PM' : 'AM';
        displayTime = `${hour12}:${minutes} ${period}`;
      } else {
        // Fallback
        const activityDate = new Date(dbActivity.logged_at);
        displayTime = activityDate.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
      }
    }
  }

  return {
    id: dbActivity.id,
    type: dbActivity.type,
    time: displayTime,
    loggedAt: dbActivity.logged_at, // Keep the original timestamp
    timezone: dbActivity.timezone, // Include timezone if available
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

        return getActivityTime(b) - getActivityTime(a);
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
      // Get user's current timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Convert time string to timestamp - preserving local timezone
      const [time, period] = activity.time.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      // Create date in local time without UTC conversion
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hourStr = String(hour24).padStart(2, '0');
      const minStr = String(minutes).padStart(2, '0');
      
      // Store as local time without 'Z' suffix
      const logged_at = `${year}-${month}-${day}T${hourStr}:${minStr}:00`;

      const { data, error } = await supabase
        .from('activities')
        .insert({
          household_id: household.id,
          type: activity.type,
          logged_at,
          timezone,
          details: activity.details,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Removed noisy popup notification

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