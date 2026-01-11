import { useMemo, useState } from "react";
import { 
  Moon, 
  Utensils, 
  Baby, 
  Hand, 
  MessageCircle, 
  Users, 
  Brain, 
  Heart 
} from "lucide-react";
import { 
  developmentalDomains, 
  calculateStage,
  type DomainConfig,
  type StageInfo
} from "@/data/developmentalStages";
import { DomainDetailModal } from "./DomainDetailModal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DevelopmentTableProps {
  ageInWeeks: number;
  babyName: string;
  calibrationFlags?: Record<string, number>; // domainId -> confirmed stage number
  onConfirmMilestone?: (domainId: string, stageNumber: number) => void;
}

interface DomainData {
  id: string;
  label: string;
  icon: React.ReactNode;
  currentStage: StageInfo;
  stageNumber: number;
  totalStages: number;
  isEmerging: boolean;
  isAhead: boolean;
  color: string;
}

const domainIcons: Record<string, React.ReactNode> = {
  sleep: <Moon className="h-5 w-5" />,
  feeding: <Utensils className="h-5 w-5" />,
  physical: <Baby className="h-5 w-5" />,
  "fine-motor": <Hand className="h-5 w-5" />,
  language: <MessageCircle className="h-5 w-5" />,
  social: <Users className="h-5 w-5" />,
  cognitive: <Brain className="h-5 w-5" />,
  emotional: <Heart className="h-5 w-5" />
};

export function DevelopmentTable({ 
  ageInWeeks, 
  babyName,
  calibrationFlags = {},
  onConfirmMilestone
}: DevelopmentTableProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Calculate current stage for each domain
  const domainData = useMemo(() => {
    return developmentalDomains.map((domain) => {
      const confirmedStage = calibrationFlags[domain.id];
      const stageResult = calculateStage(domain.id, ageInWeeks, confirmedStage);
      
      if (!stageResult) return null;

      // Check if ahead: user confirmed a stage higher than the default age-based stage
      const defaultResult = calculateStage(domain.id, ageInWeeks);
      const isAhead = confirmedStage !== undefined && 
        defaultResult && 
        confirmedStage > defaultResult.stageNumber;

      return {
        id: domain.id,
        label: domain.label,
        icon: domainIcons[domain.id],
        currentStage: stageResult.stage,
        stageNumber: stageResult.stageNumber,
        totalStages: domain.stages.length,
        isEmerging: stageResult.isEmerging,
        isAhead,
        color: domain.color
      } as DomainData;
    }).filter(Boolean) as DomainData[];
  }, [ageInWeeks, calibrationFlags]);

  // Separate emerging and ahead domains for summary
  const emergingDomains = domainData.filter(d => d.isEmerging);
  const aheadDomains = domainData.filter(d => d.isAhead);

  const selectedDomainData = useMemo(() => {
    if (!selectedDomain) return null;
    return domainData.find((d) => d.id === selectedDomain) || null;
  }, [selectedDomain, domainData]);

  // Navigation helpers for modal
  const currentIndex = selectedDomain 
    ? domainData.findIndex((d) => d.id === selectedDomain) 
    : -1;

  const handlePrevDomain = () => {
    if (currentIndex > 0) {
      setSelectedDomain(domainData[currentIndex - 1].id);
    }
  };

  const handleNextDomain = () => {
    if (currentIndex < domainData.length - 1) {
      setSelectedDomain(domainData[currentIndex + 1].id);
    }
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-serif font-medium text-foreground">
          {babyName}'s Development
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap any area to explore milestones
        </p>
      </div>

      {/* Summary Strip */}
      {(emergingDomains.length > 0 || aheadDomains.length > 0) && (
        <div className="mb-4 space-y-2">
          {aheadDomains.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success-muted border border-success/20">
              <div className="flex items-center gap-1.5 text-success">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs font-medium">Ahead</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aheadDomains.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDomain(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition-colors"
                  >
                    {d.icon}
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {emergingDomains.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1.5 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
                <span className="text-xs font-medium">Emerging</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {emergingDomains.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDomain(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {d.icon}
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Domain Grid */}
      <div className="grid grid-cols-2 gap-3">
        {domainData.map((domain) => (
          <button
            key={domain.id}
            onClick={() => setSelectedDomain(domain.id)}
            className="text-left active:scale-[0.98] transition-transform"
          >
            <Card className="relative p-4 h-full hover:border-border transition-colors">
              {/* Emerging indicator */}
              {domain.isEmerging && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-0">
                    Emerging
                  </Badge>
                </div>
              )}

              {/* Icon and Label */}
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-muted/50">
                  {domain.icon}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {domain.label}
                </span>
              </div>

              {/* Stage Name */}
              <div className="mb-2">
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {domain.currentStage.name}
                </p>
              </div>

              {/* Progress Dots */}
              <div className="flex gap-1">
                {Array.from({ length: domain.totalStages }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      i < domain.stageNumber 
                        ? "bg-primary" 
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Stage Number */}
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Stage {domain.stageNumber} of {domain.totalStages}
              </p>
            </Card>
          </button>
        ))}
      </div>

      {/* Domain Detail Modal */}
      <DomainDetailModal
        open={!!selectedDomain}
        onOpenChange={(open) => !open && setSelectedDomain(null)}
        domainData={selectedDomainData}
        ageInWeeks={ageInWeeks}
        babyName={babyName}
        onPrev={currentIndex > 0 ? handlePrevDomain : undefined}
        onNext={currentIndex < domainData.length - 1 ? handleNextDomain : undefined}
        onConfirmMilestone={onConfirmMilestone}
      />
    </div>
  );
}
