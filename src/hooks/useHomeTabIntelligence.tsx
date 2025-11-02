import { useMemo } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Moon, Milk, Sun } from 'lucide-react';
import { Activity } from '@/components/ActivityCard';

interface CurrentActivityState {
  type: 'napping' | 'awake' | 'feeding';
  duration: number;
  statusText: string;
  startTime: string;
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
  babyName: string = 'Baby'
) => {
  // Calculate current activity state
  const currentActivity = useMemo((): CurrentActivityState | null => {
    if (ongoingNap) {
      const startTime = new Date(ongoingNap.loggedAt);
      const duration = differenceInMinutes(new Date(), startTime);
      return {
        type: 'napping',
        duration,
        statusText: `${babyName}'s napping — Nap in progress`,
        startTime: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
    }

    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );

    const lastActivity = sortedActivities[0];
    if (!lastActivity) return null;

    const lastActivityTime = new Date(lastActivity.loggedAt);
    const duration = differenceInMinutes(new Date(), lastActivityTime);

    if (lastActivity.type === 'feed' && duration < 30) {
      return {
        type: 'feeding',
        duration,
        statusText: `Feeding in progress (${duration} minutes)`,
        startTime: lastActivityTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
    }

    // Otherwise, baby is awake
    const lastNap = sortedActivities.find(a => a.type === 'nap' && a.details?.endTime);
    if (lastNap) {
      // Parse the end time properly
      const parseTimeToMinutes = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        const [hStr, mStr] = time.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr || '0', 10);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      const loggedDate = new Date(lastNap.loggedAt);
      const baseDate = new Date(loggedDate.toDateString());
      const endMinutes = parseTimeToMinutes(lastNap.details.endTime!);
      const startMinutes = lastNap.details?.startTime ? parseTimeToMinutes(lastNap.details.startTime) : null;

      const napEndTime = new Date(baseDate);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      napEndTime.setHours(endHours, endMins, 0, 0);

      // If we have startTime and end < start, it ended after midnight (next day)
      if (startMinutes !== null && endMinutes < startMinutes) {
        napEndTime.setDate(napEndTime.getDate() + 1);
      }

      const awakeMinutes = differenceInMinutes(new Date(), napEndTime);
      if (awakeMinutes < 0) {
        // If negative, skip this calculation
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
  }, [activities, ongoingNap, babyName]);

  // Calculate next prediction
  const nextPrediction = useMemo((): NextPrediction | null => {
    // Simple prediction logic - this would be enhanced with actual prediction engine
    const now = new Date();
    const currentHour = now.getHours();

    if (currentActivity?.type === 'napping') {
      const avgNapDuration = 90; // minutes
      const predictedWake = new Date(now.getTime() + (avgNapDuration - currentActivity.duration) * 60000);
      const minutesUntil = Math.max(0, Math.floor((predictedWake.getTime() - now.getTime()) / 60000));
      
      return {
        activity: 'Expected to wake',
        timeRange: `${predictedWake.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} ± 15 min`,
        countdown: `in ${minutesUntil} min`,
        confidence: 'high'
      };
    }

    if (currentActivity?.type === 'awake') {
      if (currentActivity.duration > 120) {
        return {
          activity: 'Ready for Nap',
          timeRange: 'Now - 10:20 AM',
          countdown: 'past window',
          confidence: 'medium'
        };
      }
      if (currentActivity.duration > 90) {
        const napWindow = new Date(now.getTime() + (120 - currentActivity.duration) * 60000);
        return {
          activity: 'Sweet spot for Nap',
          timeRange: `${napWindow.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} ± 20 min`,
          countdown: `in ${Math.floor((120 - currentActivity.duration))} min`,
          confidence: 'high'
        };
      }
    }

    return null;
  }, [currentActivity]);

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
        onClick: () => console.log('Start nap')
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
          onClick: () => console.log('Log feed')
        });
      }
    }

    return suggestions;
  }, [activities, currentActivity]);

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

