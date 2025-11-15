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

  console.log('🧪 MissedActivityPrompt render', { suggestion });

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-3">
            {suggestion.message}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleAccept}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? "Logging..." : "Yes, log it"}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              disabled={isLoading}
              className="text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              No
            </Button>
          </div>
          
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 opacity-75">
            Based on your regular patterns
          </p>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
