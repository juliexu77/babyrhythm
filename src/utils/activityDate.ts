/**
 * Utility for extracting the actual event date from an activity
 * Always use this instead of logged_at for date-based grouping and filtering
 */

interface Activity {
  loggedAt?: string;
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
    return new Date(activity.details.date_local);
  }
  
  // Second priority: use logged_at adjusted for timezone offset
  if (activity.loggedAt) {
    const loggedDate = new Date(activity.loggedAt);
    
    // If we have an offset, adjust the date
    if (activity.details?.offset_minutes) {
      const offsetMs = activity.details.offset_minutes * 60 * 1000;
      return new Date(loggedDate.getTime() + offsetMs);
    }
    
    // No offset, just use logged_at
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
  return date.toISOString().split('T')[0];
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
