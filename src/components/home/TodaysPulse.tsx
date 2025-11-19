import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Milk, Clock, ChevronDown, AlertCircle, CheckCircle, Lightbulb, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeviationData {
  category: 'sleep' | 'feeding' | 'schedule';
  status: 'normal' | 'needs-attention' | 'unusually-good';
  icon: React.ReactNode;
  title: string;
  details: string;
  hasDeviation: boolean;
}

interface TodaysPulseProps {
  deviations: DeviationData[];
  biggestDeviation?: {
    description: string;
    normal: string;
    actual: string;
    context?: string;
  };
  onAdjustSchedule?: () => void;
  babyName: string;
  babyAge?: number;
  activities: any[];
  isTransitioning?: boolean;
}

export const TodaysPulse = ({
  deviations,
  biggestDeviation,
  onAdjustSchedule,
  babyName,
  babyAge,
  activities,
  isTransitioning
}: TodaysPulseProps) => {
  const [explanation, setExplanation] = useState<string>('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true); // Open by default
  const [meaningOpen, setMeaningOpen] = useState(false); // Collapsed by default

  // Fetch AI explanation for biggest deviation
  useEffect(() => {
    if (!biggestDeviation) return;

    const today = new Date().toDateString();
    const cacheKey = `deviation-explanation-${today}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      setExplanation(cached);
      return;
    }

    const fetchExplanation = async () => {
      setExplanationLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-home-insights', {
          body: {
            insightType: 'deviation-explanation',
            activities: activities.slice(-50),
            babyName,
            babyAge,
            deviation: biggestDeviation
          }
        });

        if (error) {
          console.error('Error fetching deviation explanation:', error);
          return;
        }

        if (data?.insight) {
          setExplanation(data.insight);
          sessionStorage.setItem(cacheKey, data.insight);
        }
      } catch (err) {
        console.error('Failed to fetch deviation explanation:', err);
      } finally {
        setExplanationLoading(false);
      }
    };

    fetchExplanation();
  }, [biggestDeviation?.description, babyName, babyAge, activities]);

  const getStatusBadge = (status: DeviationData['status'], category?: string) => {
    // Show transitioning badge for sleep if nap transition is detected
    if (category === 'sleep' && isTransitioning) {
      return <Badge variant="default" className="text-xs">Transitioning</Badge>;
    }
    if (status === 'needs-attention') {
      return <Badge variant="destructive" className="text-xs">Needs attention</Badge>;
    }
    if (status === 'unusually-good') {
      return <Badge variant="default" className="text-xs">Unusually good</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Normal pace</Badge>;
  };

  const hasDeviations = deviations.some(d => d.hasDeviation);
  const needsAttention = deviations.some(d => d.status === 'needs-attention');
  const allNormalPace = deviations.every(d => d.status === 'normal');

  return (
    <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-3-dark to-card-ombre-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/20 overflow-hidden">
      {/* Header with status badge */}
      <div className="px-4 py-5 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
              Today's Pulse
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {needsAttention && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0 animate-pulse">
                Review
              </Badge>
            )}
            {hasDeviations && !needsAttention && (
              <Badge variant="default" className="text-[10px] px-2 py-0">
                Update
              </Badge>
            )}
            {allNormalPace && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                Normal pace
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Details - Open by default */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Details</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 space-y-3">
            {/* Categories */}
            {deviations.map((deviation, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 text-primary">
                      {deviation.icon}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {deviation.title}
                    </span>
                  </div>
                  {getStatusBadge(deviation.status, deviation.category)}
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  {deviation.details}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* What This Means Section - Collapsed by default */}
      {biggestDeviation && (
        <Collapsible open={meaningOpen} onOpenChange={setMeaningOpen}>
          <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-muted/20 transition-colors border-t border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-foreground">What This Means</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${meaningOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-5 pt-3">
              {explanationLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 w-full bg-muted rounded"></div>
                  <div className="h-3 w-5/6 bg-muted rounded"></div>
                  <div className="h-3 w-4/6 bg-muted rounded"></div>
                </div>
              ) : explanation ? (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {explanation}
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
