import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Milk, Clock, ChevronDown, AlertCircle, CheckCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInWeeks } from "date-fns";

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
  transitionInfo?: {
    isTransitioning: boolean;
    napCounts: {
      current: number;
      transitioning: number;
    };
  } | null;
  babyBirthday?: string;
}

// Known regression windows (in weeks)
const REGRESSION_WINDOWS = [
  { name: '4-month', startWeek: 13, endWeek: 18, description: 'Sleep patterns may shift as brain development accelerates' },
  { name: '8-month', startWeek: 29, endWeek: 34, description: 'New mobility and separation awareness can disrupt sleep' },
  { name: '12-month', startWeek: 47, endWeek: 54, description: 'Walking and language development may affect sleep routines' },
  { name: '18-month', startWeek: 71, endWeek: 78, description: 'Independence and new skills can temporarily impact rest' },
  { name: '24-month', startWeek: 95, endWeek: 104, description: 'Imagination and big emotions may influence sleep' }
];

const getRegressionInfo = (babyBirthday: string | undefined) => {
  if (!babyBirthday) return null;
  
  const ageInWeeks = differenceInWeeks(new Date(), new Date(babyBirthday));
  
  for (const window of REGRESSION_WINDOWS) {
    if (ageInWeeks >= window.startWeek && ageInWeeks <= window.endWeek) {
      return {
        name: window.name,
        description: window.description,
        ageInWeeks
      };
    }
  }
  
  return null;
};

export const TodaysPulse = ({
  deviations,
  biggestDeviation,
  onAdjustSchedule,
  babyName,
  babyAge,
  activities,
  transitionInfo,
  babyBirthday
}: TodaysPulseProps) => {
  const [explanation, setExplanation] = useState<string>('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true); // Open by default
  const [meaningOpen, setMeaningOpen] = useState(false); // Collapsed by default
  
  const regressionInfo = getRegressionInfo(babyBirthday);

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
    if (category === 'sleep' && transitionInfo?.isTransitioning && transitionInfo?.napCounts) {
      const { current, transitioning } = transitionInfo.napCounts;
      return <Badge variant="default" className="text-xs">Transitioning {current} &gt; {transitioning}</Badge>;
    }
    
    // More descriptive and less alarming badge for schedule deviations
    if (category === 'schedule' && status === 'needs-attention') {
      return <Badge variant="secondary" className="text-xs bg-[hsl(12,100%,93%)] text-[hsl(12,70%,45%)] border-[hsl(12,100%,88%)] hover:bg-[hsl(12,100%,90%)]">Off rhythm</Badge>;
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

  return (
    <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-3-dark to-card-ombre-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/20 overflow-hidden">
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        {/* Header */}
        <div className="px-4 py-5 border-b border-border/30">
          <CollapsibleTrigger className="w-full" onClick={() => setDetailsOpen(!detailsOpen)}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
                Today's Pulse
              </h3>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
        </div>

        {/* Main Details */}
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
            <div className="px-4 pb-5 pt-3 space-y-4">
              {/* Regression Window Message (if applicable) */}
              {regressionInfo && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                  <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                    {regressionInfo.name} regression window
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Your baby is in the {regressionInfo.name} regression window, where {regressionInfo.description.toLowerCase()}
                  </p>
                </div>
              )}
              
              {/* AI Explanation */}
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
    </div>
  );
};
