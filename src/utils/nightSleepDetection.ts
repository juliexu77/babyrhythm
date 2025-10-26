import { Activity } from "@/components/ActivityCard";

/**
 * Parse time string (e.g., "7:00 AM") to minutes since midnight
 */
const parseTimeToMinutes = (timeStr: string): number | null => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

/**
 * Calculate the absolute difference in minutes between two times,
 * accounting for crossing midnight
 */
const getTimeDifference = (timeMinutes: number, targetMinutes: number): number => {
  const diff = Math.abs(timeMinutes - targetMinutes);
  // Also check the difference across midnight
  const diffAcrossMidnight = Math.abs((timeMinutes + 1440) - targetMinutes);
  return Math.min(diff, diffAcrossMidnight);
};

/**
 * Detect which nap is the "night sleep" based on end time proximity to night sleep end hour
 */
export const detectNightSleep = (
  activities: Activity[],
  nightSleepEndHour: number
): Activity | null => {
  // Filter for completed naps only
  const completedNaps = activities.filter(
    a => a.type === 'nap' && a.details?.endTime
  );

  if (completedNaps.length === 0) return null;

  const targetMinutes = nightSleepEndHour * 60; // Convert hour to minutes

  // Find the nap with end time closest to the target
  let closestNap: Activity | null = null;
  let closestDiff = Infinity;

  for (const nap of completedNaps) {
    const endTimeStr = nap.details!.endTime!;
    const endMinutes = parseTimeToMinutes(endTimeStr);
    
    if (endMinutes === null) continue;

    const diff = getTimeDifference(endMinutes, targetMinutes);
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closestNap = nap;
    }
  }

  // Only return if the closest nap is within 2 hours (120 minutes) of target
  if (closestNap && closestDiff <= 120) {
    return closestNap;
  }

  return null;
};

/**
 * Extract wake time from night sleep activity
 */
export const getWakeTime = (nightSleep: Activity): string | null => {
  return nightSleep.details?.endTime || null;
};
