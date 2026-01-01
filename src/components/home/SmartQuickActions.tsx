import { Button } from "@/components/ui/button";
import { Milk, Moon, Droplet } from "lucide-react";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "solids" | "photo";
  time: string;
  loggedAt?: string;
  timezone?: string;
  details: any;
}

interface SmartQuickActionsProps {
  suggestions: Array<{
    id: string;
    type: 'nap' | 'feed' | 'wake';
    title: string;
    subtitle: string;
    priority: number;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
  onOpenAddActivity?: (type?: 'feed' | 'nap', prefillActivity?: Activity) => void;
  activities?: Activity[];
  chatComponent?: React.ReactNode;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
  onQuickLog?: (type: 'feed' | 'nap' | 'diaper', time?: string) => void;
  isQuickLogging?: boolean;
}

export const SmartQuickActions = ({
  suggestions,
  onOpenAddActivity,
  activities = [],
  chatComponent,
  addActivity,
  onQuickLog,
  isQuickLogging
}: SmartQuickActionsProps) => {
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const handleQuickLog = (type: 'feed' | 'nap' | 'diaper') => {
    onQuickLog?.(type, currentTime);
  };

  return (
    <div className="mx-4 mb-4 rounded-strava-lg bg-card shadow-strava border border-border/10 overflow-hidden">
      <div className="px-4 py-4">
        <h3 className="text-label-xs uppercase tracking-caps text-muted-foreground/60 mb-3">
          Quick Log
        </h3>
        
        {/* Icon buttons for quick logging - Strava style */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickLog('feed')}
            disabled={isQuickLogging}
            className="flex-1 h-12 rounded-strava border-border/30 flex flex-col gap-0.5 shadow-strava-btn"
          >
            <Milk className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Feed</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickLog('nap')}
            disabled={isQuickLogging}
            className="flex-1 h-12 rounded-strava border-border/30 flex flex-col gap-0.5 shadow-strava-btn"
          >
            <Moon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Sleep</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickLog('diaper')}
            disabled={isQuickLogging}
            className="flex-1 h-12 rounded-strava border-border/30 flex flex-col gap-0.5 shadow-strava-btn"
          >
            <Droplet className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Diaper</span>
          </Button>
        </div>
        
        <p className="text-[10px] text-center text-muted-foreground/50">
          Tap to log with current time
        </p>
      </div>
    </div>
  );
};
