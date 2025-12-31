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
      <div className="mb-4">
        <div className="border-b border-border p-4">
          <p className="text-sm text-muted-foreground">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  // Format duration - Strava style compact
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return { value: mins.toString(), unit: 'm' };
    if (mins === 0) return { value: hours.toString(), unit: 'h' };
    return { value: `${hours}:${mins.toString().padStart(2, '0')}`, unit: '' };
  };

  // Get activity label - concise, data-forward
  const getActivityLabel = () => {
    if (currentActivity.type === 'napping') return 'Napping';
    if (currentActivity.type === 'sleeping') return 'Sleeping';
    if (currentActivity.type === 'feeding') return 'Feeding';
    return 'Awake';
  };

  // Get icon for current activity - smaller
  const getActivityIcon = () => {
    if (currentActivity.type === 'napping' || currentActivity.type === 'sleeping') {
      return <Moon className="w-4 h-4" />;
    }
    if (currentActivity.type === 'feeding') {
      return <Utensils className="w-4 h-4" />;
    }
    return <Sun className="w-4 h-4" />;
  };

  const duration = formatDuration(currentActivity.duration);

  return (
    <div className="space-y-0">
      {/* Main Activity Section - Strava style: compact, data-forward */}
      <div className="overflow-hidden">
        {/* Header - tighter */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="text-primary">
              {getActivityIcon()}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {getActivityLabel()}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground/70">
            {currentActivity.startTime}
          </span>
        </div>
        
        {/* Stat display - moderate size (36-48pt equivalent) */}
        <div className="px-4 pb-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-stat-lg font-semibold text-foreground tracking-tight">
              {duration.value}
            </span>
            {duration.unit && (
              <span className="text-base font-medium text-muted-foreground">
                {duration.unit}
              </span>
            )}
          </div>
        </div>

        {/* Status text - smaller, lighter */}
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground/80 leading-tight">
            {currentActivity.statusText}
          </p>
        </div>
        
        {/* Action buttons - Strava style: compact pills */}
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <div className="flex mt-2 mx-4 mb-3 gap-2">
            <button
              onClick={onWokeEarly}
              className="flex-1 py-2 text-xs font-semibold text-primary rounded-strava border border-primary
                         hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              {currentActivity.isPastAnticipatedWake ? 'Awake' : 'Woke Early'}
            </button>
            <button
              onClick={onStillAsleep}
              className="flex-1 py-2 text-xs font-semibold text-foreground rounded-strava border border-border
                         hover:bg-accent/10 active:bg-accent/20 transition-colors"
            >
              Still Sleeping
            </button>
          </div>
        )}
      </div>

      {/* What's Next - Compact card */}
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
          className="w-full p-3 mt-1 mx-4 rounded-strava border border-border/50
                     hover:bg-accent/5 active:bg-accent/10 transition-colors text-left group"
          style={{ width: 'calc(100% - 2rem)' }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Up next
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {nextPrediction.activity}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextPrediction.countdown} · {nextPrediction.timeRange}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        </button>
      )}

      {/* Quick Actions - tighter spacing */}
      {suggestions.length > 0 && (
        <div className="mt-2 px-4 pb-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
            Quick actions
          </p>
          <div className="space-y-1">
            {suggestions.slice(0, 2).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={suggestion.onClick}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between py-2 px-2.5 rounded-strava-sm border border-border/40 hover:bg-accent/5 active:bg-accent/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-muted-foreground">
                      {suggestion.icon}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground leading-tight">
                        {suggestion.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 leading-tight">
                        {suggestion.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
