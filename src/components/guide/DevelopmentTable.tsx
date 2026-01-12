import { useMemo, useState } from "react";
import { 
  Moon, 
  Utensils, 
  Baby, 
  Hand, 
  MessageCircle, 
  Users, 
  Brain, 
  Heart,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { 
  developmentalDomains, 
  calculateStage,
  type DomainConfig,
  type StageInfo
} from "@/data/developmentalStages";
import { DomainDetailModal } from "./DomainDetailModal";
import { cn } from "@/lib/utils";

interface DevelopmentTableProps {
  ageInWeeks: number;
  babyName: string;
  calibrationFlags?: Record<string, number>;
  onConfirmMilestone?: (domainId: string, stageNumber: number) => void;
  onDomainSelect?: (domainId: string) => void;
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
  sleep: <Moon className="h-4 w-4" />,
  feeding: <Utensils className="h-4 w-4" />,
  physical: <Baby className="h-4 w-4" />,
  "fine-motor": <Hand className="h-4 w-4" />,
  language: <MessageCircle className="h-4 w-4" />,
  social: <Users className="h-4 w-4" />,
  cognitive: <Brain className="h-4 w-4" />,
  emotional: <Heart className="h-4 w-4" />
};

export function DevelopmentTable({ 
  ageInWeeks, 
  babyName,
  calibrationFlags = {},
  onConfirmMilestone,
  onDomainSelect
}: DevelopmentTableProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

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

  const selectedDomainData = useMemo(() => {
    if (!selectedDomain) return null;
    return domainData.find((d) => d.id === selectedDomain) || null;
  }, [selectedDomain, domainData]);

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
    <div className="px-4 py-6">
      {/* Header */}
      <h2 className="text-center text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase mb-6">
        {babyName}'s Development
      </h2>

      {/* Table Layout */}
      <div className="relative flex">
        {/* Left vertical label */}
        <div className="flex items-center justify-center w-5 shrink-0">
          <span className="text-[9px] font-medium tracking-[0.15em] text-muted-foreground/70 uppercase writing-vertical">
            Domains
          </span>
        </div>

        {/* Main table */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
          {domainData.map((domain, index) => (
            <button
              key={domain.id}
              onClick={() => setSelectedDomain(domain.id)}
              className={cn(
                "w-full flex items-center text-left transition-colors hover:bg-muted/30 active:bg-muted/50",
                index !== domainData.length - 1 && "border-b border-border"
              )}
            >
              {/* Domain icon + label column */}
              <div className="flex items-center gap-2 w-[120px] shrink-0 px-3 py-3.5 border-r border-border">
                <span className="text-muted-foreground">{domain.icon}</span>
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {domain.label}
                </span>
              </div>

              {/* Stage name column */}
              <div className="flex-1 px-4 py-3.5 border-r border-border">
                <span className="text-[15px] font-medium text-foreground">
                  {domain.currentStage.name}
                </span>
              </div>

              {/* Stage number + arrow column */}
              <div className="flex items-center justify-end gap-1 w-14 shrink-0 px-3 py-3.5">
                {domain.isEmerging && (
                  <TrendingUp className="h-3 w-3 text-primary" />
                )}
                <span className="text-[15px] text-muted-foreground tabular-nums">
                  {domain.stageNumber}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </button>
          ))}
        </div>

        {/* Right vertical label */}
        <div className="flex items-center justify-center w-5 shrink-0">
          <span className="text-[9px] font-medium tracking-[0.15em] text-muted-foreground/70 uppercase writing-vertical">
            Stage
          </span>
        </div>
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
        confirmedStage={selectedDomain ? calibrationFlags[selectedDomain] : undefined}
      />
    </div>
  );
}