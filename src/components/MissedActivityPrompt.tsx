import { useState } from "react";
import { MissedActivitySuggestion } from "@/hooks/useMissedActivityDetection";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";

interface MissedActivityPromptProps {
  suggestion: MissedActivitySuggestion;
  onAccept: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}

export const MissedActivityPrompt = ({ 
  suggestion, 
  onAccept, 
  onEdit,
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
    <div className="p-4 bg-accent/30 border border-border rounded-strava">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-3">
            {suggestion.message}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleAccept}
              disabled={isLoading}
              className="rounded-strava"
            >
              {isLoading ? "Logging..." : "Yes, log it"}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              disabled={isLoading}
              className="rounded-strava"
            >
              Edit
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              disabled={isLoading}
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
  );
};
