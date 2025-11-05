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
  
  const topSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

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

  if (topSuggestions.length === 0) {
    return (
      <>
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-3 gap-2">
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
            {chatComponent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChatOpen(true)}
                className="w-full"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
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
  }

  return (
    <>
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
          Suggested Actions
        </h3>
        <div className="space-y-2">
          {topSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={suggestion.onClick}
              className="w-full p-3 bg-accent/30 hover:bg-accent/50 rounded-lg border border-border transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-0.5">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.subtitle}
                  </p>
                </div>
              </div>
            </button>
          ))}
          
          <div className="grid grid-cols-3 gap-2 pt-2">
            {topSuggestions.length < 3 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAddActivity?.('nap', prefillNap)}
                  className="w-full"
                >
                  <span className="mr-2">+</span>
                  Log Sleep
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAddActivity?.('feed', prefillFeed)}
                  className="w-full"
                >
                  <span className="mr-2">+</span>
                  Log Feed
                </Button>
              </>
            )}
            {chatComponent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(true)}
                className="w-full col-span-1"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </Button>
            )}
          </div>
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
