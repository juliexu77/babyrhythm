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
    <div className="px-5 py-4 space-y-4">
      {/* Main Status Card - Calm inspired with soft gradients */}
      <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${getActivityGradient()} backdrop-blur-sm`}>
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        
        <div className="relative p-6 space-y-5">
          {/* Status Header with Icon */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-card/80 shadow-soft text-primary/80">
              {getActivityIcon()}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xl font-serif font-medium text-foreground leading-snug">
                {currentActivity.statusText}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(currentActivity.duration)}</span>
                <span className="text-muted-foreground/50">·</span>
                <span>since {currentActivity.startTime}</span>
              </div>
            </div>
          </div>
          
          {/* Proactive Actions - Soft pill buttons */}
          {(currentActivity.type === 'napping' || currentActivity.type === 'sleeping') && (
            <div className="flex gap-2.5">
              <button
                onClick={onWokeEarly}
                className="flex-1 py-2.5 px-4 rounded-full bg-card/70 text-sm text-foreground/80 hover:bg-card hover:text-foreground transition-all duration-200 shadow-sm"
              >
                {currentActivity.isPastAnticipatedWake ? 'Mark awake' : 'Woke early'}
              </button>
              <button
                onClick={onStillAsleep}
                className="flex-1 py-2.5 px-4 rounded-full bg-card/70 text-sm text-foreground/80 hover:bg-card hover:text-foreground transition-all duration-200 shadow-sm"
              >
                Still asleep
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What's Next Card - Gentle, inviting */}
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
          className="w-full text-left group"
        >
          <div className="rounded-[24px] bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:bg-card/70 hover:shadow-soft">
            <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
              Coming Up
            </p>
            <p className="text-lg font-serif text-foreground/90 leading-snug group-hover:text-foreground transition-colors">
              {nextPrediction.activity}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-muted-foreground">{nextPrediction.timeRange}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary/80">
                {nextPrediction.countdown}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* Suggestions - Soft, actionable cards */}
      {suggestions.length > 0 && (
        <div className="space-y-2.5">
          {suggestions.slice(0, 2).map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={suggestion.onClick}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 hover:bg-card/60 transition-all duration-200">
                <div className="p-2 rounded-xl bg-secondary/30 text-foreground/60 group-hover:text-foreground/80 transition-colors">
                  {suggestion.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
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
