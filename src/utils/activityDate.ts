/**
 * Utility for extracting the actual event date from an activity
 * Always use this instead of logged_at for date-based grouping and filtering
 */

interface Activity {
  loggedAt?: string;
  logged_at?: string; // Support both formats
  details?: {
    date_local?: string;
    offset_minutes?: number;
    [key: string]: any;
  };
}

/**
 * Get the actual event date from an activity
 * Priority: date_local > logged_at adjusted by offset > logged_at
 */
export const getActivityEventDate = (activity: Activity): Date => {
  // First priority: use date_local from details if available
  if (activity.details?.date_local) {
    // Parse as local date, not UTC
    const dateStr = activity.details.date_local;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }
  
  // Second priority: use logged_at adjusted for timezone offset
  const loggedAt = activity.loggedAt || activity.logged_at;
  if (loggedAt) {
    const loggedDate = new Date(loggedAt);
    // logged_at is stored in UTC; JS Date will present local components automatically.
    // Do NOT apply offset_minutes here to avoid double-shifting time.
    return loggedDate;
  }
  
  // Fallback to current date
  return new Date();
};

/**
 * Get the event date as a string in YYYY-MM-DD format
 */
export const getActivityEventDateString = (activity: Activity): string => {
  // First priority: use date_local from details if available
  if (activity.details?.date_local) {
    return activity.details.date_local;
  }
  
  const date = getActivityEventDate(activity);
  // Format using LOCAL date components to avoid UTC day shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if an activity occurred on a specific date (local date comparison)
 */
export const isActivityOnDate = (activity: Activity, targetDate: Date): boolean => {
  const activityDate = getActivityEventDate(activity);
  return (
    activityDate.getFullYear() === targetDate.getFullYear() &&
    activityDate.getMonth() === targetDate.getMonth() &&
    activityDate.getDate() === targetDate.getDate()
  );
};
