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

  // Format duration - Strava style with big numbers
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return { value: mins.toString(), unit: 'min' };
    if (mins === 0) return { value: hours.toString(), unit: hours === 1 ? 'hr' : 'hrs' };
    return { value: `${hours}:${mins.toString().padStart(2, '0')}`, unit: '' };
  };

  // Get activity label - uppercase Strava style
  const getActivityLabel = () => {
    if (currentActivity.type === 'napping') return 'NAP TIME';
    if (currentActivity.type === 'sleeping') return 'NIGHT SLEEP';
    if (currentActivity.type === 'feeding') return 'FEEDING';
    return 'AWAKE';
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

  const duration = formatDuration(currentActivity.duration);

  return (
    <div className="space-y-0">
      {/* Main Activity Section - Strava style: full-width, edge-to-edge */}
      <div className="overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-primary">
              {getActivityIcon()}
            </div>
            <span className="text-xs text-muted-foreground">
              {getActivityLabel()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Started {currentActivity.startTime}
          </span>
        </div>
        
        {/* Big stat display - Strava's signature look */}
        <div className="px-4 pb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-stat-xl text-foreground">
              {duration.value}
            </span>
            {duration.unit && (
              <span className="text-lg font-medium text-muted-foreground">
                {duration.unit}
              </span>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            {currentActivity.statusText}
          </p>
        </div>
        
        {/* Action buttons - Strava style: clean, full-width */}
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <div className="flex mt-4 mx-4 mb-4 gap-3">
            <button
              onClick={onWokeEarly}
              className="flex-1 py-3 text-sm font-semibold text-primary rounded-full border border-primary
                         hover:bg-primary/5 active:bg-primary/10 transition-colors"
            >
              {currentActivity.isPastAnticipatedWake ? 'Mark Awake' : 'Woke Early'}
            </button>
            <button
              onClick={onStillAsleep}
              className="flex-1 py-3 text-sm font-semibold text-foreground rounded-full border border-border
                         hover:bg-accent/10 active:bg-accent/20 transition-colors"
            >
              Still Asleep
            </button>
          </div>
        )}
      </div>

      {/* What's Next - Clean card style */}
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
          className="w-full p-4 mt-2 mx-4 rounded-xl border border-border
                     hover:bg-accent/5 active:bg-accent/10 transition-colors text-left group"
          style={{ width: 'calc(100% - 2rem)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Up Next
              </p>
              <p className="text-base font-semibold text-foreground">
                {nextPrediction.activity}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextPrediction.countdown} · {nextPrediction.timeRange}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </div>
        </button>
      )}

      {/* Quick Actions */}
      {suggestions.length > 0 && (
        <div className="mt-4 px-4">
          <p className="text-xs text-muted-foreground mb-2">
            Quick Actions
          </p>
          <div className="space-y-2">
            {suggestions.slice(0, 2).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={suggestion.onClick}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/5 active:bg-accent/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center text-muted-foreground">
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
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
