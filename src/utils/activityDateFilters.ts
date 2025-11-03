import { Activity } from "@/components/ActivityCard";

/**
 * Get today's date key in LOCAL timezone format YYYY-MM-DD
 * Uses local date to ensure activities logged today appear under today
 */
export const getTodayKey = (): string => {
  const today = new Date();
  // Get local date components (not UTC)
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Get date key from a Date object in LOCAL timezone format YYYY-MM-DD
 */
export const getDateKey = (date: Date): string => {
  // Get local date components (not UTC)
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Get date key from a loggedAt timestamp in LOCAL timezone format YYYY-MM-DD
 * Converts UTC timestamp to local date for proper day boundary handling
 */
export const getDateKeyFromActivity = (activity: Activity): string | null => {
  if (!activity.loggedAt) return null;
  // Parse UTC timestamp and convert to local date
  const activityDate = new Date(activity.loggedAt);
  // Use getDateKey which extracts local date components
  return getDateKey(activityDate);
};

/**
 * Filter activities for today
 */
export const getTodayActivities = (activities: Activity[]): Activity[] => {
  const todayKey = getTodayKey();
  return activities.filter(a => getDateKeyFromActivity(a) === todayKey);
};

/**
 * Filter activities for yesterday
 */
export const getYesterdayActivities = (activities: Activity[]): Activity[] => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);
  return activities.filter(a => getDateKeyFromActivity(a) === yesterdayKey);
};

/**
 * Filter activities for a specific date
 */
export const getActivitiesByDate = (activities: Activity[], date: Date): Activity[] => {
  const dateKey = getDateKey(date);
  return activities.filter(a => getDateKeyFromActivity(a) === dateKey);
};
