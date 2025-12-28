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
      {/* Thicker, more tactile container - uses design system tokens */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-b from-card-ombre-1 to-card-ombre-1-dark rounded-2xl border border-border/40 shadow-card dark:from-card dark:to-card dark:border-border/30 dark:shadow-none dusk:from-card dusk:to-card dusk:border-border/30 dusk:shadow-none">
        <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mr-auto">
          Quick log
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('feed')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-background/60 hover:bg-background/80 border-border/50 shadow-soft dark:bg-card dark:border-border/30 dark:hover:bg-accent/10 dusk:bg-card dusk:border-border/30 dusk:hover:bg-accent/10"
        >
          <Milk className="w-4.5 h-4.5 text-primary dark:text-foreground/80 dusk:text-foreground/80" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('nap')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-background/60 hover:bg-background/80 border-border/50 shadow-soft dark:bg-card dark:border-border/30 dark:hover:bg-accent/10 dusk:bg-card dusk:border-border/30 dusk:hover:bg-accent/10"
        >
          <Moon className="w-4.5 h-4.5 text-muted-foreground dark:text-foreground/80 dusk:text-foreground/80" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickLog('diaper')}
          disabled={isLoading}
          className="flex-1 h-10 rounded-xl bg-background/60 hover:bg-background/80 border-border/50 shadow-soft dark:bg-card dark:border-border/30 dark:hover:bg-accent/10 dusk:bg-card dusk:border-border/30 dusk:hover:bg-accent/10"
        >
          <Droplet className="w-4.5 h-4.5 text-muted-foreground dark:text-foreground/80 dusk:text-foreground/80" />
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        Tap to log with current time—adjust details later if needed
      </p>
    </div>
  );
};
