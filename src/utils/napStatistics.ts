import { isDaytimeNap } from "./napClassification";

interface Activity {
  type: string;
  loggedAt?: string;
  details?: {
    startTime?: string;
    endTime?: string;
    date_local?: string;
    offset_minutes?: number;
    [key: string]: any;
  };
}

export interface NapStatistics {
  avgNapsPerDay: number;
  avgDaytimeNapsPerDay: number;
  totalNaps: number;
  avgNightSleepHours: number;
}

/**
 * Extract the actual event date from an activity
 * Uses date_local from details if available, otherwise falls back to logged_at
 */
const getEventDate = (activity: Activity): string | null => {
  // First priority: use date_local from details if available
  if (activity.details?.date_local) {
    return activity.details.date_local;
  }
  
  // Fallback: use logged_at adjusted for timezone offset if available
  if (activity.loggedAt) {
    const loggedDate = new Date(activity.loggedAt);
    
    // If we have an offset, adjust the date
    if (activity.details?.offset_minutes) {
      const offsetMs = activity.details.offset_minutes * 60 * 1000;
      const localDate = new Date(loggedDate.getTime() + offsetMs);
      return localDate.toISOString().split('T')[0];
    }
    
    // No offset, just use logged_at date
    return loggedDate.toISOString().split('T')[0];
  }
  
  return null;
};

/**
 * Calculate nap statistics based on actual event dates
 * Single source of truth for nap calculations across the app
 * Uses actual event dates from activity details, not logged_at timestamps
 */
export const calculateNapStatistics = (
  activities: Activity[],
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): NapStatistics => {
  const napActivities = activities.filter(a => a.type === 'nap');
  
  // Count unique days with nap data using actual event dates
  const uniqueDates = new Set<string>();
  napActivities.forEach(nap => {
    const eventDate = getEventDate(nap);
    if (eventDate) {
      uniqueDates.add(eventDate);
    }
  });
  
  const daysWithData = uniqueDates.size || 1; // Fallback to 1 to avoid division by zero
  
  // Count daytime naps
  const daytimeNaps = napActivities.filter(nap => 
    isDaytimeNap(nap as any, nightSleepStartHour, nightSleepEndHour)
  );
  
  // Calculate night sleep hours
  const nightSleeps = napActivities.filter(nap => 
    !isDaytimeNap(nap as any, nightSleepStartHour, nightSleepEndHour)
  );
  
  // Count each night sleep session separately (not unique dates)
  const nightSleepSessions = nightSleeps.length || 1; // Fallback to 1 to avoid division by zero
  
  // Helper to parse 12-hour time format to minutes since midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };
  
  let totalNightSleepMinutes = 0;
  nightSleeps.forEach(sleep => {
    if (sleep.details?.startTime && sleep.details?.endTime) {
      const startMinutes = parseTimeToMinutes(sleep.details.startTime);
      const endMinutes = parseTimeToMinutes(sleep.details.endTime);
      
      let duration = endMinutes - startMinutes;
      if (duration < 0) duration += 24 * 60; // Handle overnight
      totalNightSleepMinutes += duration;
    }
  });
  
  return {
    avgNapsPerDay: napActivities.length / daysWithData,
    avgDaytimeNapsPerDay: daytimeNaps.length / daysWithData,
    totalNaps: napActivities.length,
    avgNightSleepHours: totalNightSleepMinutes / 60 / nightSleepSessions, // Divide by number of sleep sessions
  };
};
