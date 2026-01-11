import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { normalizeVolume } from "@/utils/unitConversion";
import { isDaytimeNap } from "@/utils/napClassification";
import { subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { parseTimeToMinutes, isTravelDay } from "@/utils/trendsDataExtractors";

export interface OverviewMetric {
  label: string;
  currentValue: string;
  unit: string;
  change: number;
  threeMonthAvg: string;
  sparklineData: number[];
}

interface UseTrendsMetricsProps {
  activities: Activity[];
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  travelDayDates: string[];
}

export const useTrendsMetrics = ({
  activities,
  nightSleepStartHour,
  nightSleepEndHour,
  travelDayDates
}: UseTrendsMetricsProps): OverviewMetric[] => {
  return useMemo(() => {
    const now = new Date();
    const yesterday = startOfDay(subDays(now, 1));
    
    const getMetricsForPeriod = (daysBack: number) => {
      const startDate = startOfDay(subDays(yesterday, daysBack));
      const days = eachDayOfInterval({ start: startDate, end: yesterday })
        .filter(day => !isTravelDay(day, travelDayDates));
      
      const dailyData = days.map(day => {
        const dayActivities = getActivitiesByDate(activities, day);
        
        // Night sleep (hours)
        const nightSleeps = dayActivities.filter(a => 
          a.type === 'nap' && !isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
        );
        let nightSleepMinutes = 0;
        nightSleeps.forEach(sleep => {
          if (sleep.details?.startTime && sleep.details?.endTime) {
            const start = parseTimeToMinutes(sleep.details.startTime);
            let end = parseTimeToMinutes(sleep.details.endTime);
            if (end < start) end += 24 * 60;
            nightSleepMinutes += (end - start);
          }
        });
        
        // Day naps (count)
        const dayNaps = dayActivities.filter(a => 
          a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
        );
        
        // Feed volume (oz)
        const feeds = dayActivities.filter(a => a.type === 'feed');
        let totalVolume = 0;
        feeds.forEach(feed => {
          if (feed.details?.quantity) {
            const normalized = normalizeVolume(feed.details.quantity, feed.details.unit);
            totalVolume += Math.min(normalized.value, 20);
          }
        });
        
        // Wake windows (average hours)
        const daytimeNapsWithTimes = dayNaps.filter(n => n.details?.startTime && n.details?.endTime);
        const wakeWindows: number[] = [];
        
        for (let i = 1; i < daytimeNapsWithTimes.length; i++) {
          const prevEnd = parseTimeToMinutes(daytimeNapsWithTimes[i - 1].details.endTime!);
          const currStart = parseTimeToMinutes(daytimeNapsWithTimes[i].details.startTime!);
          const window = currStart - prevEnd;
          if (window > 0 && window < 360) wakeWindows.push(window);
        }
        
        const avgWakeWindow = wakeWindows.length > 0 
          ? wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length / 60
          : 0;
        
        return {
          nightSleep: nightSleepMinutes / 60,
          dayNaps: dayNaps.length,
          feedVolume: totalVolume,
          wakeWindow: avgWakeWindow
        };
      });
      
      const validDays = dailyData.filter(d => d.nightSleep > 0 || d.dayNaps > 0 || d.feedVolume > 0);
      
      return {
        avgNightSleep: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.nightSleep, 0) / validDays.length 
          : 0,
        avgDayNaps: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.dayNaps, 0) / validDays.length 
          : 0,
        avgFeedVolume: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.feedVolume, 0) / validDays.length 
          : 0,
        avgWakeWindow: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.wakeWindow, 0) / validDays.length 
          : 0,
        sparkline: dailyData.slice(-14).map(d => d.nightSleep)
      };
    };
    
    const oneMonth = getMetricsForPeriod(30);
    const threeMonths = getMetricsForPeriod(90);
    
    const calcChange = (current: number, baseline: number) => {
      if (baseline === 0) return 0;
      return ((current - baseline) / baseline) * 100;
    };
    
    // Build sparkline data for each metric
    const last14Days = eachDayOfInterval({ 
      start: subDays(yesterday, 13), 
      end: yesterday 
    });
    
    const napsSparkline = last14Days.map(day => 
      getActivitiesByDate(activities, day)
        .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)).length
    );
    
    const feedSparkline = last14Days.map(day => {
      const dayFeeds = getActivitiesByDate(activities, day).filter(a => a.type === 'feed');
      let total = 0;
      dayFeeds.forEach(f => {
        if (f.details?.quantity) {
          const normalized = normalizeVolume(f.details.quantity, f.details.unit);
          total += Math.min(normalized.value, 20);
        }
      });
      return total;
    });
    
    const wakeSparkline = last14Days.map(day => {
      const dayNaps = getActivitiesByDate(activities, day)
        .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.startTime && a.details?.endTime);
      
      const windows: number[] = [];
      for (let i = 1; i < dayNaps.length; i++) {
        const prevEnd = parseTimeToMinutes(dayNaps[i - 1].details.endTime!);
        const currStart = parseTimeToMinutes(dayNaps[i].details.startTime!);
        const window = currStart - prevEnd;
        if (window > 0 && window < 360) windows.push(window);
      }
      
      return windows.length > 0 ? windows.reduce((a, b) => a + b, 0) / windows.length / 60 : 0;
    });
    
    return [
      {
        label: 'Night Sleep',
        currentValue: oneMonth.avgNightSleep.toFixed(1),
        unit: 'h',
        change: calcChange(oneMonth.avgNightSleep, threeMonths.avgNightSleep),
        threeMonthAvg: threeMonths.avgNightSleep.toFixed(1),
        sparklineData: oneMonth.sparkline
      },
      {
        label: 'Day Naps',
        currentValue: oneMonth.avgDayNaps.toFixed(1),
        unit: '/day',
        change: calcChange(oneMonth.avgDayNaps, threeMonths.avgDayNaps),
        threeMonthAvg: threeMonths.avgDayNaps.toFixed(1),
        sparklineData: napsSparkline
      },
      {
        label: 'Feed Volume',
        currentValue: oneMonth.avgFeedVolume.toFixed(0),
        unit: 'oz',
        change: calcChange(oneMonth.avgFeedVolume, threeMonths.avgFeedVolume),
        threeMonthAvg: threeMonths.avgFeedVolume.toFixed(0),
        sparklineData: feedSparkline
      },
      {
        label: 'Wake Windows',
        currentValue: oneMonth.avgWakeWindow.toFixed(1),
        unit: 'h',
        change: calcChange(oneMonth.avgWakeWindow, threeMonths.avgWakeWindow),
        threeMonthAvg: threeMonths.avgWakeWindow.toFixed(1),
        sparklineData: wakeSparkline
      }
    ];
  }, [activities, nightSleepStartHour, nightSleepEndHour, travelDayDates]);
};

