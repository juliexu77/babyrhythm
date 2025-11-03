import { useMemo } from 'react';
import { differenceInMinutes, format, addMinutes } from 'date-fns';
import { Moon, Milk, Sun } from 'lucide-react';
import { Activity } from '@/components/ActivityCard';
import { usePredictionEngine } from '@/hooks/usePredictionEngine';

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
  onAddActivity?: (type: 'feed' | 'nap') => void
) => {
  // Use the prediction engine for intelligent forecasting
  const { prediction } = usePredictionEngine(activities);
  // Calculate current activity state
  const currentActivity = useMemo((): CurrentActivityState | null => {
    if (ongoingNap) {
      const startTime = new Date(ongoingNap.loggedAt);
      const duration = differenceInMinutes(new Date(), startTime);
      
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
        startTime: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
    if (currentActivity?.type === 'napping' && timing?.nextWakeAt) {
      const wakeTime = new Date(timing.nextWakeAt);
      const minutesUntil = Math.max(0, differenceInMinutes(wakeTime, now));
      
      return {
        activity: 'Expected to wake',
        timeRange: `${format(wakeTime, 'h:mm a')} ± 15 min`,
        countdown: minutesUntil > 0 ? `in ${minutesUntil} min` : 'any moment',
        confidence: prediction.confidence
      };
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

    // Handle nap prediction
    if (intent === 'START_WIND_DOWN' && timing?.nextNapWindowStart) {
      const napTime = new Date(timing.nextNapWindowStart);
      const minutesUntil = Math.max(0, differenceInMinutes(napTime, now));
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
    const lastFeed = [...activities]
      .filter(a => a.type === 'feed')
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())[0];
    
    if (lastFeed) {
      const minutesSinceFeed = differenceInMinutes(new Date(), new Date(lastFeed.loggedAt));
      if (minutesSinceFeed > 150) {
        suggestions.push({
          id: 'feed-due',
          type: 'feed',
          title: 'Feed due soon',
          subtitle: `Last feed: ${Math.floor(minutesSinceFeed / 60)}h ${minutesSinceFeed % 60}m ago`,
          priority: 90,
          icon: <Milk className="w-4 h-4 text-primary" />,
          onClick: () => onAddActivity?.('feed')
        });
      }
    }

    return suggestions;
  }, [activities, currentActivity, onAddActivity]);

  // Calculate today's pulse deviations
  const todaysPulse = useMemo((): { deviations: DeviationData[]; biggestDeviation?: any } => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayActivities = activities.filter(a => 
      new Date(a.loggedAt) >= todayStart
    );

    const napsToday = todayActivities.filter(a => a.type === 'nap');
    const feedsToday = todayActivities.filter(a => a.type === 'feed');

    const deviations: DeviationData[] = [
      {
        category: 'sleep',
        status: 'normal',
        icon: <Moon className="w-5 h-5" />,
        title: 'Sleep',
        details: `${napsToday.length} nap${napsToday.length !== 1 ? 's' : ''} so far`,
        hasDeviation: false
      },
      {
        category: 'feeding',
        status: 'normal',
        icon: <Milk className="w-5 h-5" />,
        title: 'Feeding',
        details: `${feedsToday.length} feed${feedsToday.length !== 1 ? 's' : ''}, right on schedule`,
        hasDeviation: false
      },
      {
        category: 'schedule',
        status: 'normal',
        icon: <Sun className="w-5 h-5" />,
        title: 'Schedule Timing',
        details: 'On track',
        hasDeviation: false
      }
    ];

    return { deviations };
  }, [activities]);

  return {
    currentActivity,
    nextPrediction,
    smartSuggestions,
    todaysPulse
  };
};

