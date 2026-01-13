import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useHousehold } from "@/hooks/useHousehold";
import { useMilestoneCalibration } from "@/hooks/useMilestoneCalibration";
import { 
  developmentalDomains, 
  calculateStage,
  getDomainById,
  type StageInfo 
} from "@/data/developmentalStages";
import { supabase } from "@/integrations/supabase/client";
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

interface CachedInsight {
  insight: string;
  ageInWeeks: number;
  stageNumber: number;
  timestamp: number;
}

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const getInsightCacheKey = (domainId: string): string => 
  `developmental_insight_${domainId}`;

export default function GuideDomain() {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const { household, loading: householdLoading } = useHousehold();
  const { calibrationFlags, confirmMilestone } = useMilestoneCalibration();
  
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const babyName = household?.baby_name || 'Baby';
  const ageInWeeks = useMemo(() => {
    if (!household?.baby_birthday) return 0;
    return Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7));
  }, [household?.baby_birthday]);

  // Calculate all domain data
  const allDomains = useMemo(() => {
    return developmentalDomains.map((domain) => {
      const confirmedStage = calibrationFlags[domain.id];
      const stageResult = calculateStage(domain.id, ageInWeeks, confirmedStage);
      
      if (!stageResult) return null;

      return {
        id: domain.id,
        label: domain.label,
        currentStage: stageResult.stage,
        stageNumber: stageResult.stageNumber,
        totalStages: domain.stages.length,
        isEmerging: stageResult.isEmerging,
        color: domain.color
      } as DomainData;
    }).filter(Boolean) as DomainData[];
  }, [ageInWeeks, calibrationFlags]);

  const currentDomain = useMemo(() => {
    return allDomains.find(d => d.id === domainId) || null;
  }, [allDomains, domainId]);

  const domain = getDomainById(domainId || '');
  const nextStage = domain?.stages[(currentDomain?.stageNumber || 0)];

  // Progress calculation
  const progressPercent = currentDomain 
    ? (currentDomain.stageNumber / currentDomain.totalStages) * 100 
    : 0;
  
  // Check if milestone is confirmed
  const confirmedStage = domainId ? calibrationFlags[domainId] : undefined;
  const isConfirmed = confirmedStage !== undefined && currentDomain && confirmedStage >= currentDomain.stageNumber;
  const canConfirm = currentDomain && currentDomain.stageNumber < currentDomain.totalStages;

  // Insight caching
  const getCachedInsight = useCallback((domainData: DomainData): string | null => {
    try {
      const cacheKey = getInsightCacheKey(domainData.id);
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
      if (parsed.stageNumber !== domainData.stageNumber || weekBracket !== cachedWeekBracket) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.insight;
    } catch {
      return null;
    }
  }, [ageInWeeks]);

  const cacheInsight = useCallback((domainData: DomainData, insightText: string) => {
    try {
      const cacheKey = getInsightCacheKey(domainData.id);
      const cached: CachedInsight = {
        insight: insightText,
        ageInWeeks,
        stageNumber: domainData.stageNumber,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch {
      // Ignore storage errors
    }
  }, [ageInWeeks]);

  const fetchInsight = useCallback(async (domainData: DomainData, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedInsight(domainData);
      if (cached) {
        setInsight(cached);
        return;
      }
    }
    
    setIsLoadingInsight(true);
    setInsight(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-developmental-insight', {
        body: {
          domainId: domainData.id,
          domainLabel: domainData.label,
          stageName: domainData.currentStage.name,
          stageDescription: domainData.currentStage.description,
          ageInWeeks,
          babyName,
          milestones: domainData.currentStage.milestones,
          supportTips: domainData.currentStage.supportTips
        }
      });

      if (!error && data?.insight) {
        setInsight(data.insight);
        cacheInsight(domainData, data.insight);
      }
    } catch (err) {
      console.error('Failed to fetch insight:', err);
    } finally {
      setIsLoadingInsight(false);
    }
  }, [ageInWeeks, babyName, getCachedInsight, cacheInsight]);

  // Fetch insight when domain changes
  useEffect(() => {
    if (currentDomain) {
      setInsight(null);
      fetchInsight(currentDomain);
    }
  }, [currentDomain?.id]);

  const handleConfirm = () => {
    if (domainId && currentDomain && !isConfirmed) {
      confirmMilestone(domainId, currentDomain.stageNumber);
    }
  };

  const handleDomainChange = (newDomainId: string) => {
    navigate(`/guide/${newDomainId}`, { replace: true });
  };

  const handleBack = () => {
    navigate('/', { state: { activeTab: 'rhythm' } });
  };

  if (householdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!currentDomain) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Domain not found</p>
        <button onClick={handleBack} className="text-primary underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-base font-serif text-foreground">
          {currentDomain.label}
        </h1>

        {canConfirm ? (
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
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Domain Pills */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {allDomains.map((d) => (
            <button
              key={d.id}
              onClick={() => handleDomainChange(d.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                d.id === domainId
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
        <div className="px-4 py-5 space-y-6 pb-24">
          {/* Current Stage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">
                {currentDomain.currentStage.name}
              </h2>
              <span className="text-xs text-muted-foreground">
                Stage {currentDomain.stageNumber} of {currentDomain.totalStages}
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
              {currentDomain.currentStage.description}
            </p>
          </div>

          {/* What to Look For */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span>What to Look For</span>
            </div>
            <ul className="space-y-2">
              {currentDomain.currentStage.milestones.map((milestone, i) => (
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

          {/* Milestone Confirmation */}
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
              {currentDomain.currentStage.supportTips.map((tip, i) => (
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
          {currentDomain.isEmerging && (
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
                    <button
                      onClick={() => currentDomain && fetchInsight(currentDomain, true)}
                      className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                      aria-label="Refresh insight"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary/60" />
                    </button>
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
