import { Button } from "@/components/ui/button";

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
        <p className="text-sm text-muted-foreground text-center">
          No recent activity detected
        </p>
      </div>
    );
  }

  // Format duration into readable text
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Current Status - Typographic, minimal */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Right Now
        </p>
        <p className="text-2xl font-serif font-light text-foreground leading-tight">
          {currentActivity.statusText}
        </p>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {formatDuration(currentActivity.duration)} · since {currentActivity.startTime}
        </p>
        
        {/* Proactive Actions - Inline, minimal */}
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={onWokeEarly}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              {currentActivity.isPastAnticipatedWake ? 'Mark awake' : 'Woke early'}
            </button>
            <button
              onClick={onStillAsleep}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Still asleep
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent" />

      {/* What's Next - Editorial style */}
      {nextPrediction && (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            What's Next
          </p>
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
            className="w-full text-left group"
          >
            <p className="text-lg font-serif text-foreground/90 leading-snug group-hover:text-foreground transition-colors">
              {nextPrediction.activity}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-mono">{nextPrediction.timeRange}</span>
              <span className="mx-2">·</span>
              <span className="font-mono">{nextPrediction.countdown}</span>
            </p>
          </button>
        </div>
      )}

      {/* Suggested Actions - Minimal list */}
      {suggestions.length > 0 && (
        <>
          <div className="h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Suggestions
            </p>
            <div className="space-y-2">
              {suggestions.slice(0, 2).map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.onClick}
                  className="w-full text-left py-2 group"
                >
                  <p className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
