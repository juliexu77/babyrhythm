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
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-4 
                     rounded-strava bg-primary hover:bg-primary/90 active:bg-primary/80 
                     shadow-strava-btn transition-colors disabled:opacity-50"
        >
          <Milk className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
          <span className="text-label-sm text-primary-foreground">
            Feed
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-4 
                     rounded-strava bg-primary hover:bg-primary/90 active:bg-primary/80 
                     shadow-strava-btn transition-colors disabled:opacity-50"
        >
          <Moon className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
          <span className="text-label-sm text-primary-foreground">
            Sleep
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-4 
                     rounded-strava bg-primary hover:bg-primary/90 active:bg-primary/80 
                     shadow-strava-btn transition-colors disabled:opacity-50"
        >
          <Droplet className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
          <span className="text-label-sm text-primary-foreground">
            Diaper
          </span>
        </button>
      </div>
    </div>
  );
};
