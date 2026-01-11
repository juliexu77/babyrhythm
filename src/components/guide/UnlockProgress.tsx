import { TrendingUp } from "lucide-react";

interface UnlockProgressProps {
  hasTier2Data: boolean;
  unlockPercent: number;
  required: { activities: number; feeds: number; naps: number };
  remaining: { activities: number; feeds: number; naps: number };
}

export const UnlockProgress = ({ 
  hasTier2Data, 
  unlockPercent, 
  required, 
  remaining 
}: UnlockProgressProps) => {
  return (
    <div className="p-4 bg-accent/20 border-y border-border/40 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-card-title">
          {hasTier2Data
            ? 'Learning patterns — insights unlock soon'
            : 'Starting to learn rhythm — keep logging'}
        </p>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Unlock progress</span>
        <span className="text-foreground font-medium">{unlockPercent}%</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/60 via-primary to-primary transition-all duration-500 ease-out"
          style={{ width: `${unlockPercent}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="px-2 py-1 rounded bg-background border border-border/50">
          {required.activities - remaining.activities}/{required.activities} activities
        </span>
        <span className="px-2 py-1 rounded bg-background border border-border/50">
          {required.feeds - remaining.feeds}/{required.feeds} feeds
        </span>
        <span className="px-2 py-1 rounded bg-background border border-border/50">
          {required.naps - remaining.naps}/{required.naps} daytime naps
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: logging today helps unlock personalized guidance and improves schedule accuracy.
      </p>
    </div>
  );
};
