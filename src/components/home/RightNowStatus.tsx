import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Milk, Sun } from "lucide-react";
import { MissedActivityPrompt } from "@/components/MissedActivityPrompt";
import { MissedActivitySuggestion } from "@/hooks/useMissedActivityDetection";

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
  missedActivitySuggestion?: MissedActivitySuggestion | null;
  onAcceptMissedActivity?: () => Promise<void>;
  onDismissMissedActivity?: () => void;
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
  missedActivitySuggestion,
  onAcceptMissedActivity,
  onDismissMissedActivity,
  nightSleepStartHour,
  nightSleepEndHour
}: RightNowStatusProps) => {
  const topSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
    
  console.log('🔍 RightNowStatus:', { 
    missedActivitySuggestion, 
    hasAccept: !!onAcceptMissedActivity, 
    hasDismiss: !!onDismissMissedActivity 
  });
    
  if (!currentActivity) {
    return (
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-primary/20 via-primary/12 to-primary/5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-5">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No recent activity detected</p>
            <p className="text-xs text-muted-foreground mt-1">Log an activity to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-primary/20 via-primary/12 to-primary/5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-5">
          {/* Current Status */}
          <div className="mb-3">
            <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-2">
              Right Now
            </h3>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && <Moon className="w-5 h-5 text-primary" />}
              {currentActivity.type === 'feeding' && <Milk className="w-5 h-5 text-primary" />}
              {currentActivity.type === 'awake' && <Sun className="w-5 h-5 text-primary" />}
            </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {currentActivity.statusText}
            </p>
          </div>
          </div>
        </div>

        {/* Missed Activity Prompt - In Right Now section */}
        {missedActivitySuggestion && onAcceptMissedActivity && onDismissMissedActivity && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
              <MissedActivityPrompt
                suggestion={missedActivitySuggestion}
                onAccept={onAcceptMissedActivity}
                onDismiss={onDismissMissedActivity}
              />
            </div>
          </div>
        )}

        {/* What's Next - Moved above Suggested Actions */}
        {nextPrediction && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-2">
              What's Next
            </h3>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {nextPrediction.activity}
                </p>
                {nextPrediction.confidence && (
                  <Badge variant="secondary" className="text-xs">
                    {nextPrediction.confidence} confidence
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Expected: {nextPrediction.timeRange}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {nextPrediction.countdown}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {topSuggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-2">
              Suggested Actions
            </h3>
            <div className="space-y-3">
              {topSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.onClick}
                  className="w-full p-2.5 bg-muted/20 hover:bg-muted/40 rounded-lg border border-border/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {suggestion.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Proactive Action Buttons */}
        <div className="flex gap-2 mt-3">
          {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onWokeEarly}
                className="flex-1 text-sm border-0"
              >
                {currentActivity.isPastAnticipatedWake ? 'Mark as awake' : 'Woke up early'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onStillAsleep}
                className="flex-1 text-sm border-0"
              >
                Still asleep
              </Button>
            </>
          )}
          {currentActivity.type === 'awake' && nextPrediction?.activity.includes('Nap') && (
            <Button
              variant="default"
              size="sm"
              onClick={onStartNap}
              className="flex-1 text-xs"
            >
              Start nap timer
            </Button>
          )}
          {currentActivity.type === 'feeding' && (
            <Button
              variant="default"
              size="sm"
              onClick={onEndFeed}
              className="flex-1 text-xs"
            >
              End feed
            </Button>
          )}
        </div>
        </div>
      </div>
    </>
  );
};
