import { Globe, TrendingUp, TrendingDown } from "lucide-react";
import { useCollectivePulse } from "@/hooks/useCollectivePulse";
import { format, subDays, startOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";

interface CollectivePulseProps {
  babyBirthday?: string;
}

export const CollectivePulse = ({ babyBirthday }: CollectivePulseProps) => {
  const { data: cohortStats, isLoading } = useCollectivePulse(babyBirthday);
  const { household } = useHousehold();

  // Fetch baby's recent activities for comparison
  const { data: babyMetrics } = useQuery({
    queryKey: ['baby-metrics', household?.id],
    queryFn: async () => {
      if (!household?.id) return null;

      const sevenDaysAgo = subDays(startOfDay(new Date()), 7);
      
      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('household_id', household.id)
        .gte('logged_at', sevenDaysAgo.toISOString())
        .in('type', ['nap', 'sleep']);

      if (error) {
        console.error('Error fetching baby metrics:', error);
        return null;
      }

      // Calculate night sleep hours (type 'sleep' = overnight sleep)
      const sleepActivities = activities?.filter(a => a.type === 'sleep') || [];
      const nightSleepByDate: Record<string, number> = {};
      
      sleepActivities.forEach(activity => {
        const date = format(new Date(activity.logged_at), 'yyyy-MM-dd');
        const details = activity.details as any;
        const duration = details?.duration || 0;
        nightSleepByDate[date] = (nightSleepByDate[date] || 0) + duration;
      });

      const nightSleepDays = Object.keys(nightSleepByDate).length;
      const totalNightSleep = Object.values(nightSleepByDate).reduce((sum, hours) => sum + hours, 0);
      const avgNightSleep = nightSleepDays > 0 ? totalNightSleep / nightSleepDays : null;

      // Calculate naps per day (type 'nap' = daytime naps)
      const napActivities = activities?.filter(a => a.type === 'nap') || [];
      const napsByDate: Record<string, number> = {};
      
      napActivities.forEach(activity => {
        const date = format(new Date(activity.logged_at), 'yyyy-MM-dd');
        napsByDate[date] = (napsByDate[date] || 0) + 1;
      });

      const napDays = Object.keys(napsByDate).length;
      const totalNaps = Object.values(napsByDate).reduce((sum, count) => sum + count, 0);
      const avgNaps = napDays > 0 ? totalNaps / napDays : null;

      return {
        nightSleepHours: avgNightSleep,
        napsPerDay: avgNaps
      };
    },
    enabled: !!household?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-accent/20 animate-pulse">
        <div className="p-4 border-b border-border">
          <div className="h-4 bg-muted rounded w-32 mb-2" />
          <div className="h-3 bg-muted rounded w-40" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-lg p-3 border border-border h-20" />
            <div className="bg-card rounded-lg p-3 border border-border h-20" />
          </div>
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Show message when data not yet computed
  if (!cohortStats) {
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-accent/20">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Collective Pulse
            </h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {babyBirthday ? format(new Date(babyBirthday), 'MMMM yyyy') + ' Babies' : 'Coming Soon'}
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're gathering insights from families with babies your age. Check back soon for cohort statistics.
          </p>
        </div>
      </div>
    );
  }

  // Format naps as range
  const formatNaps = (naps: number | null): string => {
    if (!naps) return "—";
    if (naps >= 3) return "3–4";
    if (naps >= 2) return "2–3";
    return "1–2";
  };

  const renderChange = (change: number | null) => {
    if (!change || Math.abs(change) < 0.1) return null;
    
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
      }`}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(change).toFixed(1)}{cohortStats.night_sleep_hours ? 'h' : ''}</span>
      </div>
    );
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-accent/20">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Collective Pulse
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {cohortStats.cohort_label}
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Micro Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Avg Night Sleep</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-foreground">
                {cohortStats.night_sleep_hours?.toFixed(1) || '—'}h
              </div>
              {renderChange(cohortStats.night_sleep_change)}
            </div>
            {babyMetrics?.nightSleepHours !== null && babyMetrics?.nightSleepHours !== undefined && (
              <div className="text-[11px] text-muted-foreground/80 italic mt-1.5">
                Your baby: {babyMetrics.nightSleepHours.toFixed(1)}h
              </div>
            )}
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Avg Naps/Day</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-foreground">
                {formatNaps(cohortStats.naps_per_day)}
              </div>
              {renderChange(cohortStats.naps_per_day_change)}
            </div>
            {babyMetrics?.napsPerDay !== null && babyMetrics?.napsPerDay !== undefined && (
              <div className="text-[11px] text-muted-foreground/80 italic mt-1.5">
                Your baby: {babyMetrics.napsPerDay.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* Insight Text */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {cohortStats.insight_text}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-muted-foreground/70 italic">
          Based on aggregated BabyRhythm data{cohortStats.fallback_tier && cohortStats.fallback_tier !== 'minimal' ? ' and developmental norms' : ''} — updated weekly.
        </p>
      </div>
    </div>
  );
};
