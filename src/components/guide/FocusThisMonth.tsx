import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ChevronRight } from "lucide-react";
import { 
  developmentalDomains, 
  calculateStage,
  type StageInfo
} from "@/data/developmentalStages";
import { cn } from "@/lib/utils";

interface FocusThisMonthProps {
  ageInWeeks: number;
  babyName: string;
  onDomainSelect?: (domainId: string) => void;
}

interface FocusDomain {
  id: string;
  label: string;
  stage: StageInfo;
  stageNumber: number;
  isEmerging: boolean;
}

export function FocusThisMonth({ 
  ageInWeeks, 
  babyName,
  onDomainSelect 
}: FocusThisMonthProps) {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  // Get domains with emerging stages (priority focus areas)
  const focusDomains = useMemo(() => {
    return developmentalDomains
      .map((domain) => {
        const result = calculateStage(domain.id, ageInWeeks);
        if (!result) return null;
        return {
          id: domain.id,
          label: domain.label,
          stage: result.stage,
          stageNumber: result.stageNumber,
          isEmerging: result.isEmerging
        } as FocusDomain;
      })
      .filter(Boolean) as FocusDomain[];
  }, [ageInWeeks]);

  // Prioritize emerging domains, then take top 3
  const priorityDomains = useMemo(() => {
    const emerging = focusDomains.filter(d => d.isEmerging);
    const stable = focusDomains.filter(d => !d.isEmerging);
    return [...emerging, ...stable].slice(0, 4);
  }, [focusDomains]);

  // Get milestones for selected or default domain
  const activeDomain = useMemo(() => {
    const targetId = selectedFilter || priorityDomains[0]?.id;
    return focusDomains.find(d => d.id === targetId);
  }, [selectedFilter, priorityDomains, focusDomains]);

  const milestones = activeDomain?.stage.milestones || [];
  const tips = activeDomain?.stage.supportTips || [];

  return (
    <div className="px-4 py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Focus This Month
        </h3>
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
      </div>

      {/* Domain Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {priorityDomains.map((domain) => (
          <button
            key={domain.id}
            onClick={() => setSelectedFilter(domain.id === selectedFilter ? null : domain.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              "border",
              domain.id === selectedFilter || (!selectedFilter && domain.id === priorityDomains[0]?.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {domain.label}
            {domain.isEmerging && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            )}
          </button>
        ))}
      </div>

      {/* Active Domain Card */}
      {activeDomain && (
        <Card className="p-4 mt-2">
          {/* Stage Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {activeDomain.stage.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stage {activeDomain.stageNumber} • {activeDomain.stage.ageRange}
              </p>
            </div>
            {activeDomain.isEmerging && (
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                Emerging
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {activeDomain.stage.description}
          </p>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase mb-2">
                What to Look For
              </p>
              <ul className="space-y-1.5">
                {milestones.slice(0, 3).map((milestone, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    {milestone}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Support Tips */}
          {tips.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase mb-2">
                How to Support
              </p>
              <ul className="space-y-1.5">
                {tips.slice(0, 2).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View More Button */}
          {onDomainSelect && (
            <button
              onClick={() => onDomainSelect(activeDomain.id)}
              className="flex items-center justify-center gap-1 w-full mt-4 pt-3 border-t border-border text-xs text-primary font-medium"
            >
              View full {activeDomain.label.toLowerCase()} guide
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </Card>
      )}

      {/* AI Insight Placeholder */}
      {isLoadingInsight ? (
        <Card className="p-4 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-full mb-1.5" />
          <Skeleton className="h-3 w-3/4" />
        </Card>
      ) : insight && (
        <Card className="p-4 mt-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-medium tracking-wide text-primary uppercase">
              AI Insight
            </span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {insight}
          </p>
        </Card>
      )}
    </div>
  );
}
