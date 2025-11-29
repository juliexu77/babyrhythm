import { Activity } from "@/components/ActivityCard";
import { differenceInMinutes, differenceInHours } from "date-fns";
import { isNightTime } from "./nightWindow";

interface StateMessageContext {
  activities: Activity[];
  currentTime: Date;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  ongoingNap?: Activity | null;
  averageWakeHour?: number; // Expected wake up hour (0-23)
  averageWakeMinute?: number; // Expected wake up minute (0-59)
  typicalWakeWindowMinutes?: number; // Age-appropriate wake window in minutes
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
  const { 
    activities, 
    currentTime, 
    nightSleepStartHour, 
    nightSleepEndHour, 
    ongoingNap,
    averageWakeHour = 7,  // Default 7 AM
    averageWakeMinute = 0 
  } = context;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const todayActivities = getTodayActivities(activities);
  const yesterdayActivities = getYesterdayActivities(activities);
  
  // Mode 1: Currently in a nap/sleep
  if (ongoingNap?.details?.startTime) {
    // Parse the start time
    const startTimeStr = String(ongoingNap.details.startTime);
    const timeParts = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let napStartHours = 0;
    let napStartMinutes = 0;
    
    if (timeParts) {
      napStartHours = parseInt(timeParts[1]);
      napStartMinutes = parseInt(timeParts[2]);
      const period = timeParts[3]?.toUpperCase();
      if (period === 'PM' && napStartHours !== 12) napStartHours += 12;
      if (period === 'AM' && napStartHours === 12) napStartHours = 0;
    }
    
    // Get the date the nap started on
    const detailsAny = ongoingNap.details as any;
    let napStartDate: Date;
    
    if (detailsAny.date_local) {
      const [year, month, day] = detailsAny.date_local.split('-').map(Number);
      napStartDate = new Date(year, month - 1, day, napStartHours, napStartMinutes, 0, 0);
    } else {
      napStartDate = new Date(ongoingNap.loggedAt || ongoingNap.time);
      napStartDate.setHours(napStartHours, napStartMinutes, 0, 0);
    }
    
    const currentSleepMinutes = differenceInMinutes(currentTime, napStartDate);
    
    // Check if this is overnight sleep
    const startedYesterday = napStartDate.toDateString() !== currentTime.toDateString();
    const inNightWindow = isNightTime(currentHour, nightSleepStartHour, nightSleepEndHour);
    const isNightSleep = startedYesterday || currentSleepMinutes > 240 || inNightWindow;
    
    // Calculate minutes to average wake time
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const avgWakeTotalMinutes = averageWakeHour * 60 + averageWakeMinute;
    let minutesToAverageWakeTime = avgWakeTotalMinutes - currentTotalMinutes;
    // Handle wrap-around for early morning
    if (minutesToAverageWakeTime < -60) minutesToAverageWakeTime += 24 * 60;
    
    // Near wake window: within 30 min before or 15 min after expected wake
    const isNearWakeWindow = (minutesToAverageWakeTime > 0 && minutesToAverageWakeTime <= 30) ||
                             (minutesToAverageWakeTime < 0 && minutesToAverageWakeTime >= -15);
    
    // Find last micro-wake (short feed during night sleep)
    const recentNightActivities = [...todayActivities, ...yesterdayActivities]
      .filter(a => {
        const activityTime = new Date(a.loggedAt || a.time);
        return a.type === 'feed' && activityTime > napStartDate && activityTime < currentTime;
      })
      .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime());
    
    const lastMicroWake = recentNightActivities[0];
    const minutesSinceLastMicroWake = lastMicroWake 
      ? differenceInMinutes(currentTime, new Date(lastMicroWake.loggedAt || lastMicroWake.time))
      : currentSleepMinutes; // If no micro-wake, use full sleep duration
    
    // Calculate total night sleep (for long sleep detection)
    const totalNightSleepMinutes = currentSleepMinutes;
    
    // Near wake window - show "May wake soon"
    if (isNearWakeWindow) {
      return "May wake soon";
    }
    
    // State 1: "Just drifted off" - very recent night sleep start
    if (isNightSleep && currentSleepMinutes <= 10) {
      return "Just drifted off";
    }
    
    // States 2-4: Mid-sleep variety bucket (night sleep only)
    if (isNightSleep && 
        currentSleepMinutes > 10 && 
        currentSleepMinutes <= 120 && 
        minutesSinceLastMicroWake >= 10) {
      // Rotate based on current minute to provide variety
      const varietyMessages = ["Counting sheep", "Sleeping soundly", "Deep in dreamland"];
      const rotationIndex = Math.floor(currentTime.getMinutes() / 20) % 3;
      return varietyMessages[rotationIndex];
    }
    
    // State 5: "Long, deep slumber" - extended night sleep
    if (isNightSleep && 
        (totalNightSleepMinutes >= 360 || currentSleepMinutes >= 180) && 
        minutesSinceLastMicroWake >= 20) {
      return "Long, deep slumber";
    }
    
    // State 6: "Still snoozing" - night sleep fallback
    if (isNightSleep && minutesToAverageWakeTime > 60) {
      return "Still snoozing";
    }
    
    // Daytime nap - determine which nap
    const completedNapsToday = todayActivities.filter(a => 
      a.type === 'nap' && 
      a.details?.endTime &&
      new Date(a.loggedAt || a.time) < napStartDate
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
  
  // Use age-appropriate wake window or default to 2 hours
  const typicalWakeWindow = context.typicalWakeWindowMinutes || 120;
  const windDownThreshold = typicalWakeWindow - 30;
  
  // Check if we're approaching next nap time (within 30 minutes of typical wake window end)
  if (lastNap?.details?.endTime) {
    const napEndTime = parseTimeToMinutes(lastNap.details.endTime);
    const currentMinutes = currentHour * 60 + currentTime.getMinutes();
    let minutesSinceNap = currentMinutes - napEndTime;
    if (minutesSinceNap < 0) minutesSinceNap += 24 * 60;
    
    if (minutesSinceNap >= windDownThreshold && minutesSinceNap < typicalWakeWindow) {
      return "Start winding down";
    }
  }
  
  // Default awake state - simple and clear
  return "Awake";
};
