import { isDaytimeNap } from "./napClassification";

interface Activity {
  type: string;
  loggedAt?: string;
  details?: {
    startTime?: string;
    endTime?: string;
  };
}

export interface NapStatistics {
  avgNapsPerDay: number;
  avgDaytimeNapsPerDay: number;
  totalNaps: number;
  avgNightSleepHours: number;
}

/**
 * Calculate nap statistics based on logged days only
 * Single source of truth for nap calculations across the app
 * Divides by actual days with nap data, not the full 7-day period
 */
export const calculateNapStatistics = (
  activities: Activity[],
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): NapStatistics => {
  const napActivities = activities.filter(a => a.type === 'nap');
  
  // Count unique days with nap data
  const uniqueDates = new Set<string>();
  napActivities.forEach(nap => {
    if (nap.loggedAt) {
      const date = new Date(nap.loggedAt).toISOString().split('T')[0];
      uniqueDates.add(date);
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
  
  let totalNightSleepMinutes = 0;
  nightSleeps.forEach(sleep => {
    if (sleep.details?.startTime && sleep.details?.endTime) {
      const start = new Date(`1970-01-01 ${sleep.details.startTime}`);
      const end = new Date(`1970-01-01 ${sleep.details.endTime}`);
      let duration = (end.getTime() - start.getTime()) / (1000 * 60);
      if (duration < 0) duration += 24 * 60; // Handle overnight
      totalNightSleepMinutes += duration;
    }
  });
  
  return {
    avgNapsPerDay: napActivities.length / daysWithData,
    avgDaytimeNapsPerDay: daytimeNaps.length / daysWithData,
    totalNaps: napActivities.length,
    avgNightSleepHours: totalNightSleepMinutes / 60 / daysWithData,
  };
};
