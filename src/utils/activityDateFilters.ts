import { Activity } from "@/components/ActivityCard";

/**
 * Get today's date key in format YYYY-MM-DD
 */
export const getTodayKey = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Get date key from a Date object in format YYYY-MM-DD
 */
export const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Get date key from a loggedAt timestamp in format YYYY-MM-DD
 */
export const getDateKeyFromActivity = (activity: Activity): string | null => {
  if (!activity.loggedAt) return null;
  const activityDate = new Date(activity.loggedAt);
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
