import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { getTodayActivities } from "@/utils/activityDateFilters";
import { isDaytimeNap } from "@/utils/napClassification";
import { normalizeVolume } from "@/utils/unitConversion";
import { differenceInMinutes } from "date-fns";
import { Brain } from "lucide-react";

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
      return `Start logging to see how today unfolds.`;
    }

    // Random selection helper
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // Message libraries
    const messages = {
      napShorter: [
        "Nap was shorter than usual today.",
        "Shorter nap than usual.",
        "Morning nap ran a bit short.",
        "Naps are trending shorter today."
      ],
      napLonger: [
        "Longer nap than usual this morning.",
        "Nap stretched longer than usual.",
        "Started the day with a longer nap.",
        "Today's nap ran a bit long."
      ],
      napEarlier: ["First nap started earlier than usual."],
      napLater: ["First nap started a little later today."],
      wakeWindowsLonger: [
        "Wake windows are running long today.",
        "Longer awake periods than usual.",
        `${babyName} is staying up longer today.`
      ],
      wakeWindowsShorter: [
        "Wake windows are shorter than usual.",
        `${babyName} is getting sleepy sooner today.`
      ],
      clusterFeeding: [
        "Feeds are coming closer together today.",
        "More frequent feeds than usual."
      ],
      feedsLighter: [
        "Feeds have been a little lighter today.",
        `${babyName} is taking slightly smaller feeds so far.`
      ],
      feedsHeavier: [
        `${babyName} is eating a bit more than usual today.`,
        "Feeds are running slightly larger today."
      ],
      feedEarlier: ["First feed came earlier than usual."],
      feedLater: ["First feed started later than usual."],
      nightShorter: ["Last night ran shorter than usual."],
      nightLonger: ["Last night's sleep was a bit longer."],
      earlyWake: [`${babyName} woke earlier than usual this morning.`],
      lateWake: [`${babyName} slept in a little this morning.`],
      aligned: [
        `Today is lining up with ${babyName}'s usual rhythm.`,
        "Today looks typical so far.",
        "Everything is tracking normally today.",
        `A very usual day for ${babyName} so far.`,
        "Today's pattern looks steady and familiar."
      ],
      growthSpurt: [
        "Today looks like a growth-spurt pattern.",
        `${babyName} seems hungrier and sleepier than usual.`
      ],
      fallback: [
        "Today looks typical so far.",
        `Everything looks normal for ${babyName} today.`,
        `A very usual day so far.`
      ]
    };

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
    const todayNapStartTimes: number[] = [];
    todayNaps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        let end = parseTimeToMinutes(nap.details.endTime);
        if (end < start) end += 24 * 60;
        todayNapDurations.push(end - start);
        todayNapStartTimes.push(start);
      }
    });

    const recentNaps = recentActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    const recentNapDurations: number[] = [];
    const recentNapStartTimes: number[] = [];
    recentNaps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        let end = parseTimeToMinutes(nap.details.endTime);
        if (end < start) end += 24 * 60;
        recentNapDurations.push(end - start);
        recentNapStartTimes.push(start);
      }
    });

    const avgTodayNapDuration = todayNapDurations.length > 0 
      ? todayNapDurations.reduce((sum, d) => sum + d, 0) / todayNapDurations.length 
      : 0;
    
    const avgRecentNapDuration = recentNapDurations.length > 0 
      ? recentNapDurations.reduce((sum, d) => sum + d, 0) / recentNapDurations.length 
      : 0;

    const avgRecentFirstNapStart = recentNapStartTimes.length > 0
      ? recentNapStartTimes.slice(0, 7).reduce((sum, t) => sum + t, 0) / Math.min(7, recentNapStartTimes.length)
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
    const recentFirstFeedTimes: number[] = [];
    
    recentFeeds.forEach(feed => {
      if (feed.details?.quantity) {
        const dateStr = new Date(feed.loggedAt || feed.time).toISOString().split('T')[0];
        const normalized = normalizeVolume(feed.details.quantity, feed.details.unit);
        recentDailyVolumes[dateStr] = (recentDailyVolumes[dateStr] || 0) + normalized.value;
      }
    });

    // Get first feed times by day for recent days
    const recentFeedsByDay: Record<string, any[]> = {};
    recentFeeds.forEach(feed => {
      const dateStr = new Date(feed.loggedAt || feed.time).toISOString().split('T')[0];
      if (!recentFeedsByDay[dateStr]) recentFeedsByDay[dateStr] = [];
      recentFeedsByDay[dateStr].push(feed);
    });

    Object.values(recentFeedsByDay).forEach(dayFeeds => {
      if (dayFeeds.length > 0) {
        const sorted = dayFeeds.sort((a, b) => 
          new Date(a.loggedAt || a.time).getTime() - new Date(b.loggedAt || b.time).getTime()
        );
        const firstFeed = sorted[0];
        const feedTime = new Date(firstFeed.loggedAt || firstFeed.time);
        recentFirstFeedTimes.push(feedTime.getHours() * 60 + feedTime.getMinutes());
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

    // Decision logic - prioritize most notable pattern
    
    // Check cluster feeding first
    if (isClusterFeeding) {
      return pick(messages.clusterFeeding);
    }

    // Check first nap timing (earlier/later)
    if (todayNapStartTimes.length > 0 && recentNapStartTimes.length >= 3 && avgRecentFirstNapStart > 0) {
      const firstNapToday = todayNapStartTimes[0];
      if (firstNapToday < avgRecentFirstNapStart - 30) {
        return pick(messages.napEarlier);
      }
      if (firstNapToday > avgRecentFirstNapStart + 30) {
        return pick(messages.napLater);
      }
    }

    // Check first nap duration (shorter/longer)
    if (todayNapDurations.length > 0 && recentNapDurations.length >= 5) {
      const firstNap = todayNapDurations[0];
      if (firstNap < avgRecentNapDuration * 0.7 && firstNap < 50) {
        return pick(messages.napShorter);
      }
      if (firstNap > avgRecentNapDuration * 1.3) {
        return pick(messages.napLonger);
      }
    }

    // Check first feed timing
    if (sortedTodayFeeds.length > 0 && recentFirstFeedTimes.length >= 3) {
      const firstFeedToday = new Date(sortedTodayFeeds[0].loggedAt || sortedTodayFeeds[0].time);
      const firstFeedTodayMins = firstFeedToday.getHours() * 60 + firstFeedToday.getMinutes();
      const avgRecentFirstFeed = recentFirstFeedTimes.reduce((sum, t) => sum + t, 0) / recentFirstFeedTimes.length;
      
      if (firstFeedTodayMins < avgRecentFirstFeed - 45) {
        return pick(messages.feedEarlier);
      }
      if (firstFeedTodayMins > avgRecentFirstFeed + 45) {
        return pick(messages.feedLater);
      }
    }

    // Check for heavier feeds
    if (todayFeeds.length >= 2 && dailyVolumes.length >= 3 && todayTotalVolume > recentTotalVolume * 1.25) {
      return pick(messages.feedsHeavier);
    }

    // Check for lighter feeds
    if (todayFeeds.length >= 2 && dailyVolumes.length >= 3 && todayTotalVolume < recentTotalVolume * 0.7) {
      return pick(messages.feedsLighter);
    }

    // Check wake windows longer
    if (todayWakeWindows.length >= 1 && recentWakeWindows.length >= 3 && avgTodayWakeWindow > avgRecentWakeWindow * 1.25) {
      return pick(messages.wakeWindowsLonger);
    }

    // Check wake windows shorter
    if (todayWakeWindows.length >= 1 && recentWakeWindows.length >= 3 && avgTodayWakeWindow < avgRecentWakeWindow * 0.75) {
      return pick(messages.wakeWindowsShorter);
    }

    // Check all naps shorter
    if (todayNapDurations.length >= 2 && recentNapDurations.length >= 5 && avgTodayNapDuration < avgRecentNapDuration * 0.75) {
      return pick(messages.napShorter);
    }

    // Check growth spurt pattern (more feeds + longer naps)
    if (todayFeeds.length >= recentFeeds.length / 7 * 1.4 && 
        todayNapDurations.length > 0 && 
        avgTodayNapDuration > avgRecentNapDuration * 1.15) {
      return pick(messages.growthSpurt);
    }

    // Check schedule alignment (everything within normal ranges)
    const napAligned = todayNapDurations.length > 0 && recentNapDurations.length >= 5 && 
      Math.abs(avgTodayNapDuration - avgRecentNapDuration) / avgRecentNapDuration < 0.2;
    
    const feedAligned = todayFeeds.length >= 2 && dailyVolumes.length >= 3 && 
      Math.abs(todayTotalVolume - recentTotalVolume) / recentTotalVolume < 0.2;

    if (napAligned && feedAligned) {
      return pick(messages.aligned);
    }

    // Default fallback
    if (todayNaps.length > 0 || todayFeeds.length > 0) {
      return pick(messages.fallback);
    }

    return `Start logging to see how today unfolds.`;
    
  }, [activities, babyName, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="mx-2 mb-4">
      <div className="px-3 py-2.5 rounded-xl bg-gradient-to-b from-primary/8 via-primary/5 to-primary/3 border border-border/10">
        <div className="flex items-start gap-2">
          <Brain className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider mb-0.5">
              Today's Overview
            </p>
            <p className="text-xs text-foreground/70 leading-relaxed">
              {reassuranceMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
