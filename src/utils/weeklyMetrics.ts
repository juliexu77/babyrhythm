import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, format } from "date-fns";
import { isDaytimeNap } from "./napClassification";
import { Activity } from "@/components/ActivityCard";

interface WeeklyMetrics {
  weekLabel: string;
  totalSleepMinutes: number;
  daytimeSleepMinutes: number; // Changed from napCount
  feedVolume: number;
  wakeWindowAvg: number;
}

// Helper to format date as YYYY-MM-DD for travel day comparison
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const calculateWeeklyMetrics = (
  activities: Activity[],
  nightSleepStartHour: number,
  nightSleepEndHour: number,
  numberOfWeeks: number = 6,
  travelDayDates: string[] = [] // Add travel days parameter
): WeeklyMetrics[] => {
  const now = new Date();
  const weeks: WeeklyMetrics[] = [];

  // Helper to check if a date is a travel day
  const isTravelDay = (date: Date): boolean => {
    const dateKey = formatDateKey(date);
    return travelDayDates.includes(dateKey);
  };

  // Helper to parse time to minutes
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  // Calculate metrics for each of the last N weeks
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Sunday
    
    const weekActivities = activities.filter(a => {
      const dateStr = a.loggedAt || a.time;
      const activityDate = parseISO(dateStr);
      // Exclude today - only include complete days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);
      
      // Exclude travel days from calculations
      if (isTravelDay(activityDay)) return false;
      
      return isWithinInterval(activityDate, { start: weekStart, end: weekEnd }) && 
             activityDay < today;
    });

    // Calculate total sleep (both day and night) per day
    const allSleep = weekActivities.filter(a => 
      a.type === 'nap' && 
      a.details?.startTime && 
      a.details?.endTime
    );

    let totalSleepMinutes = 0;
    allSleep.forEach(sleep => {
      const startMinutes = parseTimeToMinutes(sleep.details.startTime!);
      const endMinutes = parseTimeToMinutes(sleep.details.endTime!);
      let duration = endMinutes - startMinutes;
      if (duration < 0) duration += 24 * 60;
      totalSleepMinutes += duration;
    });
    
    // Count unique days with sleep data
    const daysWithSleep = new Set(
      allSleep.map(sleep => {
        const dateStr = sleep.loggedAt || sleep.time;
        return new Date(dateStr).toDateString();
      })
    ).size;
    
    // Calculate average per day (only days with sleep data)
    totalSleepMinutes = daysWithSleep > 0 ? totalSleepMinutes / daysWithSleep : 0;

    // Calculate daytime sleep duration per day
    const naps = weekActivities.filter(a => 
      a.type === 'nap' && 
      isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) &&
      a.details?.startTime && 
      a.details?.endTime
    );
    
    let daytimeSleepMinutes = 0;
    naps.forEach(nap => {
      const startMinutes = parseTimeToMinutes(nap.details.startTime!);
      const endMinutes = parseTimeToMinutes(nap.details.endTime!);
      let duration = endMinutes - startMinutes;
      if (duration < 0) duration += 24 * 60;
      daytimeSleepMinutes += duration;
    });
    
    // Count unique days with naps
    const daysWithNaps = new Set(
      naps.map(nap => {
        const dateStr = nap.loggedAt || nap.time;
        return new Date(dateStr).toDateString();
      })
    ).size;
    
    daytimeSleepMinutes = daysWithNaps > 0 ? daytimeSleepMinutes / daysWithNaps : 0;

    // Calculate feed volume per day (only days with feed data)
    const feeds = weekActivities.filter(a => a.type === 'feed');
    let feedVolume = 0;
    feeds.forEach(feed => {
      const amount = parseFloat(feed.details?.quantity || '0');
      const unit = feed.details?.unit || 'ml';
      // Convert to ml if needed
      if (unit === 'oz') {
        feedVolume += amount * 29.5735; // oz to ml
      } else {
        feedVolume += amount;
      }
    });
    
    // Count unique days with feeds
    const daysWithFeeds = new Set(
      feeds.map(feed => {
        const dateStr = feed.loggedAt || feed.time;
        return new Date(dateStr).toDateString();
      })
    ).size;
    
    feedVolume = daysWithFeeds > 0 ? feedVolume / daysWithFeeds : 0;

    // Calculate average wake windows (time between daytime naps)
    const dateMap = new Map<string, Activity[]>();
    naps.forEach(nap => {
      const dateStr = nap.loggedAt || nap.time;
      const dateKey = new Date(dateStr).toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(nap);
    });

    const wakeWindows: number[] = [];
    dateMap.forEach(dayNaps => {
      const sorted = [...dayNaps].sort((a, b) => 
        parseTimeToMinutes(a.details.startTime!) - parseTimeToMinutes(b.details.startTime!)
      );
      
      for (let j = 1; j < sorted.length; j++) {
        const prevEnd = parseTimeToMinutes(sorted[j - 1].details.endTime!);
        const currentStart = parseTimeToMinutes(sorted[j].details.startTime!);
        let wakeWindow = currentStart - prevEnd;
        if (wakeWindow < 0) wakeWindow += 24 * 60;
        if (wakeWindow > 0 && wakeWindow < 600) { // Ignore wake windows > 10 hours
          wakeWindows.push(wakeWindow);
        }
      }
    });

    const wakeWindowAvg = wakeWindows.length > 0 
      ? wakeWindows.reduce((sum, w) => sum + w, 0) / wakeWindows.length 
      : 0;

    weeks.push({
      weekLabel: i === 0 ? 'This week' : `${i}w ago`,
      totalSleepMinutes,
      daytimeSleepMinutes,
      feedVolume,
      wakeWindowAvg
    });
  }

  return weeks.reverse(); // Oldest to newest
};

export const getMetricSparklineData = (
  weeklyMetrics: WeeklyMetrics[],
  metricName: string
): number[] => {
  switch (metricName) {
    case 'Total sleep':
      // Convert to hours
      return weeklyMetrics.map(w => Math.round(w.totalSleepMinutes / 60 * 10) / 10);
    case 'Daytime sleep':
      // Convert to hours
      return weeklyMetrics.map(w => Math.round(w.daytimeSleepMinutes / 60 * 10) / 10);
    case 'Feed volume':
      // Convert to oz
      return weeklyMetrics.map(w => Math.round(w.feedVolume / 29.5735));
    case 'Wake windows':
      // Convert to hours
      return weeklyMetrics.map(w => Math.round(w.wakeWindowAvg / 60 * 10) / 10);
    default:
      return [];
  }
};