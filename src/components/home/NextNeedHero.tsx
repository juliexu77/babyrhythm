import { useState } from "react";
import { ChevronDown, ChevronUp, Moon, Milk, Clock, ChevronRight, Sun } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface NextNeedHeroProps {
  babyName: string;
  babyAge?: number;
  currentActivity: {
    type: 'napping' | 'sleeping' | 'awake' | 'feeding';
    duration: number; // minutes
    statusText: string;
    startTime: string;
  } | null;
  nextPrediction: {
    activity: string;
    timeRange: string;
    countdown: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  onLogActivity: (type: 'feed' | 'nap') => void;
  onWakeUp?: () => void;
  ageBasedWakeWindow?: string;
}

export const NextNeedHero = ({
  babyName,
  babyAge,
  currentActivity,
  nextPrediction,
  onLogActivity,
  onWakeUp,
  ageBasedWakeWindow = "2–2.5 hours"
}: NextNeedHeroProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const firstName = babyName?.split(' ')[0] || 'Baby';
  
    // Generate contextual middle line based on current state
  const getContextLine = () => {
    if (!currentActivity) {
      return "Start logging activities to see helpful predictions about what comes next.";
    }

    if (currentActivity.type === 'awake' && nextPrediction?.activity.toLowerCase().includes('nap')) {
      const awakeDurationHours = Math.floor(currentActivity.duration / 60);
      const awakeDurationMins = currentActivity.duration % 60;
      const awakeDisplay = awakeDurationHours > 0 
        ? `${awakeDurationHours}h ${awakeDurationMins}m` 
        : `${awakeDurationMins}m`;
      
      return `Most babies this age get sleepy after about ${ageBasedWakeWindow}. ${firstName} has been awake for ${awakeDisplay}, so they might be ready for a nap soon.`;
    }

    if (currentActivity.type === 'napping' || currentActivity.type === 'sleeping') {
      const sleepHours = Math.floor(currentActivity.duration / 60);
      const sleepMins = currentActivity.duration % 60;
      const sleepDisplay = sleepHours > 0 ? `${sleepHours}h ${sleepMins}m` : `${sleepMins}m`;
      return `${firstName} is sleeping right now (${sleepDisplay} so far). No need to do anything—just let them rest!`;
    }

    if (currentActivity.type === 'feeding') {
      return `${firstName} is eating right now. After feeding, they'll probably want some awake time or might get sleepy.`;
    }

    if (nextPrediction?.activity.toLowerCase().includes('feed')) {
      return `Based on what we've seen, ${firstName} usually gets hungry ${nextPrediction.timeRange}.`;
    }

    return `${firstName} is doing great! Keep logging activities and we'll learn their rhythm together.`;
  };

  const isAwake = currentActivity?.type === 'awake';
  const isSleeping = currentActivity?.type === 'napping' || currentActivity?.type === 'sleeping';
  const shouldShowNapAction = isAwake && nextPrediction?.activity.toLowerCase().includes('nap');
  const shouldShowFeedAction = nextPrediction?.activity.toLowerCase().includes('feed');
  const shouldShowWakeUpAction = isSleeping && onWakeUp;

  return (
    <div className="mx-4 mb-5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="py-3">
          {/* Header */}
          <h3 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            What's Next
          </h3>

          {/* Context line */}
          <p className="text-sm text-foreground/80 leading-relaxed">
            {getContextLine()}
          </p>

          {/* Woke up action */}
          {shouldShowWakeUpAction && (
            <button
              onClick={onWakeUp}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary/80 hover:bg-primary rounded-full transition-colors"
            >
              <Sun className="w-3.5 h-3.5" />
              Woke up
            </button>
          )}

          {/* Expand trigger */}
          <CollapsibleTrigger asChild>
            <button className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {isExpanded ? (
                <>
                  Hide details
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  View details
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </CollapsibleTrigger>

          {/* Collapsible details */}
          <CollapsibleContent>
            <div className="mt-4 pt-3 border-t border-border/30 space-y-3">
              {/* Awake timer */}
              {isAwake && currentActivity && (
                <div className="py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Time awake</p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {Math.floor(Math.max(0, currentActivity.duration) / 60)}h {Math.max(0, currentActivity.duration) % 60}m
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Since {currentActivity.startTime}
                  </p>
                </div>
              )}

              {/* Current activity if not awake */}
              {!isAwake && currentActivity && (
                <div className="py-2">
                  <div className="flex items-center gap-2 mb-1">
                    {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
                      <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    {currentActivity.type === 'feeding' && (
                      <Milk className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {currentActivity.type === 'napping' ? 'Napping' : 
                       currentActivity.type === 'sleeping' ? 'Sleeping' : 'Feeding'}
                    </p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums text-foreground">
                    {Math.floor(Math.max(0, currentActivity.duration) / 60)}h {Math.max(0, currentActivity.duration) % 60}m
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Since {currentActivity.startTime}
                  </p>
                </div>
              )}

              {/* Next feed prediction */}
              {nextPrediction && shouldShowFeedAction && (
                <div className="py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Milk className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Next feeding</p>
                  </div>
                  <p className="text-sm text-foreground">
                    Usually around {nextPrediction.timeRange}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {nextPrediction.countdown}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
