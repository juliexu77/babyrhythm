import { Activity } from "@/components/ActivityCard";
import { differenceInMinutes, differenceInHours } from "date-fns";
import { isNightTime } from "./nightWindow";

interface StateMessageContext {
  activities: Activity[];
  currentTime: Date;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  ongoingNap?: Activity | null;
}

// Get nap ordinal (1st, 2nd, 3rd, etc.)
const getNapOrdinal = (napNumber: number): string => {
  if (napNumber === 1) return "Morning nap";
  if (napNumber === 2) return "2nd nap";
  if (napNumber === 3) return "3rd nap";
  if (napNumber === 4) return "4th nap";
  return `${napNumber}th nap`;
};

// Parse time string to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Get today's activities
const getTodayActivities = (activities: Activity[]): Activity[] => {
  const today = new Date();
  return activities.filter(a => {
    const activityDate = new Date(a.loggedAt || a.time);
    return activityDate.toDateString() === today.toDateString();
  });
};

// Get yesterday's activities for comparison
const getYesterdayActivities = (activities: Activity[]): Activity[] => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return activities.filter(a => {
    const activityDate = new Date(a.loggedAt || a.time);
    return activityDate.toDateString() === yesterday.toDateString();
  });
};

// Get most recent activity
const getMostRecentActivity = (activities: Activity[]): Activity | null => {
  if (activities.length === 0) return null;
  const sorted = [...activities].sort((a, b) => {
    const aTime = new Date(a.loggedAt || a.time).getTime();
    const bTime = new Date(b.loggedAt || b.time).getTime(); // Fixed: was using a.time
    return bTime - aTime;
  });
  return sorted[0];
};

export const getRhythmStateMessage = (context: StateMessageContext): string => {
  const { activities, currentTime, nightSleepStartHour, nightSleepEndHour, ongoingNap } = context;
  const currentHour = currentTime.getHours();
  const todayActivities = getTodayActivities(activities);
  const yesterdayActivities = getYesterdayActivities(activities);
  
  // Mode 1: Currently in a nap
  if (ongoingNap?.details?.startTime) {
    const [hours, minutes] = ongoingNap.details.startTime.split(':').map(Number);
    const napStart = new Date(currentTime);
    napStart.setHours(hours, minutes, 0, 0);
    const napMinutes = differenceInMinutes(currentTime, napStart);
    
    // Check if this is night sleep (> 4 hours or in night window)
    const inNightWindow = isNightTime(currentHour, nightSleepStartHour, nightSleepEndHour);
    if (inNightWindow || napMinutes > 240) {
      return "Down for the night";
    }
    
    // Daytime nap - determine which nap
    const completedNapsToday = todayActivities.filter(a => 
      a.type === 'nap' && 
      a.details?.endTime &&
      new Date(a.loggedAt || a.time) < napStart
    ).length;
    
    const napNumber = completedNapsToday + 1;
    return getNapOrdinal(napNumber);
  }
  
  // Mode 2: Awake - check recent activities
  const recentActivity = getMostRecentActivity(todayActivities);
  const minutesSinceActivity = recentActivity 
    ? differenceInMinutes(currentTime, new Date(recentActivity.loggedAt || recentActivity.time))
    : null;
  
  // Check for recent food
  if (recentActivity?.type === 'solids' && minutesSinceActivity !== null && minutesSinceActivity < 15) {
    const foodDescription = recentActivity.details?.solidDescription;
    if (foodDescription) {
      return `Just ate ${foodDescription}`;
    }
  }
  
  // Check for recent feed
  if (recentActivity?.type === 'feed' && minutesSinceActivity !== null && minutesSinceActivity < 10) {
    const inNightWindow = isNightTime(currentHour, nightSleepStartHour, nightSleepEndHour);
    
    // Night feed
    if (inNightWindow) {
      return "Night feed";
    }
    
    // Check if it's a big bottle
    const quantity = recentActivity.details?.quantity;
    const unit = recentActivity.details?.unit;
    const quantityNum = quantity ? parseFloat(quantity) : 0;
    const isLargeBottle = (unit === 'ml' && quantityNum >= 150) || (unit === 'oz' && quantityNum >= 5);
    
    if (isLargeBottle) {
      return "Full belly";
    }
  }
  
  // Check for wake timing patterns
  const todayNaps = todayActivities.filter(a => a.type === 'nap' && a.details?.endTime);
  const lastNap = todayNaps.length > 0 
    ? todayNaps.sort((a, b) => 
        new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime()
      )[0]
    : null;
  
  // Check if we're approaching next nap time (within 30 minutes of typical wake window end)
  if (lastNap?.details?.endTime) {
    const napEndTime = parseTimeToMinutes(lastNap.details.endTime);
    const currentMinutes = currentHour * 60 + currentTime.getMinutes();
    let minutesSinceNap = currentMinutes - napEndTime;
    if (minutesSinceNap < 0) minutesSinceNap += 24 * 60;
    
    // Approximate wake window (adjust based on age if needed)
    const typicalWakeWindow = 120; // 2 hours default
    const windDownThreshold = typicalWakeWindow - 30;
    
    if (minutesSinceNap >= windDownThreshold && minutesSinceNap < typicalWakeWindow) {
      return "Start winding down";
    }
  }
  
  // Check for early wake or sleeping in (compare to yesterday's first wake)
  const todayFirstWake = todayNaps.length > 0 && todayNaps[0].details?.endTime
    ? parseTimeToMinutes(todayNaps[0].details.endTime)
    : null;
  
  const yesterdayNaps = yesterdayActivities.filter(a => a.type === 'nap' && a.details?.endTime);
  const yesterdayFirstWake = yesterdayNaps.length > 0 && yesterdayNaps[0].details?.endTime
    ? parseTimeToMinutes(yesterdayNaps[0].details.endTime)
    : null;
  
  if (todayFirstWake !== null && yesterdayFirstWake !== null) {
    const wakeDifference = todayFirstWake - yesterdayFirstWake;
    
    // Early wake: 60+ minutes earlier
    if (wakeDifference <= -60) {
      return "Early start to the day";
    }
    
    // Sleeping in: 30+ minutes later
    if (wakeDifference >= 30) {
      return "Sleeping in";
    }
  }
  
  // Default fallback - only use approved messages
  // If no naps today, assume morning wake
  if (todayActivities.length === 0) {
    return "Start winding down";
  }
  
  // Generic awake state - should be improved with more context
  return "Start winding down";
};
