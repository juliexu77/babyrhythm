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
    <div className="mx-4 mb-4">
      {/* Simple text section - no card chrome */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {getContextLine()}
      </p>

      {/* Woke up action - subtle inline button */}
      {shouldShowWakeUpAction && (
        <button
          onClick={onWakeUp}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Sun className="w-3.5 h-3.5" />
          Mark as awake
        </button>
      )}
    </div>
  );
};
