import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useHousehold } from "./useHousehold";
import { useToast } from "./use-toast";
import { logger, logActivity, logError } from "@/utils/logger";

export interface DatabaseActivity {
  id: string;
  household_id: string;
  type: 'feed' | 'diaper' | 'nap' | 'note' | 'measure' | 'photo';
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
  // UTC is the universal source of truth for ALL activities
  const utcDate = new Date(dbActivity.logged_at); // PostgreSQL stores as UTC
  
  // Convert UTC to current local timezone for display
  const displayTime = utcDate.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

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
    // If no user, use localStorage for temporary storage
    if (!user) {
      loadLocalActivities();
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

  const loadLocalActivities = () => {
    try {
      const stored = localStorage.getItem('temp_activities');
      if (stored) {
        const parsed = JSON.parse(stored);
        setActivities(parsed);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error loading local activities:', error);
      setActivities([]);
    }
  };

  const saveLocalActivities = (acts: DatabaseActivity[]) => {
    try {
      localStorage.setItem('temp_activities', JSON.stringify(acts));
    } catch (error) {
      console.error('Error saving local activities:', error);
    }
  };

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
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (activity: {
    type: 'feed' | 'diaper' | 'nap' | 'note' | 'measure' | 'photo';
    time: string;
    details: any;
  }) => {
    // If no user, save to localStorage
    if (!user || !household) {
      const now = new Date().toISOString();
      const newActivity: DatabaseActivity = {
        id: crypto.randomUUID(),
        household_id: 'temp',
        type: activity.type,
        logged_at: now,
        created_by: 'temp',
        created_at: now,
        updated_at: now,
        details: activity.details
      };
      
      const updated = [...activities, newActivity];
      setActivities(updated);
      saveLocalActivities(updated);
      
      toast({
        title: "Activity saved locally",
        description: "Sign up to sync your data across devices",
      });
      
      return newActivity;
    }

    try {
      // CLIENT SENDS LOCAL TIME + TIMEZONE TO SERVER
      // Server is the single source of truth for UTC computation
      
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Parse the selected time string
      const [time, period] = activity.time.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      // Get current date and timezone offset
      const now = new Date();
      const dateLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timeLocal = `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      // Get timezone offset in minutes (how many minutes BEHIND UTC)
      // For PST (UTC-8), this returns +480
      const offsetMinutes = now.getTimezoneOffset();
      
      logger.debug('Creating activity - timezone info', {
        dateLocal,
        timeLocal,
        timezone,
        offsetMinutes,
        userSelectedTime: activity.time
      });

      // Call server function to create activity
      const { data, error } = await supabase.functions.invoke('create-activity', {
        body: {
          household_id: household.id,
          type: activity.type,
          date_local: dateLocal,
          time_local: timeLocal,
          tz: timezone,
          offset_minutes: offsetMinutes,  // Send offset for server to use
          details: activity.details
        }
      });

      if (error) throw error;
      if (!data?.data) throw new Error('No data returned from server');

      logActivity('created', { type: activity.type, id: data.data.id });
      return data.data;
    } catch (error) {
      logError('Failed to add activity', error);
      toast({
        title: "Error adding activity",
        description: "Please try again",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<DatabaseActivity>) => {
    // If no user, update localStorage
    if (!user) {
      const updated = activities.map(a => 
        a.id === activityId ? { ...a, ...updates } : a
      );
      setActivities(updated);
      saveLocalActivities(updated);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId)
        .eq('created_by', user.id) // Only allow updating own activities
        .select()
        .single();

      if (error) throw error;

      logActivity('updated', { id: activityId });
      toast({
        title: "Activity updated",
        description: "Changes have been saved"
      });

      return data;
    } catch (error) {
      logError('Failed to update activity', error);
      toast({
        title: "Error updating activity",
        description: "Please try again",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteActivity = async (activityId: string) => {
    // If no user, delete from localStorage
    if (!user) {
      const updated = activities.filter(a => a.id !== activityId);
      setActivities(updated);
      saveLocalActivities(updated);
      return;
    }

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

      logActivity('deleted', { id: activityId });
      toast({
        title: 'Activity deleted',
        description: 'Activity has been removed'
      });
    } catch (error: any) {
      logError('Failed to delete activity', error);
      toast({
        title: 'Could not delete activity',
        description: error?.message || 'Please try again',
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