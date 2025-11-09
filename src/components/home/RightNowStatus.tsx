import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Milk, Sun } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  onOpenAddActivity?: (type?: 'feed' | 'nap', prefillActivity?: any) => void;
  chatComponent?: React.ReactNode;
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
  onOpenAddActivity,
  chatComponent
}: RightNowStatusProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Find the last feed and last nap for prefilling
  const lastFeed = activities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
  
  const lastNap = activities
    .filter(a => a.type === 'nap')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];

  // Create prefill activities with current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const prefillFeed = lastFeed ? {
    ...lastFeed,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastFeed.details,
      startTime: undefined, // Clear time-specific fields
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;

  const prefillNap = lastNap ? {
    ...lastNap,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastNap.details,
      startTime: currentTime, // Set start time to now for naps
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;
  
  const topSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
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
    <>
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 mb-4 shadow-sm">
        {/* Current Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Right Now
            </h3>
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
          <div className="mb-3 p-3 bg-background/60 rounded-lg border border-border/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                What's Next
              </p>
              {nextPrediction.confidence && (
                <Badge variant="secondary" className="text-xs">
                  {nextPrediction.confidence} confidence
                </Badge>
              )}
            </div>
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
        <div className="flex gap-2">
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

        {/* Suggested Actions Section */}
        {topSuggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Suggested Actions
            </h3>
            <div className="space-y-2">
              {topSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={suggestion.onClick}
                  className="w-full p-2.5 bg-accent/30 hover:bg-accent/50 rounded-lg border border-border transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-0.5">
                        {suggestion.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-border/40">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('nap', prefillNap)}
              className="w-full"
            >
              <span className="mr-2">+</span>
              Log Sleep
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('feed', prefillFeed)}
              className="w-full"
            >
              <span className="mr-2">+</span>
              Log Feed
            </Button>
          </div>
          
          {chatComponent && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full mt-3 text-center group"
            >
              <span className="text-sm text-primary font-medium underline decoration-2 underline-offset-4 inline-flex items-center gap-1 group-hover:opacity-80 transition-opacity">
                Ask Me Anything →
              </span>
            </button>
          )}
        </div>

      </div>
      
      {chatComponent && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle>AI Parenting Assistant</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {chatComponent}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
