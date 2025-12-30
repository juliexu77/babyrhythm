import { Moon, Sun, Utensils, ChevronRight, Clock } from "lucide-react";

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
  onStillAsleep,
  onStartNap,
  onEndFeed,
  babyName,
  babyAge,
  activities,
  suggestions = [],
  onAddFeed,
  onLogPrediction,
  nightSleepStartHour,
  nightSleepEndHour
}: RightNowStatusProps) => {
    
  if (!currentActivity) {
    return (
      <div className="px-4 py-6">
        <div className="border-b border-border/30 pb-4">
          <p className="text-sm text-muted-foreground">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  // Format duration into readable text
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return { value: mins, unit: 'min' };
    if (mins === 0) return { value: hours, unit: hours === 1 ? 'hr' : 'hrs' };
    return { value: `${hours}:${mins.toString().padStart(2, '0')}`, unit: 'hrs' };
  };

  // Get icon for current activity
  const getActivityIcon = () => {
    if (currentActivity.type === 'napping' || currentActivity.type === 'sleeping') {
      return <Moon className="w-5 h-5" />;
    }
    if (currentActivity.type === 'feeding') {
      return <Utensils className="w-5 h-5" />;
    }
    return <Sun className="w-5 h-5" />;
  };

  // Get activity label
  const getActivityLabel = () => {
    if (currentActivity.type === 'napping') return 'Nap';
    if (currentActivity.type === 'sleeping') return 'Night Sleep';
    if (currentActivity.type === 'feeding') return 'Feeding';
    return 'Awake';
  };

  const duration = formatDuration(currentActivity.duration);

  return (
    <div className="px-4 py-2">
      {/* Main Activity - Strava style: big numbers, clean layout */}
      <div className="border-b border-border/30 pb-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {getActivityIcon()}
            <span className="text-sm font-medium uppercase tracking-wide">
              {getActivityLabel()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Started {currentActivity.startTime}
          </span>
        </div>
        
        {/* Big stat display */}
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {duration.value}
          </span>
          <span className="text-lg text-muted-foreground font-medium">
            {duration.unit}
          </span>
        </div>

        {/* Status text */}
        <p className="text-sm text-muted-foreground mb-4">
          {currentActivity.statusText}
        </p>
        
        {/* Action buttons - Strava style: bold, full-width options */}
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <div className="flex gap-2">
            <button
              onClick={onWokeEarly}
              className="flex-1 py-3 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              {currentActivity.isPastAnticipatedWake ? 'Mark Awake' : 'Woke Early'}
            </button>
            <button
              onClick={onStillAsleep}
              className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground text-sm font-semibold"
            >
              Still Asleep
            </button>
          </div>
        )}
      </div>

      {/* What's Next - Activity feed item style */}
      {nextPrediction && (
        <button
          onClick={() => {
            if (onLogPrediction) {
              const activityType = nextPrediction.activity.toLowerCase().includes('nap') || 
                                   nextPrediction.activity.toLowerCase().includes('sleep') 
                ? 'nap' 
                : 'feed';
              onLogPrediction(activityType);
            }
          }}
          className="w-full text-left border-b border-border/30 pb-4 mb-4 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Up Next
              </p>
              <p className="text-base font-semibold text-foreground">
                {nextPrediction.activity}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextPrediction.countdown} · {nextPrediction.timeRange}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </button>
      )}

      {/* Suggestions - Simple list items */}
      {suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </p>
          {suggestions.slice(0, 2).map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={suggestion.onClick}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between py-3 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
                    {suggestion.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
