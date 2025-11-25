import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { getTodayActivities } from "@/utils/activityDateFilters";
import { isDaytimeNap } from "@/utils/napClassification";
import { normalizeVolume } from "@/utils/unitConversion";
import { differenceInMinutes } from "date-fns";

interface DailyReassuranceProps {
  activities: Activity[];
  babyName: string;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
}

export const DailyReassurance = ({ 
  activities, 
  babyName,
  nightSleepStartHour,
  nightSleepEndHour
}: DailyReassuranceProps) => {
  
  const reassuranceMessage = useMemo(() => {
    const todayActivities = getTodayActivities(activities);
    
    if (todayActivities.length === 0) {
      return `Start logging activities to see how ${babyName}'s day is unfolding.`;
    }

    // Get recent 3-7 days for comparison (excluding today)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const recentActivities = activities.filter(a => {
      const actDate = new Date(a.loggedAt || a.time);
      return actDate >= sevenDaysAgo && actDate <= yesterday;
    });

    // Parse time to minutes
    const parseTimeToMinutes = (timeStr: string) => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    // Analyze naps
    const todayNaps = todayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    const todayNapDurations: number[] = [];
    todayNaps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        let end = parseTimeToMinutes(nap.details.endTime);
        if (end < start) end += 24 * 60;
        todayNapDurations.push(end - start);
      }
    });

    const recentNaps = recentActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    const recentNapDurations: number[] = [];
    recentNaps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        let end = parseTimeToMinutes(nap.details.endTime);
        if (end < start) end += 24 * 60;
        recentNapDurations.push(end - start);
      }
    });

    const avgTodayNapDuration = todayNapDurations.length > 0 
      ? todayNapDurations.reduce((sum, d) => sum + d, 0) / todayNapDurations.length 
      : 0;
    
    const avgRecentNapDuration = recentNapDurations.length > 0 
      ? recentNapDurations.reduce((sum, d) => sum + d, 0) / recentNapDurations.length 
      : 0;

    // Analyze feeds
    const todayFeeds = todayActivities.filter(a => a.type === 'feed');
    const recentFeeds = recentActivities.filter(a => a.type === 'feed');

    let todayTotalVolume = 0;
    todayFeeds.forEach(feed => {
      if (feed.details?.quantity) {
        const normalized = normalizeVolume(feed.details.quantity, feed.details.unit);
        todayTotalVolume += normalized.value;
      }
    });

    let recentTotalVolume = 0;
    let recentDaysWithFeeds = 0;
    const recentDailyVolumes: Record<string, number> = {};
    
    recentFeeds.forEach(feed => {
      if (feed.details?.quantity) {
        const dateStr = new Date(feed.loggedAt || feed.time).toISOString().split('T')[0];
        const normalized = normalizeVolume(feed.details.quantity, feed.details.unit);
        recentDailyVolumes[dateStr] = (recentDailyVolumes[dateStr] || 0) + normalized.value;
      }
    });

    const dailyVolumes = Object.values(recentDailyVolumes);
    if (dailyVolumes.length > 0) {
      recentTotalVolume = dailyVolumes.reduce((sum, v) => sum + v, 0) / dailyVolumes.length;
      recentDaysWithFeeds = dailyVolumes.length;
    }

    // Check for cluster feeding (3+ feeds within 4 hours)
    const sortedTodayFeeds = [...todayFeeds].sort((a, b) => 
      new Date(a.loggedAt || a.time).getTime() - new Date(b.loggedAt || b.time).getTime()
    );
    
    let isClusterFeeding = false;
    if (sortedTodayFeeds.length >= 3) {
      for (let i = 0; i <= sortedTodayFeeds.length - 3; i++) {
        const firstFeed = new Date(sortedTodayFeeds[i].loggedAt || sortedTodayFeeds[i].time);
        const thirdFeed = new Date(sortedTodayFeeds[i + 2].loggedAt || sortedTodayFeeds[i + 2].time);
        const minutesApart = differenceInMinutes(thirdFeed, firstFeed);
        if (minutesApart <= 240) { // 4 hours
          isClusterFeeding = true;
          break;
        }
      }
    }

    // Analyze wake windows
    const todayWakeWindows: number[] = [];
    for (let i = 1; i < todayNaps.length; i++) {
      const prevNap = todayNaps[i - 1];
      const currNap = todayNaps[i];
      if (prevNap.details?.endTime && currNap.details?.startTime) {
        const prevEnd = parseTimeToMinutes(prevNap.details.endTime);
        const currStart = parseTimeToMinutes(currNap.details.startTime);
        let window = currStart - prevEnd;
        if (window < 0) window += 24 * 60;
        if (window > 0 && window < 360) todayWakeWindows.push(window);
      }
    }

    const recentWakeWindows: number[] = [];
    const recentNapsSorted = [...recentNaps].sort((a, b) => 
      new Date(a.loggedAt || a.time).getTime() - new Date(b.loggedAt || b.time).getTime()
    );
    
    for (let i = 1; i < recentNapsSorted.length; i++) {
      const prevNap = recentNapsSorted[i - 1];
      const currNap = recentNapsSorted[i];
      if (prevNap.details?.endTime && currNap.details?.startTime) {
        const prevEnd = parseTimeToMinutes(prevNap.details.endTime);
        const currStart = parseTimeToMinutes(currNap.details.startTime);
        let window = currStart - prevEnd;
        if (window < 0) window += 24 * 60;
        if (window > 0 && window < 360) recentWakeWindows.push(window);
      }
    }

    const avgTodayWakeWindow = todayWakeWindows.length > 0 
      ? todayWakeWindows.reduce((sum, w) => sum + w, 0) / todayWakeWindows.length 
      : 0;
    
    const avgRecentWakeWindow = recentWakeWindows.length > 0 
      ? recentWakeWindows.reduce((sum, w) => sum + w, 0) / recentWakeWindows.length 
      : 0;

    // Decision logic - detect specific observable patterns
    
    // Check cluster feeding (3+ feeds within 4 hours)
    if (isClusterFeeding) {
      return "Three feeds within 4 hours — cluster feeding pattern.";
    }

    // Check first nap specifically if it was short
    if (todayNapDurations.length > 0 && recentNapDurations.length >= 5) {
      const firstNap = todayNapDurations[0];
      if (firstNap < avgRecentNapDuration * 0.7 && firstNap < 45) {
        return "First nap was shorter than usual this morning.";
      }
      
      // Check if first nap was long
      if (firstNap > avgRecentNapDuration * 1.3) {
        return "Started the day with a longer nap than usual.";
      }
    }

    // Check for significantly increased intake
    if (todayFeeds.length >= 2 && recentDaysWithFeeds >= 3 && todayTotalVolume > recentTotalVolume * 1.2) {
      return `${babyName} is eating more than usual today.`;
    }

    // Check for lighter feeds
    if (todayFeeds.length >= 2 && recentDaysWithFeeds >= 3 && todayTotalVolume < recentTotalVolume * 0.75) {
      return "Feeds have been lighter than usual so far.";
    }

    // Check longest wake window specifically
    if (todayWakeWindows.length >= 1 && recentWakeWindows.length >= 3) {
      const longestToday = Math.max(...todayWakeWindows);
      const avgRecent = avgRecentWakeWindow;
      
      if (longestToday > avgRecent * 1.25) {
        const hours = Math.floor(longestToday / 60);
        const mins = longestToday % 60;
        return `Longest wake window today: ${hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}.`;
      }
    }

    // Check short wake windows
    if (todayWakeWindows.length >= 1 && recentWakeWindows.length >= 3 && avgTodayWakeWindow < avgRecentWakeWindow * 0.8) {
      return "Wake windows are running shorter today.";
    }

    // Check all naps short
    if (todayNapDurations.length >= 2 && recentNapDurations.length >= 5 && avgTodayNapDuration < avgRecentNapDuration * 0.75) {
      return "Naps are running shorter today.";
    }

    // Check schedule alignment (everything within normal ranges)
    const napAligned = todayNapDurations.length > 0 && recentNapDurations.length >= 5 && 
      Math.abs(avgTodayNapDuration - avgRecentNapDuration) / avgRecentNapDuration < 0.15;
    
    const feedAligned = todayFeeds.length >= 2 && recentDaysWithFeeds >= 3 && 
      Math.abs(todayTotalVolume - recentTotalVolume) / recentTotalVolume < 0.15;

    if (napAligned && feedAligned) {
      return `Following ${babyName}'s usual rhythm today.`;
    }

    // Default - typical day
    if (todayNaps.length > 0 || todayFeeds.length > 0) {
      return `${babyName}'s day is unfolding normally so far.`;
    }

    return `Start logging to see how today unfolds.`;
    
  }, [activities, babyName, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="mx-2 mb-3">
      <div className="px-4 py-5 rounded-xl bg-gradient-to-b from-primary/20 via-primary/12 to-primary/5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-foreground/70 leading-relaxed">
          {reassuranceMessage}
        </p>
      </div>
    </div>
  );
};
