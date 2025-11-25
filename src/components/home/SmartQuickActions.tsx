import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const handleQuickLog = (type: 'feed' | 'nap' | 'diaper') => {
    onQuickLog?.(type, currentTime);
  };

  // Find the last feed and last nap for prefilling (kept for backward compatibility but not used in new UI)
  const lastFeed = activities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
  
  const lastNap = activities
    .filter(a => a.type === 'nap')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];

  // Create prefill activities with current time
  const now = new Date();

  const prefillFeed = lastFeed ? {
    ...lastFeed,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastFeed.details,
      startTime: undefined, // Clear time-specific fields
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;

  const prefillNap = lastNap ? {
    ...lastNap,
    id: '', // Clear ID so it creates a new activity
    time: currentTime,
    loggedAt: now.toISOString(),
    details: {
      ...lastNap.details,
      startTime: currentTime, // Set start time to now for naps
      endTime: undefined,
      displayTime: currentTime
    }
  } : undefined;

  return (
    <>
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-1 to-card-ombre-1-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-border/20 overflow-hidden">
        <div className="px-4 py-5">
          <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          
          {/* Icon buttons for quick logging */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickLog('feed')}
              disabled={isQuickLogging}
              className="flex-1 h-12 border-0"
            >
              <Milk className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickLog('nap')}
              disabled={isQuickLogging}
              className="flex-1 h-12 border-0"
            >
              <Moon className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickLog('diaper')}
              disabled={isQuickLogging}
              className="flex-1 h-12 border-0"
            >
              <Droplet className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground mb-3">
            Tap to log with current time—adjust details later if needed
          </p>

          {chatComponent && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full text-center group"
            >
              <span className="text-sm text-primary font-medium underline decoration-2 underline-offset-4 inline-flex items-center gap-1 group-hover:opacity-80 transition-opacity">
                Ask Me Anything →
              </span>
            </button>
          )}
        </div>
      </div>

      {chatComponent && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
            <DialogHeader className="p-4 pb-3 border-b">
              <DialogTitle>Parenting Coach</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {chatComponent}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
