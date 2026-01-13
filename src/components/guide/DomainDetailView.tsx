import { 
  ArrowLeft,
  Check, 
  Lightbulb,
  Target,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getDomainById,
  type StageInfo 
} from "@/data/developmentalStages";
import { cn } from "@/lib/utils";

interface DomainData {
  id: string;
  label: string;
  currentStage: StageInfo;
  stageNumber: number;
  totalStages: number;
  isEmerging: boolean;
  color: string;
}

interface DomainDetailViewProps {
  domainData: DomainData;
  allDomains: DomainData[];
  ageInWeeks: number;
  babyName: string;
  onBack: () => void;
  onDomainChange: (domainId: string) => void;
  onConfirmMilestone?: (domainId: string, stageNumber: number) => void;
  confirmedStage?: number;
  insight?: string | null;
  isLoadingInsight?: boolean;
  onRefreshInsight?: () => void;
}

export function DomainDetailView({
  domainData,
  allDomains,
  ageInWeeks,
  babyName,
  onBack,
  onDomainChange,
  onConfirmMilestone,
  confirmedStage,
  insight,
  isLoadingInsight,
  onRefreshInsight
}: DomainDetailViewProps) {
  const domain = getDomainById(domainData.id);
  const nextStage = domain?.stages[domainData.stageNumber];

  // Progress calculation
  const progressPercent = (domainData.stageNumber / domainData.totalStages) * 100;
  
  // Check if milestone is confirmed
  const isConfirmed = confirmedStage !== undefined && confirmedStage >= domainData.stageNumber;
  const canConfirm = onConfirmMilestone && domainData.stageNumber < domainData.totalStages;

  const handleConfirm = () => {
    if (onConfirmMilestone && !isConfirmed) {
      onConfirmMilestone(domainData.id, domainData.stageNumber);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden w-full" style={{ maxWidth: '100vw' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10 w-full box-border">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-base font-serif text-foreground">
          {domainData.label}
        </h1>

        {/* Confirm checkmark in top right */}
        {canConfirm && (
          <button
            onClick={handleConfirm}
            disabled={isConfirmed}
            className={cn(
              "p-2 -mr-2 rounded-full transition-colors",
              isConfirmed 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label={isConfirmed ? "Milestone confirmed" : "Confirm milestone"}
          >
            <Check className="h-5 w-5" />
          </button>
        )}
        
        {!canConfirm && <div className="w-9" />}
      </div>

      {/* Domain Pills */}
      <div className="px-4 py-3 border-b border-border bg-background overflow-hidden">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {allDomains.map((d) => (
            <button
              key={d.id}
              onClick={() => onDomainChange(d.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                d.id === domainData.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="py-5 space-y-6 pb-24" style={{ paddingLeft: '1rem', paddingRight: '1rem', maxWidth: 'calc(100vw - 2rem)', boxSizing: 'border-box' }}>
          {/* Current Stage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">
                {domainData.currentStage.name}
              </h2>
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

          {/* What to Look For */}
          <div className="space-y-3">
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

          {/* Milestone Confirmation - inline after What to Look For */}
          {canConfirm && (
            <div className={cn(
              "p-3 rounded-lg border transition-colors",
              isConfirmed 
                ? "bg-primary/5 border-primary/20" 
                : "bg-muted/30 border-border"
            )}>
              {isConfirmed ? (
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Check className="h-4 w-4" />
                  <span>Stage {confirmedStage} confirmed</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <div className="w-4 h-4 rounded border border-border flex items-center justify-center">
                    <Check className="h-3 w-3 opacity-0" />
                  </div>
                  <span>I've seen these milestones</span>
                </button>
              )}
            </div>
          )}

          {/* Support Tips */}
          <div className="space-y-3">
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
                  <span className="text-primary mt-1.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Stage Preview */}
          {nextStage && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Coming Next: {nextStage.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Typically around {nextStage.ageRange[0]} weeks
              </p>
              <ul className="space-y-1 mt-2">
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
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <p className="text-sm font-medium text-primary">
                🌱 Emerging Skills Ahead
              </p>
              <p className="text-xs text-muted-foreground">
                {babyName} is approaching the next stage! You may start noticing new skills soon.
              </p>
            </div>
          )}

          {/* AI Insight Section */}
          {(isLoadingInsight || insight) && (
            <div className="pt-2">
              {isLoadingInsight ? (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : insight && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-medium tracking-wide text-primary uppercase">
                        AI Insight
                      </span>
                    </div>
                    {onRefreshInsight && (
                      <button
                        onClick={onRefreshInsight}
                        className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                        aria-label="Refresh insight"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-primary/60" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {insight}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
