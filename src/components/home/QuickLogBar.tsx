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
    <div className="px-4 py-4">
      {/* Strava-style pill buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex items-center gap-2 py-2.5 px-4 
                     rounded-full border border-border
                     bg-card hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
        >
          <Milk className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Feed
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex items-center gap-2 py-2.5 px-4 
                     rounded-full border border-border
                     bg-card hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
        >
          <Moon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Sleep
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex items-center gap-2 py-2.5 px-4 
                     rounded-full border border-border
                     bg-card hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
        >
          <Droplet className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold uppercase tracking-caps text-foreground">
            Diaper
          </span>
        </button>
      </div>
    </div>
  );
};
