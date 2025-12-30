import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Milk, Clock, ChevronDown, ChevronRight, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDaytimeNap } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";

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
}

export const TodaysPulse = ({
  deviations,
  biggestDeviation,
  onAdjustSchedule,
  babyName,
  babyAge,
  activities,
  transitionInfo
}: TodaysPulseProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const [explanation, setExplanation] = useState<string>('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [meaningOpen, setMeaningOpen] = useState(false);

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
          setExplanation('Unable to generate insights at this time.');
          return;
        }

        if (data?.error) {
          console.error('AI error:', data.error);
          setExplanation('Unable to generate insights at this time.');
          return;
        }

        if (data?.insight) {
          setExplanation(data.insight);
          sessionStorage.setItem(cacheKey, data.insight);
        }
      } catch (err) {
        console.error('Failed to fetch deviation explanation:', err);
        setExplanation('Unable to generate insights at this time.');
      } finally {
        setExplanationLoading(false);
      }
    };

    fetchExplanation();
  }, [biggestDeviation?.description, babyName, babyAge, activities]);

  const getStatusLabel = (status: DeviationData['status'], category?: string) => {
    if (category === 'sleep') {
      const todayNaps = activities.filter((a: any) => {
        const activityDate = new Date(a.logged_at || a.loggedAt);
        const today = new Date();
        const isToday = activityDate.getDate() === today.getDate() &&
               activityDate.getMonth() === today.getMonth() &&
               activityDate.getFullYear() === today.getFullYear();
        return a.type === 'nap' && isToday && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour);
      }).length;
      return `${todayNaps} nap${todayNaps !== 1 ? 's' : ''}`;
    }
    
    if (status === 'needs-attention') return 'Off rhythm';
    if (status === 'unusually-good') return 'Great';
    return 'On track';
  };

  const hasDeviations = deviations.some(d => d.hasDeviation);
  
  // Default categories if none provided
  const displayDeviations = deviations.length > 0 ? deviations : [
    {
      category: 'sleep' as const,
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
    <div className="mx-4 mb-4">
      <div className="bg-card border border-border rounded-strava overflow-hidden">
        {/* Header - Strava style */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-caps text-muted-foreground">
            Today's Pulse
          </h3>
        </div>

        {/* Stats Grid - Strava activity summary style */}
        <div className="divide-y divide-border">
          {displayDeviations.map((deviation, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-primary">
                  {deviation.icon}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {deviation.title}
                </span>
              </div>
              <span className={`text-sm font-medium ${
                deviation.status === 'needs-attention' 
                  ? 'text-destructive' 
                  : deviation.status === 'unusually-good'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}>
                {getStatusLabel(deviation.status, deviation.category)}
              </span>
            </div>
          ))}
        </div>

        {/* What This Means - Expandable section */}
        {hasDeviations && (
          <Collapsible open={meaningOpen} onOpenChange={setMeaningOpen}>
            <CollapsibleTrigger className="w-full px-4 py-3 hover:bg-accent/5 transition-colors border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-caps text-muted-foreground">
                    What This Means
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${meaningOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-2">
                {explanationLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 w-full bg-muted rounded"></div>
                    <div className="h-3 w-5/6 bg-muted rounded"></div>
                    <div className="h-3 w-4/6 bg-muted rounded"></div>
                  </div>
                ) : explanation ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {explanation}
                  </p>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};
