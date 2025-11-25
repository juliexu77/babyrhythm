import { useEffect, useState } from "react";
import { Activity } from "./ActivityCard";
import { Progress } from "./ui/progress";
import { Sparkles } from "lucide-react";

interface LearningProgressProps {
  activities: Activity[];
  babyName?: string;
  onRhythmUnlocked?: () => void;
}

export const LearningProgress = ({ activities, babyName, onRhythmUnlocked }: LearningProgressProps) => {
  const [hasUnlocked, setHasUnlocked] = useState(() => {
    return localStorage.getItem('rhythm_unlocked') === 'true';
  });

  const naps = activities.filter(a => a.type === 'nap');
  const feeds = activities.filter(a => a.type === 'feed');
  
  // Determine first activity type
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const firstActivity = sortedActivities[0];
  
  // If first activity was a feed, need 1 nap to show schedule
  // If first activity was a nap, schedule shows immediately
  const needsNapForSchedule = firstActivity?.type === 'feed' && naps.length === 0;
  
  const totalLogged = activities.length;
  
  // Predictions start after 1 nap - align UI with actual capability
  const hasMinNaps = naps.length >= 1;
  const isUnlocked = hasMinNaps;
  
  // Progress toward first nap if not unlocked yet
  const targetLogs = 1;
  const progress = hasMinNaps ? 100 : 0;
  const name = babyName?.split(' ')[0] || 'Baby';

  // Trigger unlock animation
  useEffect(() => {
    if (isUnlocked && !hasUnlocked) {
      setHasUnlocked(true);
      localStorage.setItem('rhythm_unlocked', 'true');
      onRhythmUnlocked?.();
    }
  }, [isUnlocked, hasUnlocked, onRhythmUnlocked]);

  if (isUnlocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-500">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <span className="text-xs font-medium text-primary">
          Pattern Tracking Active — {totalLogged} logs
        </span>
      </div>
    );
  }

  // Special message if first activity was feed and no nap yet
  if (needsNapForSchedule) {
    return (
      <div className="space-y-2 px-4 py-3 rounded-xl bg-accent/20 border border-border/40 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">
            Getting Started
          </span>
          <span className="text-xs text-muted-foreground">
            {totalLogged} log{totalLogged !== 1 ? 's' : ''}
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Log a nap to see {name}'s predicted schedule
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3 rounded-xl bg-card/50 border border-border/40 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          Getting started
        </span>
        <span className="text-xs text-muted-foreground">
          {totalLogged} log{totalLogged !== 1 ? 's' : ''}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Log a nap to unlock {name}'s schedule predictions
      </p>
    </div>
  );
};