// Generate summary narrative
export const generateTrendsSummary = (
  overviewMetrics: OverviewMetric[], 
  babyName: string
): string => {
  const nightSleep = overviewMetrics[0];
  const naps = overviewMetrics[1];
  const wakeWindows = overviewMetrics[3];
  
  let narrative = '';
  
  // Analyze night sleep trend
  const nightValue = parseFloat(nightSleep.currentValue);
  const nightChange = nightSleep.change;
  if (Math.abs(nightChange) < 3) {
    narrative += `${babyName}'s night sleep has been consistent at around ${nightValue}h. `;
  } else if (nightChange > 0) {
    narrative += `${babyName}'s night sleep has improved by ${Math.abs(nightChange).toFixed(1)} hours to ${nightValue}h. `;
  } else {
    narrative += `${babyName}'s night sleep has decreased slightly by ${Math.abs(nightChange).toFixed(1)} hours to ${nightValue}h. `;
  }
  
  // Analyze naps trend
  const napsValue = parseFloat(naps.currentValue);
  const napsChange = naps.change;
  if (Math.abs(napsChange) < 5) {
    narrative += `Naps remain steady at ${napsValue} per day. `;
  } else if (napsChange < 0) {
    narrative += `Nap frequency is consolidating (down ${Math.abs(napsChange).toFixed(1)} naps), a typical developmental shift. `;
  } else {
    narrative += `Nap frequency has increased to ${napsValue} per day. `;
  }
  
  // Analyze wake windows
  const wakeValue = parseFloat(wakeWindows.currentValue);
  const wakeChange = wakeWindows.change;
  if (wakeChange > 5) {
    narrative += `Wake windows are lengthening to ${wakeValue}h as ${babyName} matures. `;
  } else if (Math.abs(wakeChange) < 5) {
    narrative += `Wake windows are holding steady at ${wakeValue}h. `;
  }
  
  // Add contextual ending
  if (Math.abs(nightChange) < 5 && Math.abs(napsChange) < 10) {
    narrative += `Overall rhythm is stable—no adjustments needed.`;
  } else {
    narrative += `These changes are normal developmental progressions.`;
  }
  
  return narrative;
};
