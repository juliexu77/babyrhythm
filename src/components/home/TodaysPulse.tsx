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
}

export const TodaysPulse = ({
  deviations,
  biggestDeviation,
  onAdjustSchedule,
  babyName,
  babyAge,
  activities
}: TodaysPulseProps) => {
  const [explanation, setExplanation] = useState<string>('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  const getStatusBadge = (status: DeviationData['status']) => {
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-xl overflow-hidden transition-all ${
        needsAttention 
          ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
          : 'border-border'
      }`}>
        {/* Header */}
        <CollapsibleTrigger className={`w-full p-4 transition-colors ${
          needsAttention 
            ? 'bg-amber-500/10 hover:bg-amber-500/15' 
            : 'bg-accent/20 hover:bg-accent/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Today's Pulse
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {needsAttention && (
                <>
                  <Badge variant="destructive" className="text-[10px] px-2 py-0 animate-pulse">
                    Review
                  </Badge>
                  <AlertCircle className="w-4 h-4 text-amber-600 animate-bounce" />
                </>
              )}
              {hasDeviations && !needsAttention && (
                <Badge variant="default" className="text-[10px] px-2 py-0">
                  Update
                </Badge>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
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
                  {getStatusBadge(deviation.status)}
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  {deviation.details}
                </p>
              </div>
            ))}

            {/* View Rhythm Button */}
            {deviations.some(d => d.category === 'schedule' && d.hasDeviation) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAdjustSchedule}
                className="w-full text-xs"
              >
                View today's rhythm
              </Button>
            )}

            {/* What This Means Section */}
            {biggestDeviation && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    What This Means
                  </h4>
                </div>
                
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
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
