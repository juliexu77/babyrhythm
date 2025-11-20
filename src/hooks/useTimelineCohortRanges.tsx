import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format, differenceInWeeks, addWeeks, startOfWeek } from "date-fns";

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
      const cohortMonth = format(startOfMonth(birthDate), 'yyyy-MM-dd');

      // Fetch cohort statistics for all weeks in range
      const weekStartDates = weeks.map(w => format(startOfWeek(w, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      
      const { data, error } = await supabase
        .from('cohort_statistics')
        .select('week_start_date, night_sleep_hours, naps_per_day, avg_feed_volume')
        .eq('cohort_month', cohortMonth)
        .in('week_start_date', weekStartDates);

      if (error) {
        console.error('Error fetching cohort ranges:', error);
        return weeks.map(w => ({ weekStart: w, min: null, max: null }));
      }

      // Map data to weeks
      return weeks.map(weekStart => {
        const weekStartStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const stat = data?.find(d => d.week_start_date === weekStartStr);

        if (!stat) {
          return { weekStart, min: null, max: null };
        }

        // Extract min/max based on metric type (using ±15% of average as range)
        let value: number | null = null;
        if (metricType === 'nightSleep') {
          value = stat.night_sleep_hours;
        } else if (metricType === 'dayNaps') {
          value = stat.naps_per_day;
        } else if (metricType === 'feedVolume') {
          value = stat.avg_feed_volume;
        }

        if (value === null) {
          return { weekStart, min: null, max: null };
        }

        // Create range: ±15% for sleep/feed, ±1 for naps
        const variance = metricType === 'dayNaps' ? 1 : value * 0.15;
        return {
          weekStart,
          min: Math.max(0, value - variance),
          max: value + variance
        };
      });
    },
    enabled: !!babyBirthday && !!metricType && weeks.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
};
