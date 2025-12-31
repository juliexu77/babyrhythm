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
                     rounded-lg bg-muted hover:bg-muted/80 active:bg-muted/60 
                     transition-colors disabled:opacity-50"
        >
          <Milk className="w-4 h-4 text-foreground/80" />
          <span className="text-sm font-medium text-foreground">
            Feed
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-4 
                     rounded-lg bg-muted hover:bg-muted/80 active:bg-muted/60 
                     transition-colors disabled:opacity-50"
        >
          <Moon className="w-4 h-4 text-foreground/80" />
          <span className="text-sm font-medium text-foreground">
            Sleep
          </span>
        </button>
        
        <button
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex items-center gap-1.5 py-2 px-4 
                     rounded-lg bg-muted hover:bg-muted/80 active:bg-muted/60 
                     transition-colors disabled:opacity-50"
        >
          <Droplet className="w-4 h-4 text-foreground/80" />
          <span className="text-sm font-medium text-foreground">
            Diaper
          </span>
        </button>
      </div>
    </div>
  );
};
