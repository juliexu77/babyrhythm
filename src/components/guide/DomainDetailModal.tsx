import { useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Lightbulb,
  Target,
  Sparkles
} from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  getDomainById,
  type StageInfo 
} from "@/data/developmentalStages";
import { cn } from "@/lib/utils";

interface DomainData {
  id: string;
  label: string;
  icon: React.ReactNode;
  currentStage: StageInfo;
  stageNumber: number;
  totalStages: number;
  isEmerging: boolean;
  color: string;
}

interface DomainDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainData: DomainData | null;
  ageInWeeks: number;
  babyName: string;
  onPrev?: () => void;
  onNext?: () => void;
  onConfirmMilestone?: (domainId: string, stageNumber: number) => void;
  confirmedStage?: number;
}

export function DomainDetailModal({
  open,
  onOpenChange,
  domainData,
  ageInWeeks,
  babyName,
  onPrev,
  onNext,
  onConfirmMilestone,
  confirmedStage
}: DomainDetailModalProps) {
  if (!domainData) return null;

  const domain = getDomainById(domainData.id);
  const nextStage = domain?.stages[domainData.stageNumber]; // 0-indexed, so stageNumber gives next

  // Progress calculation
  const progressPercent = (domainData.stageNumber / domainData.totalStages) * 100;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {/* Navigation Header */}
        <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className={cn(
              "p-2 rounded-full transition-colors",
              onPrev 
                ? "hover:bg-muted active:bg-muted/80" 
                : "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted/50">
              {domainData.icon}
            </div>
            <DrawerTitle className="text-base font-serif">
              {domainData.label}
            </DrawerTitle>
          </div>

          <button
            onClick={onNext}
            disabled={!onNext}
            className={cn(
              "p-2 rounded-full transition-colors",
              onNext 
                ? "hover:bg-muted active:bg-muted/80" 
                : "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </DrawerHeader>

        {/* Content */}
        <div className="px-4 py-4 overflow-y-auto space-y-5">
          {/* Current Stage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                {domainData.currentStage.name}
              </h3>
              <span className="text-xs text-muted-foreground">
                Stage {domainData.stageNumber} of {domainData.totalStages}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Beginning</span>
                <span>Mastery</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {domainData.currentStage.description}
            </p>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span>What to Look For</span>
            </div>
            <ul className="space-y-2">
              {domainData.currentStage.milestones.map((milestone, i) => (
                <li 
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                  <span>{milestone}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Tips */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span>How to Support {babyName}</span>
            </div>
            <ul className="space-y-2">
              {domainData.currentStage.supportTips.map((tip, i) => (
                <li 
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Stage Preview */}
          {nextStage && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Coming Next: {nextStage.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Typically around {nextStage.ageRange[0]} weeks
              </p>
              <ul className="space-y-1">
                {nextStage.milestones.slice(0, 2).map((milestone, i) => (
                  <li 
                    key={i}
                    className="text-xs text-muted-foreground flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    {milestone}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Emerging Badge */}
          {domainData.isEmerging && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <p className="text-sm font-medium text-primary">
                🌱 Emerging Skills Ahead
              </p>
              <p className="text-xs text-muted-foreground">
                {babyName} is approaching the next stage! You may start noticing new skills soon.
              </p>
            </div>
          )}

          {/* Milestone Confirmation */}
          {onConfirmMilestone && domainData.stageNumber < domainData.totalStages && (
            confirmedStage && confirmedStage >= domainData.stageNumber ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                <Check className="h-4 w-4" />
                <span>Stage {confirmedStage} confirmed</span>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onConfirmMilestone(domainData.id, domainData.stageNumber)}
              >
                <Check className="h-4 w-4 mr-2" />
                I've seen these milestones
              </Button>
            )
          )}
        </div>

        {/* Close area for mobile */}
        <div className="px-4 py-3 border-t">
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
