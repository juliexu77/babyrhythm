import { useMemo, useState, useEffect, useCallback } from "react";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { 
  developmentalDomains, 
  calculateStage,
  type DomainConfig,
  type StageInfo
} from "@/data/developmentalStages";
import { DomainDetailModal } from "./DomainDetailModal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  currentStage: StageInfo;
  stageNumber: number;
  totalStages: number;
  isEmerging: boolean;
  isAhead: boolean;
  color: string;
}

interface CachedInsight {
  insight: string;
  ageInWeeks: number;
  stageNumber: number;
  timestamp: number;
}

// Cache expires after 7 days
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const getInsightCacheKey = (domainId: string): string => 
  `developmental_insight_${domainId}`;

// Custom geometric icons for each domain - editorial feel
const DomainIcon = ({ domainId, className }: { domainId: string; className?: string }) => {
  const baseClass = cn("w-5 h-5", className);
  
  switch (domainId) {
    case "sleep":
      // Half moon shape
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      );
    case "feeding":
      // Grid dots pattern
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
      // Circle outline
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "fine-motor":
      // Hand/palm simplified
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 21c-3.5 0-6-2.5-6-6V9c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v5" />
          <path d="M15 12V7c0-1.5 1-3 2.5-3S20 5.5 20 7v8c0 3.5-2.5 6-6 6" />
          <path d="M9 12V4.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5V12" />
        </svg>
      );
    case "language":
      // Half circle (speech bubble essence)
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3a9 9 0 0 1 0 18" />
          <path d="M12 7v10" />
        </svg>
      );
    case "social":
      // Two overlapping circles
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="12" r="5" />
          <circle cx="15" cy="12" r="5" />
        </svg>
      );
    case "cognitive":
      // Diamond/rhombus
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" />
        </svg>
      );
    case "emotional":
      // Heart simplified
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
  calibrationFlags = {},
  onConfirmMilestone,
  onDomainSelect
}: DevelopmentTableProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [insightDomainId, setInsightDomainId] = useState<string | null>(null);

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

  // AI Insight logic
  const getCachedInsight = useCallback((domain: DomainData): string | null => {
    try {
      const cacheKey = getInsightCacheKey(domain.id);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed: CachedInsight = JSON.parse(cached);
      const now = Date.now();
      
      if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      const weekBracket = Math.floor(ageInWeeks / 4);
      const cachedWeekBracket = Math.floor(parsed.ageInWeeks / 4);
      if (parsed.stageNumber !== domain.stageNumber || weekBracket !== cachedWeekBracket) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.insight;
    } catch {
      return null;
    }
  }, [ageInWeeks]);

  const cacheInsight = useCallback((domain: DomainData, insightText: string) => {
    try {
      const cacheKey = getInsightCacheKey(domain.id);
      const cached: CachedInsight = {
        insight: insightText,
        ageInWeeks,
        stageNumber: domain.stageNumber,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch {
      // Ignore storage errors
    }
  }, [ageInWeeks]);

  const fetchInsight = async (domain: DomainData, forceRefresh = false) => {
    if (!domain) return;
    
    if (!forceRefresh) {
      const cached = getCachedInsight(domain);
      if (cached) {
        setInsight(cached);
        setInsightDomainId(domain.id);
        return;
      }
    }
    
    setIsLoadingInsight(true);
    setInsight(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-developmental-insight', {
        body: {
          domainId: domain.id,
          domainLabel: domain.label,
          stageName: domain.currentStage.name,
          stageDescription: domain.currentStage.description,
          ageInWeeks,
          babyName,
          milestones: domain.currentStage.milestones,
          supportTips: domain.currentStage.supportTips
        }
      });

      if (error) {
        console.error('Error fetching insight:', error);
        return;
      }

      if (data?.insight) {
        setInsight(data.insight);
        setInsightDomainId(domain.id);
        cacheInsight(domain, data.insight);
      }
    } catch (err) {
      console.error('Failed to fetch insight:', err);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // Fetch insight when domain is selected
  useEffect(() => {
    if (selectedDomainData && selectedDomainData.id !== insightDomainId) {
      fetchInsight(selectedDomainData);
    }
  }, [selectedDomainData?.id]);

  // Reset insight when modal closes
  useEffect(() => {
    if (!selectedDomain) {
      setInsight(null);
      setInsightDomainId(null);
    }
  }, [selectedDomain]);

  const handleRefreshInsight = () => {
    if (selectedDomainData) {
      fetchInsight(selectedDomainData, true);
    }
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
        {domainData.map((domain) => (
          <button
            key={domain.id}
            onClick={() => setSelectedDomain(domain.id)}
            className={cn(
              "w-full flex items-center gap-4 p-4",
              "bg-card border border-border/60",
              "rounded-sm", // Sharp corners - minimal radius
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
                {/* Domain name - serif */}
                <span className="font-serif text-sm text-foreground">
                  {domain.label}
                </span>
                {/* Stage name - sans-serif */}
                <span className="text-sm text-muted-foreground truncate">
                  {domain.currentStage.name}
                </span>
              </div>
              {/* Stage info underneath */}
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Stage {domain.stageNumber} of {domain.totalStages}
              </p>
            </div>

            {/* Chevron */}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </button>
        ))}
      </div>

      {/* Domain Detail Modal with AI Insight */}
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
        insight={insight}
        isLoadingInsight={isLoadingInsight}
        onRefreshInsight={handleRefreshInsight}
      />
    </div>
  );
}
