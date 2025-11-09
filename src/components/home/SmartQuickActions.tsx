import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "measure" | "photo";
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
}

export const SmartQuickActions = ({
  suggestions,
  onOpenAddActivity,
  activities = [],
  chatComponent
}: SmartQuickActionsProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Find the last feed and last nap for prefilling
  const lastFeed = activities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
  
  const lastNap = activities
    .filter(a => a.type === 'nap')
    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];

  // Create prefill activities with current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

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
      <div className="mx-2 mb-3 rounded-xl bg-gradient-to-b from-card-ombre-3-dark to-card-ombre-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-border/20 overflow-hidden">
        <div className="px-4 py-5">
          <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('nap', prefillNap)}
              className="w-full"
            >
              <span className="mr-2">+</span>
              Log Sleep
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAddActivity?.('feed', prefillFeed)}
              className="w-full"
            >
              <span className="mr-2">+</span>
              Log Feed
            </Button>
          </div>
          
          {chatComponent && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full mt-3 text-center group"
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
              <DialogTitle>AI Parenting Assistant</DialogTitle>
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
