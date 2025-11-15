import { useMemo } from 'react';
import { differenceInMinutes, format, addMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Moon, Milk, Sun } from 'lucide-react';
import { Activity } from '@/components/ActivityCard';
import { usePredictionEngine } from '@/hooks/usePredictionEngine';
import { useNightSleepWindow } from '@/hooks/useNightSleepWindow';
import { isDaytimeNap, isNightSleep } from '@/utils/napClassification';
import { getActivityEventDateString } from '@/utils/activityDate';

interface CurrentActivityState {
  type: 'napping' | 'sleeping' | 'awake' | 'feeding';
  duration: number;
  statusText: string;
  startTime: string;
  isPastAnticipatedWake?: boolean; // Whether we're past the expected wake time (for naps)
}

interface NextPrediction {
  activity: string;
  timeRange: string;
  countdown: string;
  confidence: 'high' | 'medium' | 'low';
}

interface SmartSuggestion {
  id: string;
  type: 'nap' | 'feed' | 'wake';
  title: string;
  subtitle: string;
  priority: number;
  icon: React.ReactNode;
  onClick: () => void;
}

interface DeviationData {
  category: 'sleep' | 'feeding' | 'schedule';
  status: 'normal' | 'needs-attention' | 'unusually-good';
  icon: React.ReactNode;
  title: string;
  details: string;
  hasDeviation: boolean;
}

