import { Compass, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuideEmptyStateProps {
  type: "no-household" | "needs-birthday";
  onGoToSettings?: () => void;
}

export const GuideEmptyState = ({ type, onGoToSettings }: GuideEmptyStateProps) => {
  if (type === "no-household") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-section-header mb-1">Set up your baby to see Rhythm</h2>
          <p className="text-body-muted mb-4">Add your baby's name and birthday to unlock personalized insights.</p>
          <Button onClick={() => onGoToSettings?.()}>Go to Settings</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-accent/20 border-y border-border/40">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-card-title">Set your baby's birthday for personalized guidance</p>
          <p className="text-label-sm">
            The Guide provides age-appropriate insights when we know your baby's age.
          </p>
          <Button
            size="sm"
            variant="default"
            onClick={() => onGoToSettings?.()}
            className="mt-2"
          >
            Go to Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
