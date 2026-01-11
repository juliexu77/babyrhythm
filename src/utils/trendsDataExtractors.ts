import { Activity } from "@/components/ActivityCard";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { normalizeVolume } from "@/utils/unitConversion";
import { isDaytimeNap } from "@/utils/napClassification";
import { subDays, startOfDay, eachDayOfInterval } from "date-fns";

// Helper to parse time to minutes
export const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

// Extract night sleep hours for a specific date
export const extractNightSleep = (
  activities: Activity[], 
  date: Date,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): number => {
  const dayActivities = getActivitiesByDate(activities, date);
  const nightSleeps = dayActivities.filter(a => 
    a.type === 'nap' && !isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
  );
  
  let totalMinutes = 0;
  nightSleeps.forEach(sleep => {
    if (sleep.details?.startTime && sleep.details?.endTime) {
      const start = parseTimeToMinutes(sleep.details.startTime);
      let end = parseTimeToMinutes(sleep.details.endTime);
      if (end < start) end += 24 * 60;
      totalMinutes += (end - start);
    }
  });
  
  return totalMinutes / 60;
};

// Extract day naps count for a specific date
export const extractDayNaps = (
  activities: Activity[], 
  date: Date,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): number => {
  const dayActivities = getActivitiesByDate(activities, date);
  return dayActivities.filter(a => 
    a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
  ).length;
};

// Extract feed volume for a specific date
export const extractFeedVolume = (
  activities: Activity[], 
  date: Date
): number => {
  const dayActivities = getActivitiesByDate(activities, date);
  const feeds = dayActivities.filter(a => a.type === 'feed');
  
  let total = 0;
  feeds.forEach(feed => {
    if (feed.details?.quantity) {
      const normalized = normalizeVolume(
        feed.details.quantity,
        feed.details.unit
      );
      // Cap individual feed at 20oz to avoid data entry errors
      const cappedValue = Math.min(normalized.value, 20);
      total += cappedValue;
    }
  });
  
  return total;
};

// Extract average wake window for a specific date
export const extractWakeWindows = (
  activities: Activity[], 
  date: Date,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): number => {
  const dayActivities = getActivitiesByDate(activities, date);
  const dayNaps = dayActivities.filter(a => 
    a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && 
    a.details?.startTime && a.details?.endTime
  );
  
  const windows: number[] = [];
  for (let i = 1; i < dayNaps.length; i++) {
    const prevEnd = parseTimeToMinutes(dayNaps[i - 1].details.endTime!);
    const currStart = parseTimeToMinutes(dayNaps[i].details.startTime!);
    const window = currStart - prevEnd;
    if (window > 0 && window < 360) windows.push(window);
  }
  
  return windows.length > 0 ? windows.reduce((a, b) => a + b, 0) / windows.length / 60 : 0;
};

// Check if a date is a travel day
export const isTravelDay = (date: Date, travelDayDates: string[]): boolean => {
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return travelDayDates.includes(dateKey);
};
