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
      return { main: "Start logging to see today's overview", sub: null };
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
        if (minutesApart <= 240) {
          isClusterFeeding = true;
          break;
        }
      }
    }

    // Check first nap specifically
    const firstNap = todayNaps[0];
    if (firstNap && firstNap.details?.startTime && firstNap.details?.endTime) {
      const start = parseTimeToMinutes(firstNap.details.startTime);
      let end = parseTimeToMinutes(firstNap.details.endTime);
      if (end < start) end += 24 * 60;
      const duration = end - start;
      
      if (avgRecentNapDuration > 0 && duration < avgRecentNapDuration * 0.7) {
        return { main: "First nap was shorter than usual", sub: null };
      }
    }

    // Check cluster feeding
    if (isClusterFeeding) {
      return { main: "Feeds coming closer together today", sub: null };
    }

    // Check significant volume increase (15%+)
    if (todayFeeds.length >= 2 && dailyVolumes.length >= 3 && todayTotalVolume > recentTotalVolume * 1.15) {
      return { main: `${babyName} is eating more than usual`, sub: null };
    }

    // Check significant volume decrease (20%+)
    if (todayFeeds.length >= 2 && dailyVolumes.length >= 3 && todayTotalVolume < recentTotalVolume * 0.8) {
      return { main: "Feeds have been lighter today", sub: null };
    }

    // Check long nap (25%+ longer)
    if (todayNapDurations.length > 0 && recentNapDurations.length >= 5) {
      const longestToday = Math.max(...todayNapDurations);
      if (longestToday > avgRecentNapDuration * 1.25) {
        return { main: `${babyName} took a longer nap than usual`, sub: null };
      }
    }

    // Check short naps (20%+ shorter)
    if (todayNapDurations.length >= 2 && recentNapDurations.length >= 5) {
      const avgTodayNapDuration = todayNapDurations.reduce((sum, d) => sum + d, 0) / todayNapDurations.length;
      if (avgTodayNapDuration < avgRecentNapDuration * 0.8) {
        return { main: "Naps have been shorter today", sub: null };
      }
    }

    // Default - typical day
    if (todayNaps.length > 0 || todayFeeds.length > 0) {
      return { main: `${babyName}'s rhythm is on track`, sub: null };
    }

    return { main: "Everything looks typical so far", sub: null };
    
  }, [activities, babyName, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="mx-2 mb-3">
      <div className="px-4 py-3 rounded-xl bg-gradient-to-b from-card-ombre-4-dark to-card-ombre-4 border border-border/20 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h3 className="text-xs font-medium text-foreground/60 uppercase tracking-wider mb-1.5">
          Today's Overview
        </h3>
        <p className="text-sm text-foreground leading-snug">
          {reassuranceMessage.main}
        </p>
        {reassuranceMessage.sub && (
          <p className="text-xs text-muted-foreground mt-1">
            {reassuranceMessage.sub}
          </p>
        )}
      </div>
    </div>
  );
};
