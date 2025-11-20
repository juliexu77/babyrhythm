import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInWeeks, startOfWeek, format, startOfMonth, addWeeks } from "date-fns";

interface CohortRange {
  weekStart: Date;
  min: number | null;
  max: number | null;
}

export const useTimelineCohortRanges = (
  babyBirthday: string | undefined,
  weeks: Date[],
  metricType: 'nightSleep' | 'dayNaps' | 'feedVolume' | 'wakeWindows' | undefined
) => {
  return useQuery({
    queryKey: ['timeline-cohort-ranges', babyBirthday, weeks.map(w => w.toISOString()), metricType],
    queryFn: async (): Promise<CohortRange[]> => {
      if (!babyBirthday || !metricType || weeks.length === 0) {
        return weeks.map(w => ({ weekStart: w, min: null, max: null }));
      }

      const birthDate = new Date(babyBirthday);

      // For each timeline week, calculate the baby's age and find matching cohort data
      const rangePromises = weeks.map(async (weekStart) => {
        // Calculate baby's age in weeks at this timeline point
        const ageInWeeks = differenceInWeeks(weekStart, birthDate);
        
        if (ageInWeeks < 0) {
          return { weekStart, min: null, max: null };
        }

        // To find cohort data for babies of this age:
        // We need cohort_month where (week_start_date - cohort_month) ≈ ageInWeeks
        // So cohort_month = week_start_date - ageInWeeks
        const targetCohortBirthDate = addWeeks(weekStart, -ageInWeeks);
        const cohortMonth = format(startOfMonth(targetCohortBirthDate), 'yyyy-MM-dd');
        const targetWeekStart = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

        // Fetch cohort statistics for babies of this age
        const { data, error } = await supabase
          .from('cohort_statistics')
          .select('night_sleep_hours, naps_per_day, avg_feed_volume')
          .eq('cohort_month', cohortMonth)
          .eq('week_start_date', targetWeekStart)
          .maybeSingle();

        if (error || !data) {
          return { weekStart, min: null, max: null };
        }

        // Extract min/max based on metric type (using ±15% of average as range)
        let value: number | null = null;
        if (metricType === 'nightSleep') {
          value = data.night_sleep_hours;
        } else if (metricType === 'dayNaps') {
          value = data.naps_per_day;
        } else if (metricType === 'feedVolume') {
          value = data.avg_feed_volume;
        }

        if (value === null) {
          return { weekStart, min: null, max: null };
        }

        // Create range: ±0.75 for naps (since it's discrete), ±15% for continuous metrics
        const variance = metricType === 'dayNaps' ? 0.75 : value * 0.15;
        return {
          weekStart,
          min: Math.max(0, value - variance),
          max: value + variance
        };
      });

      return Promise.all(rangePromises);
    },
    enabled: !!babyBirthday && !!metricType && weeks.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
};
