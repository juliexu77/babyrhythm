import { Button } from "@/components/ui/button";
import { Moon, Sun, Utensils, Clock } from "lucide-react";

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
      <div className="px-6 py-8">
        <div className="rounded-3xl bg-card/60 backdrop-blur-sm p-6 shadow-soft">
          <p className="text-sm text-muted-foreground text-center">
            No recent activity detected
          </p>
        </div>
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

  // Get icon for current activity
  const getActivityIcon = () => {
    if (currentActivity.type === 'napping' || currentActivity.type === 'sleeping') {
      return <Moon className="w-6 h-6" />;
    }
    if (currentActivity.type === 'feeding') {
      return <Utensils className="w-6 h-6" />;
    }
    return <Sun className="w-6 h-6" />;
  };

  // Get soft gradient based on activity type
  const getActivityGradient = () => {
    if (currentActivity.type === 'napping' || currentActivity.type === 'sleeping') {
      return 'from-secondary/30 via-accent/20 to-transparent';
    }
    if (currentActivity.type === 'feeding') {
      return 'from-primary/20 via-secondary/15 to-transparent';
    }
    return 'from-accent/25 via-secondary/20 to-transparent';
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Main Status - Headspace inspired: warm, friendly, spacious */}
      <div className="rounded-[32px] bg-secondary/40 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            {getActivityIcon()}
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium text-foreground leading-tight">
              {currentActivity.statusText}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDuration(currentActivity.duration)} · since {currentActivity.startTime}
            </p>
          </div>
        </div>
        
        {/* Action buttons - friendly pill style */}
        {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={onWokeEarly}
              className="flex-1 py-3 px-5 rounded-full bg-card text-foreground text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              {currentActivity.isPastAnticipatedWake ? 'Mark awake' : 'Woke early'}
            </button>
            <button
              onClick={onStillAsleep}
              className="flex-1 py-3 px-5 rounded-full bg-card text-foreground text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              Still asleep
            </button>
          </div>
        )}
      </div>

      {/* What's Next - clean, tappable card */}
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
          className="w-full text-left"
        >
          <div className="rounded-[24px] bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              Coming up
            </p>
            <p className="text-base font-medium text-foreground">
              {nextPrediction.activity}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {nextPrediction.timeRange} · {nextPrediction.countdown}
            </p>
          </div>
        </button>
      )}

      {/* Suggestions - simple list style */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.slice(0, 2).map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={suggestion.onClick}
              className="w-full text-left"
            >
              <div className="flex items-center gap-4 p-4 rounded-[20px] bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-foreground/70">
                  {suggestion.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {suggestion.subtitle}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
