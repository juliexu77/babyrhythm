import { useState } from "react";
import { MissedActivitySuggestion } from "@/hooks/useMissedActivityDetection";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";

interface MissedActivityPromptProps {
  suggestion: MissedActivitySuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

export const MissedActivityPrompt = ({ 
  suggestion, 
  onAccept, 
  onDismiss 
}: MissedActivityPromptProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative mx-2 mb-4 rounded-xl overflow-hidden backdrop-blur-[6px] bg-background/60 shadow-[0_2px_12px_rgba(0,0,0,0.06)] animate-suggestion-float-in dark:bg-background/40 dusk:bg-background/50">
      {/* Left accent bar with shimmer */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/25 animate-suggestion-shimmer dark:bg-primary/20 dusk:bg-primary/22" />
      
      {/* Rose-mauve tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent dark:from-primary/6 dark:via-primary/4 dusk:from-primary/7 dusk:via-primary/5" />
      
      <div className="relative px-4 py-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Clock className="h-5 w-5 text-primary/70" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground mb-3">
              {suggestion.message}
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAccept}
                disabled={isLoading}
                className="border-0 bg-primary/90 text-primary-foreground hover:bg-primary"
              >
                {isLoading ? "Logging..." : "Yes, log it"}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                disabled={isLoading}
                className="border-0"
              >
                No
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Based on your regular patterns
            </p>
          </div>
          
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
