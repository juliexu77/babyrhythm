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
    <div className="mx-3 mb-4">
      {/* Thicker, more tactile container - reduced height, increased padding */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-b from-[hsl(18,42%,90%)] to-[hsl(15,38%,86%)] rounded-2xl border border-[hsl(18,30%,80%)]/40 shadow-[0_4px_14px_-4px_hsla(18,40%,45%,0.10),0_2px_6px_-2px_hsla(18,40%,45%,0.06)] dark:from-card dark:to-card dark:border-border/30 dark:shadow-none">
        <span className="text-[11px] font-medium text-[hsl(20,25%,45%)] dark:text-muted-foreground tracking-wide uppercase mr-auto">
          Quick log
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-white/60 hover:bg-white/80 border-[hsl(18,28%,78%)]/50 shadow-[0_2px_8px_-2px_hsla(18,35%,45%,0.08)] dark:bg-card dark:border-border/30 dark:hover:bg-accent/10"
        >
          <Milk className="w-4.5 h-4.5 text-[hsl(12,40%,50%)] dark:text-foreground/80" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-white/60 hover:bg-white/80 border-[hsl(18,28%,78%)]/50 shadow-[0_2px_8px_-2px_hsla(18,35%,45%,0.08)] dark:bg-card dark:border-border/30 dark:hover:bg-accent/10"
        >
          <Moon className="w-4.5 h-4.5 text-[hsl(18,35%,52%)] dark:text-foreground/80" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-white/60 hover:bg-white/80 border-[hsl(18,28%,78%)]/50 shadow-[0_2px_8px_-2px_hsla(18,35%,45%,0.08)] dark:bg-card dark:border-border/30 dark:hover:bg-accent/10"
        >
          <Droplet className="w-4.5 h-4.5 text-[hsl(20,30%,48%)] dark:text-foreground/80" />
        </Button>
      </div>
      <p className="text-[10px] text-center text-[hsl(20,22%,52%)] dark:text-muted-foreground mt-2">
        Tap to log with current time—adjust details later if needed
      </p>
    </div>
  );
};
