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
    <div className="mx-2 mb-4">
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-border/30">
        <span className="text-xs font-medium text-muted-foreground mr-auto">
          Quick log
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex-1 h-12"
        >
          <Milk className="w-5 h-5 mb-0.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex-1 h-12"
        >
          <Moon className="w-5 h-5 mb-0.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex-1 h-12"
        >
          <Droplet className="w-5 h-5 mb-0.5" />
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        Tap to log with current time—adjust details later if needed
      </p>
    </div>
  );
};
