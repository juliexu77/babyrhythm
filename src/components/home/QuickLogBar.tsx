import { Button } from "@/components/ui/button";
import { Moon, Milk, Droplet } from "lucide-react";
import { format } from "date-fns";

interface QuickLogBarProps {
  onLogActivity: (type: 'feed' | 'nap' | 'diaper', time?: string) => void;
  isLoading?: boolean;
}

export const QuickLogBar = ({ onLogActivity, isLoading }: QuickLogBarProps) => {
  const currentTime = format(new Date(), 'h:mm a');

  const handleQuickLog = (type: 'feed' | 'nap' | 'diaper') => {
    onLogActivity(type, currentTime);
  };

  return (
    <div className="mx-4 mb-5">
      {/* Strava-style action bar - bold labels, clean layout */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-3 
                     bg-card border border-border rounded-strava
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50
                     dark:bg-card dark:border-border/50
                     dusk:bg-card dusk:border-border/50"
        >
          <Milk className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Feed
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-3 
                     bg-card border border-border rounded-strava
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50
                     dark:bg-card dark:border-border/50
                     dusk:bg-card dusk:border-border/50"
        >
          <Moon className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Sleep
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-3 
                     bg-card border border-border rounded-strava
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50
                     dark:bg-card dark:border-border/50
                     dusk:bg-card dusk:border-border/50"
        >
          <Droplet className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Diaper
          </span>
        </button>
      </div>
    </div>
  );
};
