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

      return {
        id: domain.id,
        label: domain.label,
        icon: domainIcons[domain.id],
        currentStage: stageResult.stage,
        stageNumber: stageResult.stageNumber,
        totalStages: domain.stages.length,
        isEmerging: stageResult.isEmerging,
        color: domain.color
      } as DomainData;
    }).filter(Boolean) as DomainData[];
  }, [ageInWeeks, calibrationFlags]);

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

      {/* Domain Grid */}
      <div className="grid grid-cols-2 gap-3">
        {domainData.map((domain) => (
          <button
            key={domain.id}
            onClick={() => setSelectedDomain(domain.id)}
            className={cn(
              "relative p-4 rounded-xl text-left transition-all",
              "bg-card/80 hover:bg-card",
              "border border-border/50 hover:border-border",
              "shadow-sm hover:shadow-md",
              "active:scale-[0.98]"
            )}
          >
            {/* Emerging indicator */}
            {domain.isEmerging && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                  Emerging
                </span>
              </div>
            )}

            {/* Icon and Label */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                "bg-muted/50"
              )}>
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
