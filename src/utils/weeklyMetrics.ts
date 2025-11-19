import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from "date-fns";
import { isDaytimeNap } from "./napClassification";
import { Activity } from "@/components/ActivityCard";

interface WeeklyMetrics {
  weekLabel: string;
  totalSleepMinutes: number;
  napCount: number;
  feedVolume: number;
  wakeWindowAvg: number;
}

export const calculateWeeklyMetrics = (
  activities: Activity[],
  nightSleepStartHour: number,
  nightSleepEndHour: number,
  numberOfWeeks: number = 6
): WeeklyMetrics[] => {
  const now = new Date();
  const weeks: WeeklyMetrics[] = [];

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
    
    // Calculate average per day (only complete days)
    const completeDays = Math.max(1, Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
    const actualDays = Math.min(completeDays, 7);
    totalSleepMinutes = totalSleepMinutes / actualDays;

    // Count daytime naps per day
    const naps = weekActivities.filter(a => 
      a.type === 'nap' && 
      isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) &&
      a.details?.startTime && 
      a.details?.endTime
    );
    const napCount = naps.length / actualDays;

    // Calculate feed volume per day
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
    feedVolume = feedVolume / actualDays;

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
      napCount,
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
    case 'Naps':
      return weeklyMetrics.map(w => w.napCount);
    case 'Feed volume':
      // Convert to oz
      return weeklyMetrics.map(w => Math.round(w.feedVolume / 29.5735));
    case 'Wake average':
      // Convert to hours
      return weeklyMetrics.map(w => Math.round(w.wakeWindowAvg / 60 * 10) / 10);
    default:
      return [];
  }
};