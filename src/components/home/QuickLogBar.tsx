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
    <div className="mb-0">
      {/* Strava-style action bar - full-width, no gaps */}
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-3 
                     border-r border-border
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
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
                     border-r border-border
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
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
                     hover:bg-accent/10 active:bg-accent/20 
                     transition-colors disabled:opacity-50"
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
