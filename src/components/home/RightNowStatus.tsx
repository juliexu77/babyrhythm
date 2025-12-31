import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { isDaytimeNap } from "@/utils/napClassification";

interface RightNowStatusProps {
  currentActivity: {
    type: 'napping' | 'sleeping' | 'awake' | 'feeding';
    duration: number; // minutes
    statusText: string;
    startTime: string;
    isPastAnticipatedWake?: boolean;
  } | null;
  nextPrediction: {
    activity: string;
    timeRange: string;
    countdown: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  onWokeEarly?: () => void;
  onStillAsleep?: () => void;
  onStartNap?: () => void;
  onEndFeed?: () => void;
  babyName: string;
  babyAge?: number;
  activities: any[];
  suggestions?: Array<{
    id: string;
    type: 'nap' | 'feed' | 'wake';
    title: string;
    subtitle: string;
    priority: number;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
  onAddFeed?: () => void;
  onLogPrediction?: (type: 'feed' | 'nap') => void;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
}

export const RightNowStatus = ({
  currentActivity,
  nextPrediction,
  onWokeEarly,
  babyName,
  babyAge,
  activities,
  onLogPrediction,
  nightSleepStartHour,
  nightSleepEndHour
}: RightNowStatusProps) => {
  
  // Format duration compactly: "2h 12m"
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get current state label with duration
  const getCurrentStateLabel = () => {
    if (!currentActivity) return null;
    
    const duration = formatDuration(currentActivity.duration);
    
    switch (currentActivity.type) {
      case 'napping':
        return `Napping ${duration} (since ${currentActivity.startTime})`;
      case 'sleeping':
        return `Sleeping ${duration} (since ${currentActivity.startTime})`;
      case 'feeding':
        return `Feeding ${duration} (since ${currentActivity.startTime})`;
      case 'awake':
        return `Awake ${duration} (since ${currentActivity.startTime})`;
      default:
        return null;
    }
  };

  // Calculate daily verdict
  const dailyVerdict = useMemo(() => {
    if (!activities || activities.length === 0) return null;
    
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Get today's activities
    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.loggedAt || a.logged_at);
      return format(startOfDay(activityDate), 'yyyy-MM-dd') === todayStr;
    });
    
    // Get yesterday's activities for comparison
    const yesterday = subDays(today, 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const yesterdayActivities = activities.filter(a => {
      const activityDate = new Date(a.loggedAt || a.logged_at);
      return format(startOfDay(activityDate), 'yyyy-MM-dd') === yesterdayStr;
    });
    
    // Calculate metrics
    const todayNaps = todayActivities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
    const todayFeeds = todayActivities.filter(a => a.type === 'feed');
    const yesterdayNaps = yesterdayActivities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
    const yesterdayFeeds = yesterdayActivities.filter(a => a.type === 'feed');
    
    // Calculate average wake window today
    const calculateWakeWindows = (napList: any[]) => {
      if (napList.length < 2) return null;
      const sorted = [...napList].sort((a, b) => {
        const timeA = new Date(a.loggedAt || a.logged_at).getTime();
        const timeB = new Date(b.loggedAt || b.logged_at).getTime();
        return timeA - timeB;
      });
      let totalWindow = 0;
      let count = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = sorted[i - 1].details?.endTime;
        const currStart = sorted[i].details?.startTime;
        if (prevEnd && currStart) {
          // Simple calculation - could be improved
          count++;
          totalWindow += 120; // placeholder
        }
      }
      return count > 0 ? totalWindow / count : null;
    };
    
    // Get last 7 days average wake window
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, i);
      return format(date, 'yyyy-MM-dd');
    });
    
    const recentNaps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      const activityDate = new Date(a.loggedAt || a.logged_at);
      const dateStr = format(startOfDay(activityDate), 'yyyy-MM-dd');
      return last7Days.includes(dateStr) && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour);
    });
    
    // Determine verdict based on patterns
    const currentHour = new Date().getHours();
    
    // Check if wake windows are longer than usual
    if (currentActivity?.type === 'awake' && currentActivity.duration > 150 && babyAge && babyAge < 6) {
      return "Longer wake window than usual";
    }
    
    // Check if catching up on sleep
    if (todayNaps.length > yesterdayNaps.length && yesterdayNaps.length < 2) {
      return "Catching up on day sleep";
    }
    
    // Check if following yesterday's pattern
    if (Math.abs(todayNaps.length - yesterdayNaps.length) <= 1 && 
        Math.abs(todayFeeds.length - yesterdayFeeds.length) <= 1 &&
        todayActivities.length >= 3) {
      return "Following yesterday's pattern";
    }
    
    // Check time of day for appropriate verdicts
    if (currentHour < 12 && todayActivities.length >= 2) {
      return "Morning on track";
    }
    
    if (currentHour >= 12 && currentHour < 17 && todayNaps.length >= 1) {
      return "Afternoon flowing well";
    }
    
    // Default
    if (todayActivities.length >= 2) {
      return "Today is on track";
    }
    
    return null;
  }, [activities, currentActivity, babyAge, nightSleepStartHour, nightSleepEndHour]);

  // Calculate quiet achievement
  const quietAchievement = useMemo(() => {
    if (!activities || activities.length < 5) return null;
    
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Check if already dismissed today
    const dismissKey = `achievement-dismissed-${todayStr}`;
    if (typeof window !== 'undefined' && localStorage.getItem(dismissKey)) {
      return null;
    }
    
    // Get today's naps
    const todayNaps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      const activityDate = new Date(a.loggedAt || a.logged_at);
      return format(startOfDay(activityDate), 'yyyy-MM-dd') === todayStr && 
             isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour);
    });
    
    // Get this week's naps for comparison
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));
    const weekNaps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      const activityDate = new Date(a.loggedAt || a.logged_at);
      const dateStr = format(startOfDay(activityDate), 'yyyy-MM-dd');
      return last7Days.includes(dateStr) && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour);
    });
    
    // Check for longest wake window this week
    if (currentActivity?.type === 'awake' && currentActivity.duration > 0) {
      // Get all wake windows from this week (simplified - just check if current is long)
      if (currentActivity.duration >= 180 && babyAge && babyAge >= 4) {
        return "Longest wake window this week";
      }
    }
    
    // Check for long nap today
    const todayLongNaps = todayNaps.filter(nap => {
      const startTime = nap.details?.startTime;
      const endTime = nap.details?.endTime;
      if (!startTime || !endTime) return false;
      
      const parseTime = (t: string) => {
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
        if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };
      
      const duration = parseTime(endTime) - parseTime(startTime);
      return duration >= 90;
    });
    
    if (todayLongNaps.length > 0) {
      const avgWeekDuration = weekNaps.reduce((sum, nap) => {
        const startTime = nap.details?.startTime;
        const endTime = nap.details?.endTime;
        if (!startTime || !endTime) return sum;
        
        const parseTime = (t: string) => {
          const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
          if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };
        
        return sum + (parseTime(endTime) - parseTime(startTime));
      }, 0) / Math.max(weekNaps.length, 1);
      
      if (avgWeekDuration < 70 && todayLongNaps.length > 0) {
        return "Restorative nap today";
      }
    }
    
    // Check for wake window progression (4-5 month milestone)
    if (babyAge && babyAge >= 4 && babyAge <= 5 && currentActivity?.type === 'awake' && currentActivity.duration >= 120) {
      return "Wake windows extending (4–5 month progression)";
    }
    
    return null;
  }, [activities, currentActivity, babyAge, nightSleepStartHour, nightSleepEndHour]);

  // Format next action with confident language
  const getNextActionText = () => {
    if (!nextPrediction) return null;
    
    const isNapOrSleep = nextPrediction.activity.toLowerCase().includes('nap') || 
                         nextPrediction.activity.toLowerCase().includes('sleep');
    const isFeed = nextPrediction.activity.toLowerCase().includes('feed');
    
    // Parse countdown to determine if window is open
    const countdownMatch = nextPrediction.countdown.match(/(\d+)/);
    const minutesUntil = countdownMatch ? parseInt(countdownMatch[1]) : 0;
    const isNow = nextPrediction.countdown.toLowerCase().includes('now') || minutesUntil <= 5;
    
    if (isNow) {
      if (isFeed) {
        return {
          primary: "Feed window open",
          secondary: `Typical timing: ${nextPrediction.timeRange}`
        };
      }
      if (isNapOrSleep) {
        return {
          primary: "Nap window open",
          secondary: `Typical timing: ${nextPrediction.timeRange}`
        };
      }
    }
    
    // Not yet time
    if (isFeed) {
      return {
        primary: `Next: Feed`,
        secondary: `Typical timing: ${nextPrediction.timeRange} (${nextPrediction.countdown})`
      };
    }
    
    if (isNapOrSleep) {
      return {
        primary: `Next: Nap`,
        secondary: `Typical start: ${nextPrediction.timeRange} (${nextPrediction.countdown})`
      };
    }
    
    return {
      primary: nextPrediction.activity,
      secondary: `${nextPrediction.timeRange} · ${nextPrediction.countdown}`
    };
  };

  const stateLabel = getCurrentStateLabel();
  const nextAction = getNextActionText();

  if (!currentActivity && !nextPrediction) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Start logging to see what comes next.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* 1. Current State - largest, boldest */}
      {stateLabel && (
        <div>
          <p className="text-lg font-semibold text-foreground leading-tight">
            {stateLabel}
          </p>
        </div>
      )}

      {/* 2. Daily Verdict - one line, medium weight */}
      {dailyVerdict && (
        <p className="text-sm text-muted-foreground">
          {dailyVerdict}
        </p>
      )}

      {/* 3. Achievement Callout - subtle highlight, conditional */}
      {quietAchievement && (
        <div className="flex items-center gap-1.5 text-sm text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{quietAchievement}</span>
        </div>
      )}

      {/* 4. Next Action - clear, actionable */}
      {nextAction && (
        <button
          onClick={() => {
            if (onLogPrediction && nextPrediction) {
              const activityType = nextPrediction.activity.toLowerCase().includes('nap') || 
                                   nextPrediction.activity.toLowerCase().includes('sleep') 
                ? 'nap' 
                : 'feed';
              onLogPrediction(activityType);
            }
          }}
          className="w-full text-left py-2 -mx-2 px-2 rounded-strava-sm hover:bg-accent/5 active:bg-accent/10 transition-colors"
        >
          <p className="text-sm font-medium text-foreground">
            {nextAction.primary}
          </p>
          <p className="text-xs text-muted-foreground">
            {nextAction.secondary}
          </p>
        </button>
      )}

      {/* Sleep action buttons - only when sleeping */}
      {(currentActivity?.type === 'napping' || currentActivity?.type === 'sleeping') && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onWokeEarly}
            className="flex-1 py-2 text-xs font-semibold text-primary rounded-strava border border-primary
                       hover:bg-primary/5 active:bg-primary/10 transition-colors"
          >
            {currentActivity.isPastAnticipatedWake ? 'Awake' : 'Woke Early'}
          </button>
        </div>
      )}
    </div>
  );
};
