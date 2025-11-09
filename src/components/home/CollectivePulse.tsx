import { Globe, TrendingUp, TrendingDown } from "lucide-react";
import { useCollectivePulse } from "@/hooks/useCollectivePulse";
import { format, subDays, startOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { calculateNapStatistics } from "@/utils/napStatistics";

interface CollectivePulseProps {
  babyBirthday?: string;
}

export const CollectivePulse = ({ babyBirthday }: CollectivePulseProps) => {
  const { data: cohortStats, isLoading } = useCollectivePulse(babyBirthday);
  const { household } = useHousehold();
  const { isNightTime, nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();

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

      // Map to the format expected by calculateNapStatistics
      const mappedActivities = activities?.map(a => ({
        type: a.type,
        loggedAt: a.logged_at,
        details: a.details as any
      })) || [];

      // Use shared utility for consistent calculation
      const stats = calculateNapStatistics(mappedActivities, nightSleepStartHour, nightSleepEndHour);

      return {
        nightSleepHours: stats.avgNightSleepHours > 0 ? stats.avgNightSleepHours : null,
        napsPerDay: stats.avgDaytimeNapsPerDay
      };
    },
    enabled: !!household?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-primary/20 via-primary/12 to-primary/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse">
        <div className="px-4 py-5 border-b border-border/30">
          <div className="h-4 bg-muted rounded w-32 mb-2" />
          <div className="h-3 bg-muted rounded w-40" />
        </div>
        <div className="px-4 py-5 space-y-3">
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
      <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-primary/20 via-primary/12 to-primary/5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-5 border-b border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
              Collective Pulse
            </h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {babyBirthday ? format(new Date(babyBirthday), 'MMMM yyyy') + ' Babies' : 'Coming Soon'}
          </p>
        </div>
        <div className="px-4 py-5">
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
    <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-1-dark to-card-ombre-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-5 border-b border-border/30">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
            Collective Pulse
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {cohortStats.cohort_label}
        </p>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-3">
        {/* Micro Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Night Sleep</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {cohortStats.night_sleep_hours?.toFixed(1) || '—'} <span className="text-base text-muted-foreground font-normal">h</span>
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
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Naps/Day</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
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
