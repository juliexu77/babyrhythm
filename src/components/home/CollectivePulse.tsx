import { useCollectivePulse } from "@/hooks/useCollectivePulse";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users } from "lucide-react";
import { useState } from "react";
import { differenceInWeeks } from "date-fns";

interface CollectivePulseProps {
  babyBirthday?: string;
  defaultOpen?: boolean;
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

export const CollectivePulse = ({ babyBirthday, defaultOpen = false }: CollectivePulseProps) => {
  const { data: cohortStats, isLoading } = useCollectivePulse(babyBirthday);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const regressionInfo = getRegressionInfo(babyBirthday);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div className="text-left">
              <h3 className="text-sm font-semibold text-foreground">Collective Pulse</h3>
              <p className="text-xs text-muted-foreground">Big-picture view</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border space-y-4">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : !cohortStats ? (
            <p className="text-sm text-muted-foreground text-center">
              Not enough data yet for your baby's age cohort.
            </p>
          ) : (
            <>
              {/* Cohort Month */}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {cohortStats.cohort_label}
                </p>
              </div>

              {/* Developmental Notes */}
              {regressionInfo && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    <span className="font-semibold">{regressionInfo.name} regression window.</span> {regressionInfo.description}
                  </p>
                </div>
              )}

              {/* Insight Text from cohort stats */}
              {cohortStats.insight_text && (
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {cohortStats.insight_text}
                  </p>
                </div>
              )}

              {/* Simple Norms */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Most babies at this age sleep around{' '}
                  {cohortStats.night_sleep_hours !== null && (
                    <span className="text-foreground font-medium">
                      {(cohortStats.night_sleep_hours - 0.5).toFixed(1)}–{(cohortStats.night_sleep_hours + 0.5).toFixed(1)}h
                    </span>
                  )}
                  {' '}at night and take{' '}
                  {cohortStats.naps_per_day !== null && (
                    <span className="text-foreground font-medium">
                      {Math.max(1, Math.floor(cohortStats.naps_per_day))}–{Math.ceil(cohortStats.naps_per_day)} naps
                    </span>
                  )}
                  {' '}per day.
                </p>
                
                {/* Soft Comparison */}
                <p className="text-sm text-primary/80 italic">
                  Your baby is right around this.
                </p>
              </div>

              {/* Data Source Note */}
              <div className="text-center pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground/70">
                  Based on {cohortStats.active_baby_count} babies
                  {cohortStats.fallback_tier && ` (${cohortStats.fallback_tier})`}
                </p>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