export const useHomeTabIntelligence = (
  activities: Activity[],
  ongoingNap: Activity | null,
  babyName: string = 'Baby',
  onAddActivity?: (type: 'feed' | 'nap') => void,
  babyBirthday?: string
) => {
  // Use the prediction engine for intelligent forecasting
  const { prediction } = usePredictionEngine(activities);
  
  // Get configurable night sleep window
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  // Calculate current activity state
  const currentActivity = useMemo((): CurrentActivityState | null => {
    if (ongoingNap) {
      // For naps, use the actual startTime from details if available (user may log retroactively)
      // Otherwise fall back to loggedAt
      let napStartTime: Date;
      if (ongoingNap.details?.startTime) {
        // Parse the startTime string (e.g., "6:35 PM") into a Date object
        // Use loggedAt date but replace time with startTime
        const loggedDate = new Date(ongoingNap.loggedAt);
        const match = ongoingNap.details.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          napStartTime = new Date(loggedDate);
          napStartTime.setHours(hours, minutes, 0, 0);
        } else {
          napStartTime = new Date(ongoingNap.loggedAt);
        }
      } else {
        napStartTime = new Date(ongoingNap.loggedAt);
      }
      
      const duration = differenceInMinutes(new Date(), napStartTime);
      
      // Check if we're past anticipated wake time (if prediction exists)
      let isPastAnticipatedWake = false;
      if (prediction?.timing?.nextWakeAt) {
        const wakeTime = new Date(prediction.timing.nextWakeAt);
        isPastAnticipatedWake = new Date() > wakeTime;
      }
      
      const isNightSleep = ongoingNap.details?.isNightSleep;
      const sleepType = isNightSleep ? 'sleeping' : 'napping';
      const sleepNoun = isNightSleep ? 'Sleep' : 'Nap';
      
      return {
        type: isNightSleep ? 'sleeping' : 'napping',
        duration,
        statusText: `${babyName}'s ${sleepType} — ${sleepNoun} in progress`,
        startTime: napStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        isPastAnticipatedWake
      };
    }

    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );

    const lastActivity = sortedActivities[0];
    if (!lastActivity) return null;

    const lastActivityTime = new Date(lastActivity.loggedAt);
    const duration = differenceInMinutes(new Date(), lastActivityTime);

    // Check if last activity is an ongoing feed (no endTime = still feeding)
    if (lastActivity.type === 'feed' && duration < 30 && !lastActivity.details?.endTime) {
      return {
        type: 'feeding',
        duration,
        statusText: `Feeding in progress (${duration} minutes)`,
        startTime: lastActivityTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
    }

    // Otherwise, baby is awake
    // Use the nap with the most recent END time (handles overnight sleep and optimistic updates)
    const napsWithEnd = activities
      .filter(a => a.type === 'nap' && a.details?.endTime)
      .map(nap => {
        const parseTimeToMinutes = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hStr, mStr] = time.split(':');
          let h = parseInt(hStr, 10);
          const m = parseInt(mStr || '0', 10);
          if (period === 'PM' && h !== 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };
        const loggedDate = new Date(nap.loggedAt);
        const baseDate = new Date(loggedDate.toDateString());
        const endMinutes = parseTimeToMinutes(nap.details!.endTime!);
        const startMinutes = nap.details?.startTime ? parseTimeToMinutes(nap.details.startTime) : null;
        const endDate = new Date(baseDate);
        endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
        if (startMinutes !== null && endMinutes < startMinutes) endDate.setDate(endDate.getDate() + 1);
        return { nap, endDate };
      });

    const lastByEnd = napsWithEnd.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
    if (lastByEnd) {
      const napEndTime = lastByEnd.endDate;
      const awakeMinutes = differenceInMinutes(new Date(), napEndTime);
      if (awakeMinutes < 0) {
        return {
          type: 'awake',
          duration: 0,
          statusText: `${babyName} is awake`,
          startTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
      }
      const hours = Math.floor(awakeMinutes / 60);
      const mins = awakeMinutes % 60;
      return {
        type: 'awake',
        duration: awakeMinutes,
        statusText: `${babyName}'s been awake ${hours}h ${mins}m`,
        startTime: napEndTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
    }

    return {
      type: 'awake',
      duration: 0,
      statusText: `${babyName} is awake`,
      startTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  }, [activities, ongoingNap, babyName, prediction]);

  // Calculate next prediction using the prediction engine
  const nextPrediction = useMemo((): NextPrediction | null => {
    if (!prediction) return null;

    const now = new Date();
    const timing = prediction.timing;
    const intent = prediction.intent;

    // Handle sleeping/napping state - only if actually asleep
    // For night sleep (type === 'sleeping'), don't show countdown
    if (currentActivity?.type === 'napping') {
      if (timing?.nextWakeAt) {
        const wakeTime = new Date(timing.nextWakeAt);
        const minutesUntil = Math.max(0, differenceInMinutes(wakeTime, now));
        
        return {
          activity: 'Expected to wake',
          timeRange: `${format(wakeTime, 'h:mm a')} ± 15 min`,
          countdown: minutesUntil > 0 ? `in ${minutesUntil} min` : 'any moment',
          confidence: prediction.confidence
        };
      }
      // If napping but no wake prediction, don't show next prediction
      return null;
    }
    
    // For night sleep, don't show any prediction
    if (currentActivity?.type === 'sleeping') {
      return null;
    }

    // If baby is awake (not sleeping/napping), prioritize feed predictions first
    if (currentActivity?.type === 'awake') {
      // Check if feed is more imminent than nap
      const feedTime = timing?.nextFeedAt ? new Date(timing.nextFeedAt) : null;
      const napTime = timing?.nextNapWindowStart ? new Date(timing.nextNapWindowStart) : null;
      
      if (feedTime && napTime) {
        const minutesUntilFeed = differenceInMinutes(feedTime, now);
        const minutesUntilNap = differenceInMinutes(napTime, now);
        
        // If feed is within 60 minutes or sooner than nap, show feed prediction
        if (minutesUntilFeed <= 60 || minutesUntilFeed < minutesUntilNap) {
          const hoursUntil = Math.floor(minutesUntilFeed / 60);
          const minsRemaining = minutesUntilFeed % 60;
          
          let countdown: string;
          if (minutesUntilFeed <= 0) {
            countdown = 'now';
          } else if (minutesUntilFeed < 60) {
            countdown = `in ${minutesUntilFeed} min`;
          } else {
            countdown = `in ${hoursUntil}h ${minsRemaining}m`;
          }
          
          return {
            activity: 'Next Feed',
            timeRange: `${format(feedTime, 'h:mm a')} ± 15 min`,
            countdown,
            confidence: prediction.confidence
          };
        }
      } else if (feedTime && intent === 'FEED_SOON') {
        // Only feed prediction available
        const minutesUntil = Math.max(0, differenceInMinutes(feedTime, now));
        const hoursUntil = Math.floor(minutesUntil / 60);
        const minsRemaining = minutesUntil % 60;
        
        let countdown: string;
        if (minutesUntil <= 0) {
          countdown = 'now';
        } else if (minutesUntil < 60) {
          countdown = `in ${minutesUntil} min`;
        } else {
          countdown = `in ${hoursUntil}h ${minsRemaining}m`;
        }
        
        return {
          activity: 'Next Feed',
          timeRange: `${format(feedTime, 'h:mm a')} ± 15 min`,
          countdown,
          confidence: prediction.confidence
        };
      }
    }

    // Handle feed prediction (general case)
    if (intent === 'FEED_SOON' && timing?.nextFeedAt) {
      const feedTime = new Date(timing.nextFeedAt);
      const minutesUntil = Math.max(0, differenceInMinutes(feedTime, now));
      const hoursUntil = Math.floor(minutesUntil / 60);
      const minsRemaining = minutesUntil % 60;
      
      let countdown: string;
      if (minutesUntil <= 0) {
        countdown = 'now';
      } else if (minutesUntil < 60) {
        countdown = `in ${minutesUntil} min`;
      } else {
        countdown = `in ${hoursUntil}h ${minsRemaining}m`;
      }
      
      return {
        activity: 'Next Feed',
        timeRange: `${format(feedTime, 'h:mm a')} ± 15 min`,
        countdown,
        confidence: prediction.confidence
      };
    }

    // Handle nap prediction - but not during active feeding
    if (intent === 'START_WIND_DOWN' && timing?.nextNapWindowStart) {
      // Don't show nap predictions while baby is actively feeding
      if (currentActivity?.type === 'feeding') {
        return null;
      }
      
      // Calculate age-appropriate minimum wake window
      // Use 2/3 of wake_window_max from AGE_BRACKETS to avoid showing "now" too early
      let minWakeWindow = 60; // Default minimum (2/3 of 90min for 0-3mo)
      if (babyBirthday) {
        const birthDate = new Date(babyBirthday);
        const ageInMonths = Math.floor((new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        
        // AGE_BRACKETS from predictionEngine.ts:
        // 0-3mo: wake_window_max: 90min
        // 4-6mo: wake_window_max: 150min  
        // 7-12mo: wake_window_max: 240min
        
        if (ageInMonths >= 7) {
          minWakeWindow = 160; // 2/3 of 240min (2h40m) for 7-12 months
        } else if (ageInMonths >= 4) {
          minWakeWindow = 100; // 2/3 of 150min (1h40m) for 4-6 months
        } else {
          minWakeWindow = 60; // 2/3 of 90min (1h) for 0-3 months
        }
      }
      
      // Don't show nap predictions if baby just woke up
      if (currentActivity?.type === 'awake' && currentActivity.duration < minWakeWindow) {
        return null;
      }
      
      const napTime = new Date(timing.nextNapWindowStart);
      const minutesUntil = Math.max(0, differenceInMinutes(napTime, now));
      const hoursUntil = Math.floor(minutesUntil / 60);
      const minsRemaining = minutesUntil % 60;
      
      let countdown: string;
      if (minutesUntil <= 0) {
        // If nap is "overdue" but baby just woke, show "soon" instead of "now"
        countdown = 'soon';
      } else if (minutesUntil < 60) {
        countdown = `in ${minutesUntil} min`;
      } else {
        countdown = `in ${hoursUntil}h ${minsRemaining}m`;
      }
      
      return {
        activity: 'Next Nap Window',
        timeRange: `${format(napTime, 'h:mm a')} ± 20 min`,
        countdown,
        confidence: prediction.confidence
      };
    }

    return null;
  }, [currentActivity, prediction]);

  // Calculate smart suggestions
  const smartSuggestions = useMemo((): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Suggest nap if awake for > 2 hours
    if (currentActivity?.type === 'awake' && currentActivity.duration > 120) {
      suggestions.push({
        id: 'nap-overdue',
        type: 'nap',
        title: 'Ready for nap?',
        subtitle: 'Awake for over 2 hours',
        priority: 100,
        icon: <Moon className="w-4 h-4 text-primary" />,
        onClick: () => onAddActivity?.('nap')
      });
    }

    // Suggest feed if > 2.5 hours since last feed
    const feedActivities = activities.filter(a => a.type === 'feed' && a.loggedAt);
    
    if (feedActivities.length > 0) {
      // Sort by loggedAt timestamp (UTC stored in DB)
      const sortedFeeds = [...feedActivities].sort((a, b) => {
        const timeA = new Date(a.loggedAt!).getTime();
        const timeB = new Date(b.loggedAt!).getTime();
        return timeB - timeA; // Most recent first
      });
      
      const lastFeed = sortedFeeds[0];
      
      // Simply use loggedAt as-is - it's already in UTC and will be converted correctly
      const lastFeedTime = new Date(lastFeed.loggedAt!);
      const now = new Date();
      const minutesSinceFeed = differenceInMinutes(now, lastFeedTime);
      
      console.log('🍼 Feed time calculation:', {
        lastFeedId: lastFeed.id?.slice(0, 8),
        lastFeedLoggedAt: lastFeed.loggedAt,
        lastFeedParsed: lastFeedTime.toLocaleString(),
        now: now.toLocaleString(),
        minutesSinceFeed,
        hours: Math.floor(minutesSinceFeed / 60),
        mins: minutesSinceFeed % 60
      });
      
      // Only suggest if more than 2.5 hours and less than 24 hours (sanity check)
      if (minutesSinceFeed > 150 && minutesSinceFeed < 1440) {
        const hours = Math.floor(minutesSinceFeed / 60);
        const mins = minutesSinceFeed % 60;
        
        suggestions.push({
          id: 'feed-due',
          type: 'feed',
          title: 'Feed due soon',
          subtitle: `Last feed: ${hours}h ${mins}m ago`,
          priority: 90,
          icon: <Milk className="w-4 h-4 text-primary" />,
          onClick: () => onAddActivity?.('feed')
        });
      }
    }

    return suggestions;
  }, [activities, currentActivity, onAddActivity]);

  // Calculate today's pulse deviations with intelligent analysis
  const todaysPulse = useMemo((): { deviations: DeviationData[]; biggestDeviation?: any } => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayActivities = activities.filter(a => 
      new Date(a.loggedAt) >= todayStart
    );

    // Calculate baby age in months
    let babyAgeMonths = 0;
    if (babyBirthday) {
      const birthDate = new Date(babyBirthday);
      babyAgeMonths = Math.max(0, 
        (now.getFullYear() - birthDate.getFullYear()) * 12 + 
        (now.getMonth() - birthDate.getMonth())
      );
    }

    console.log('📊 Today\'s Pulse Debug:', {
      currentTime: now.toLocaleString(),
      currentHour: now.getHours(),
      babyAgeMonths,
      todayActivitiesCount: todayActivities.length
    });

    // Age-appropriate baselines (feeds per day, naps per day)
    const getExpectedRanges = (ageMonths: number) => {
      if (ageMonths < 1) return { feeds: [8, 12], naps: [4, 6], wakeWindow: [45, 90] };
      if (ageMonths < 3) return { feeds: [7, 10], naps: [4, 5], wakeWindow: [60, 120] };
      if (ageMonths < 6) return { feeds: [6, 8], naps: [3, 4], wakeWindow: [90, 150] };
      if (ageMonths < 9) return { feeds: [5, 7], naps: [3, 3], wakeWindow: [120, 180] };
      if (ageMonths < 12) return { feeds: [4, 6], naps: [2, 3], wakeWindow: [150, 210] };
      return { feeds: [3, 5], naps: [1, 2], wakeWindow: [180, 300] };
    };

    const expected = getExpectedRanges(babyAgeMonths);

    // Get last 7 days for pattern analysis
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysActivities = activities.filter(a => 
      new Date(a.loggedAt) >= sevenDaysAgo
    );

    // Calculate 7-day averages using actual event dates
    const daysWithData = new Set<string>();
    last7DaysActivities.forEach(a => {
      const date = getActivityEventDateString(a as any);
      daysWithData.add(date);
    });
    const numDays = Math.max(1, daysWithData.size);

    const last7DaysNaps = last7DaysActivities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
    const last7DaysFeeds = last7DaysActivities.filter(a => a.type === 'feed');
    
    const avg7DayNaps = last7DaysNaps.length / numDays;
    const avg7DayFeeds = last7DaysFeeds.length / numDays;

    // Today's counts
    const napsToday = todayActivities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
    const feedsToday = todayActivities.filter(a => a.type === 'feed');
    
    const napCount = napsToday.length;
    const feedCount = feedsToday.length;

    // Analyze sleep
    let sleepStatus: 'normal' | 'needs-attention' | 'unusually-good' = 'normal';
    let sleepDetails = `${napCount} nap${napCount !== 1 ? 's' : ''} so far`;
    let sleepHasDeviation = false;

    if (napCount === 0 && now.getHours() >= 12) {
      sleepStatus = 'needs-attention';
      sleepDetails = 'No naps logged yet today';
      sleepHasDeviation = true;
    } else if (napCount < expected.naps[0] - 1 && now.getHours() >= 16) {
      sleepStatus = 'needs-attention';
      sleepDetails = `${napCount} nap${napCount !== 1 ? 's' : ''} — below expected ${expected.naps[0]}-${expected.naps[1]}`;
      sleepHasDeviation = true;
    } else if (napCount > avg7DayNaps * 1.3 && napCount > 2) {
      sleepStatus = 'unusually-good';
      sleepDetails = `${napCount} naps today — more than usual (avg: ${avg7DayNaps.toFixed(1)})`;
      sleepHasDeviation = true;
    } else if (napCount >= expected.naps[0] && napCount <= expected.naps[1]) {
      sleepDetails = `${napCount} nap${napCount !== 1 ? 's' : ''} — right on track`;
    }

    // Analyze feeding
    let feedStatus: 'normal' | 'needs-attention' | 'unusually-good' = 'normal';
    let feedDetails = `${feedCount} feed${feedCount !== 1 ? 's' : ''} so far`;
    let feedHasDeviation = false;

    console.log('🍼 Feed Analysis:', {
      feedCount,
      expectedRange: expected.feeds,
      threshold: expected.feeds[0] - 2,
      currentHour: now.getHours(),
      shouldTriggerAlert: feedCount < expected.feeds[0] - 2 && now.getHours() >= 16,
      avg7DayFeeds: avg7DayFeeds.toFixed(1)
    });

    if (feedCount === 0 && now.getHours() >= 10) {
      feedStatus = 'needs-attention';
      feedDetails = 'No feeds logged yet today';
      feedHasDeviation = true;
    } else if (feedCount < expected.feeds[0] - 2 && now.getHours() >= 16) {
      feedStatus = 'needs-attention';
      feedDetails = `${feedCount} feed${feedCount !== 1 ? 's' : ''} — below expected ${expected.feeds[0]}-${expected.feeds[1]}`;
      feedHasDeviation = true;
    } else if (feedCount > avg7DayFeeds * 1.4 && feedCount >= 2) {
      feedStatus = 'unusually-good';
      feedDetails = `${feedCount} feeds today — cluster feeding (avg: ${avg7DayFeeds.toFixed(1)})`;
      feedHasDeviation = true;
    } else if (feedCount >= expected.feeds[0] && feedCount <= expected.feeds[1]) {
      feedDetails = `${feedCount} feed${feedCount !== 1 ? 's' : ''}, right on schedule`;
    }

    // Analyze schedule timing
    let scheduleStatus: 'normal' | 'needs-attention' | 'unusually-good' = 'normal';
    let scheduleDetails = 'On track';
    let scheduleHasDeviation = false;

    // Check wake window if baby is currently awake
    if (currentActivity?.type === 'awake' && currentActivity.duration) {
      const currentWakeMinutes = currentActivity.duration;
      const expectedMaxWake = expected.wakeWindow[1];
      
      if (currentWakeMinutes > expectedMaxWake + 30) {
        scheduleStatus = 'needs-attention';
        scheduleDetails = `Awake ${Math.floor(currentWakeMinutes / 60)}h ${currentWakeMinutes % 60}m — longer than typical`;
        scheduleHasDeviation = true;
      } else if (currentWakeMinutes > expectedMaxWake) {
        scheduleDetails = `Approaching nap window`;
      }
    }

    // Check feed spacing
    if (feedsToday.length >= 2) {
      const sortedFeeds = [...feedsToday].sort((a, b) => 
        new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
      );
      
      const gaps = [];
      for (let i = 1; i < sortedFeeds.length; i++) {
        const gap = differenceInMinutes(
          new Date(sortedFeeds[i].loggedAt),
          new Date(sortedFeeds[i - 1].loggedAt)
        );
        gaps.push(gap);
      }
      
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const minGap = Math.min(...gaps);
      
      // Detect cluster feeding
      if (gaps.filter(g => g < 90).length >= 2) {
        scheduleStatus = 'needs-attention';
        scheduleDetails = 'Cluster feeding detected — possible growth spurt';
        scheduleHasDeviation = true;
      } else if (avgGap >= 180 && avgGap <= 240 && babyAgeMonths < 6) {
        scheduleStatus = 'unusually-good';
        scheduleDetails = 'Great feed spacing today';
        scheduleHasDeviation = true;
      }
    }

    const deviations: DeviationData[] = [
      {
        category: 'sleep',
        status: sleepStatus,
        icon: <Moon className="w-5 h-5" />,
        title: 'Sleep',
        details: sleepDetails,
        hasDeviation: sleepHasDeviation
      },
      {
        category: 'feeding',
        status: feedStatus,
        icon: <Milk className="w-5 h-5" />,
        title: 'Feeding',
        details: feedDetails,
        hasDeviation: feedHasDeviation
      },
      {
        category: 'schedule',
        status: scheduleStatus,
        icon: <Sun className="w-5 h-5" />,
        title: 'Schedule Timing',
        details: scheduleDetails,
        hasDeviation: scheduleHasDeviation
      }
    ];

    // Identify biggest deviation for AI explanation
    let biggestDeviation;
    const deviationsWithIssues = deviations.filter(d => d.hasDeviation);
    if (deviationsWithIssues.length > 0) {
      const priority = deviationsWithIssues.find(d => d.status === 'needs-attention') || deviationsWithIssues[0];
      biggestDeviation = {
        description: `${priority.title}: ${priority.details}`,
        normal: `Expected ${priority.category === 'sleep' ? expected.naps[0] + '-' + expected.naps[1] + ' naps' : expected.feeds[0] + '-' + expected.feeds[1] + ' feeds'}`,
        actual: priority.details,
        context: `7-day average: ${priority.category === 'sleep' ? avg7DayNaps.toFixed(1) + ' naps' : avg7DayFeeds.toFixed(1) + ' feeds'}`
      };
    }

    return { deviations, biggestDeviation };
  }, [activities, currentActivity, babyBirthday]);

  return {
    currentActivity,
    nextPrediction,
    smartSuggestions,
    todaysPulse
  };
};

