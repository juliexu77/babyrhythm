import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Milk, Sun } from "lucide-react";

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
  activities
}: RightNowStatusProps) => {
  if (!currentActivity) {
    return (
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 mb-4">
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No recent activity detected</p>
          <p className="text-xs text-muted-foreground mt-1">Log an activity to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 mb-4 shadow-sm">
      {/* Current Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Right Now
          </h3>
          {nextPrediction?.confidence && (
            <Badge variant="secondary" className="text-xs">
              {nextPrediction.confidence} confidence
            </Badge>
          )}
        </div>
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
            <p className="text-xs text-muted-foreground">
              Started: {currentActivity.startTime}
            </p>
          </div>
        </div>
      </div>

      {/* Next Prediction */}
      {nextPrediction && (
        <div className="mb-4 p-3 bg-background/60 rounded-lg border border-border/40">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-foreground">
              {nextPrediction.activity}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {nextPrediction.countdown}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected: {nextPrediction.timeRange}
          </p>
        </div>
      )}

      {/* Proactive Action Buttons */}
      <div className="flex gap-2 mb-4">
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onWokeEarly}
              className="flex-1 text-xs"
            >
              {currentActivity.isPastAnticipatedWake ? 'Mark as awake' : 'Woke up early'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStillAsleep}
              className="flex-1 text-xs"
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

      {/* Sync Indicator at bottom */}
      <div className="pt-2 border-t border-border/20">
        <p className="text-xs text-muted-foreground text-center">
          Synced just now
        </p>
      </div>
    </div>
  );
};
