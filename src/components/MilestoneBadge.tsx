import { Milestone } from "@/utils/milestoneDetection";
import { Trophy } from "lucide-react";

interface MilestoneBadgeProps {
  milestone: Milestone;
}

export const MilestoneBadge = ({ milestone }: MilestoneBadgeProps) => {
  return (
    <div className="flex items-center gap-2.5 bg-primary/10 rounded-strava px-3 py-2 mt-1.5">
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Trophy className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-xs font-medium text-primary">
        Congratulations, {milestone.title.toLowerCase()}
      </p>
    </div>
  );
};
