import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Milk, Clock, ChevronDown, AlertCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { GrowthIndicators } from "@/components/home/GrowthIndicators";

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
  babyBirthday?: string;
  transitionInfo?: {
    isTransitioning: boolean;
    napCounts: {
      current: number;
      transitioning: number;
    };
  } | null;
}

export const TodaysPulse = ({
  deviations,
  biggestDeviation,
  onAdjustSchedule,
  babyName,
  babyAge,
  activities,
  babyBirthday,
  transitionInfo
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
          setExplanation('Unable to generate insights at this time. Please check your AI credits or try again later.');
          return;
        }

        if (data?.error) {
          console.error('AI error:', data.error);
          if (data.error.includes('credits') || data.error.includes('payment')) {
            setExplanation('💳 AI insights require credits. Please add credits to your workspace to enable personalized explanations.');
          } else {
            setExplanation('Unable to generate insights at this time. Please try again later.');
          }
          return;
        }

        if (data?.insight) {
          setExplanation(data.insight);
          sessionStorage.setItem(cacheKey, data.insight);
        }
      } catch (err) {
        console.error('Failed to fetch deviation explanation:', err);
        setExplanation('Unable to generate insights at this time. Please try again later.');
      } finally {
        setExplanationLoading(false);
      }
    };

    fetchExplanation();
  }, [biggestDeviation?.description, babyName, babyAge, activities]);

  const getStatusBadge = (status: DeviationData['status'], category?: string) => {
    // Show nap count for sleep
    if (category === 'sleep') {
      const todayNaps = activities.filter((a: any) => {
        const activityDate = new Date(a.logged_at || a.loggedAt);
        const today = new Date();
        return a.type === 'nap' && 
               activityDate.getDate() === today.getDate() &&
               activityDate.getMonth() === today.getMonth() &&
               activityDate.getFullYear() === today.getFullYear();
      }).length;
      return <Badge variant="secondary" className="text-xs">{todayNaps} nap{todayNaps !== 1 ? 's' : ''} so far</Badge>;
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
  
  // If no deviations, show "Everything looks normal" state
  const displayDeviations = deviations.length > 0 ? deviations : [
    {
      category: 'schedule' as const,
      status: 'normal' as const,
      icon: <Moon className="w-5 h-5" />,
      title: 'Sleep',
      details: 'On track',
      hasDeviation: false,
    },
    {
      category: 'feeding' as const,
      status: 'normal' as const,
      icon: <Milk className="w-5 h-5" />,
      title: 'Feeding',
      details: 'On track',
      hasDeviation: false,
    },
    {
      category: 'schedule' as const,
      status: 'normal' as const,
      icon: <Clock className="w-5 h-5" />,
      title: 'Schedule',
      details: 'On track',
      hasDeviation: false,
    },
  ];

  return (
    <div className="mx-2 mb-6 rounded-xl bg-card shadow-card border border-border overflow-hidden">
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        {/* Header */}
        <div className="px-4 py-5 border-b border-border/30">
          <CollapsibleTrigger className="w-full" onClick={() => setDetailsOpen(!detailsOpen)}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-serif font-medium text-foreground/70 uppercase tracking-wider">
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
            {displayDeviations.map((deviation, index) => (
              <div key={index}>
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
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* What This Means Section - Only show if there are actual deviations */}
      {hasDeviations && (
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
      
      {/* Growth Indicators at bottom of card */}
      <div className="border-t border-border/30">
        <GrowthIndicators 
          activities={activities} 
          babyBirthday={babyBirthday}
        />
      </div>
    </div>
  );
};
