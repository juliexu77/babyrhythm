import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Check } from "lucide-react";
import { 
  developmentalDomains, 
  calculateStage,
  type StageInfo
} from "@/data/developmentalStages";
import { useLocalStorage, StorageKeys } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

interface DevelopmentTableProps {
  ageInWeeks: number;
  babyName: string;
  calibrationFlags?: Record<string, number>;
}

interface DomainData {
  id: string;
  label: string;
  currentStage: StageInfo;
  stageNumber: number;
  totalStages: number;
  isEmerging: boolean;
  isAhead: boolean;
  color: string;
}

// Custom geometric icons for each domain - editorial feel
export const DomainIcon = ({ domainId, className }: { domainId: string; className?: string }) => {
  const baseClass = cn("w-5 h-5", className);
  
  switch (domainId) {
    case "sleep":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      );
    case "feeding":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
          <circle cx="6" cy="6" r="2" />
          <circle cx="12" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="12" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case "physical":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "fine-motor":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 21c-3.5 0-6-2.5-6-6V9c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v5" />
          <path d="M15 12V7c0-1.5 1-3 2.5-3S20 5.5 20 7v8c0 3.5-2.5 6-6 6" />
          <path d="M9 12V4.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5V12" />
        </svg>
      );
    case "language":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3a9 9 0 0 1 0 18" />
          <path d="M12 7v10" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="12" r="5" />
          <circle cx="15" cy="12" r="5" />
        </svg>
      );
    case "cognitive":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" />
        </svg>
      );
    case "emotional":
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 20c-4-4-8-6.5-8-10a4.5 4.5 0 0 1 8-2.5 4.5 4.5 0 0 1 8 2.5c0 3.5-4 6-8 10z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

export function DevelopmentTable({ 
  ageInWeeks, 
  babyName,
  calibrationFlags = {}
}: DevelopmentTableProps) {
  const navigate = useNavigate();
  const [reviewedDomains] = useLocalStorage<string[]>(StorageKeys.REVIEWED_DOMAINS, []);

  const domainData = useMemo(() => {
    return developmentalDomains.map((domain) => {
      const confirmedStage = calibrationFlags[domain.id];
      const stageResult = calculateStage(domain.id, ageInWeeks, confirmedStage);
      
      if (!stageResult) return null;

      const defaultResult = calculateStage(domain.id, ageInWeeks);
      const isAhead = confirmedStage !== undefined && 
        defaultResult && 
        confirmedStage > defaultResult.stageNumber;

      return {
        id: domain.id,
        label: domain.label,
        currentStage: stageResult.stage,
        stageNumber: stageResult.stageNumber,
        totalStages: domain.stages.length,
        isEmerging: stageResult.isEmerging,
        isAhead,
        color: domain.color
      } as DomainData;
    }).filter(Boolean) as DomainData[];
  }, [ageInWeeks, calibrationFlags]);

  const handleDomainClick = (domainId: string) => {
    navigate(`/guide/${domainId}`);
  };

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {babyName}'s Development
        </h2>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Tap any domain to view milestones and guidance
        </p>
      </div>

      {/* Domain Cards */}
      <div className="space-y-3 mt-6">
          {domainData.map((domain) => {
            const isReviewed = reviewedDomains.includes(domain.id);
            return (
              <button
                key={domain.id}
                onClick={() => handleDomainClick(domain.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4",
                  "bg-card border border-border/60",
                  "rounded-sm",
                  "transition-all duration-150",
                  "hover:border-border hover:shadow-sm",
                  "active:scale-[0.99]",
                  "text-left"
                )}
              >
                {/* Geometric Icon */}
                <div className="shrink-0 text-muted-foreground">
                  <DomainIcon domainId={domain.id} />
                </div>

                {/* Domain Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-sm text-foreground">
                      {domain.label}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {domain.currentStage.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Stage {domain.stageNumber} of {domain.totalStages}
                  </p>
                </div>

                {/* Reviewed Checkmark */}
                {isReviewed && (
                  <Check className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </button>
            );
          })}
      </div>
    </div>
  );
}
