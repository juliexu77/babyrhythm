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
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Convert database activity to UI activity format
export const convertToUIActivity = (dbActivity: DatabaseActivity) => ({
  id: dbActivity.id,
  type: dbActivity.type,
  time: new Date(dbActivity.logged_at).toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  }),
  details: dbActivity.details
});

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
      // Get activities from the past 7 days for continuous scrolling
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('household_id', household.id)
        .gte('logged_at', sevenDaysAgo.toISOString())
        .order('logged_at', { ascending: false });

      if (error) throw error;

      setActivities((data || []) as DatabaseActivity[]);
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
      // Convert time string to timestamp
      const [time, period] = activity.time.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const loggedAt = new Date();
      loggedAt.setHours(hour24, minutes, 0, 0);

      const { data, error } = await supabase
        .from('activities')
        .insert({
          household_id: household.id,
          type: activity.type,
          logged_at: loggedAt.toISOString(),
          details: activity.details,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Activity added!",
        description: `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} has been logged.`,
      });

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
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)
        .eq('created_by', user.id); // Only allow deleting own activities

      if (error) throw error;

      toast({
        title: "Activity deleted",
        description: "Activity has been removed."
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error deleting activity",
        description: "Please try again.",
        variant: "destructive"
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