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
 * Calculate nap statistics for a 7-day period
 * Single source of truth for nap calculations across the app
 */
export const calculateNapStatistics = (
  activities: Activity[],
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): NapStatistics => {
  const napActivities = activities.filter(a => a.type === 'nap');
  
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
    avgNapsPerDay: napActivities.length / 7,
    avgDaytimeNapsPerDay: daytimeNaps.length / 7,
    totalNaps: napActivities.length,
    avgNightSleepHours: totalNightSleepMinutes / 60 / 7,
  };
};
