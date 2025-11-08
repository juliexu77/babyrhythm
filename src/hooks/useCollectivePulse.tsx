import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format, startOfWeek, endOfWeek } from "date-fns";

interface CohortStats {
  cohort_label: string;
  night_sleep_hours: number | null;
  night_sleep_change: number | null;
  naps_per_day: number | null;
  naps_per_day_change: number | null;
  feed_count_per_day: number | null;
  avg_feed_volume: number | null;
  solids_started_pct: number | null;
  active_baby_count: number;
  insight_text: string;
  fallback_tier: string | null;
}

export const useCollectivePulse = (babyBirthday?: string) => {
  return useQuery({
    queryKey: ['collective-pulse', babyBirthday],
    queryFn: async (): Promise<CohortStats | null> => {
      if (!babyBirthday) return null;

      // Determine cohort month
      const birthDate = new Date(babyBirthday);
      const cohortMonth = format(startOfMonth(birthDate), 'yyyy-MM-dd');
      
      // Get current week range
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });

      // Fetch cohort statistics for this week
      const { data, error } = await supabase
        .from('cohort_statistics')
        .select('*')
        .eq('cohort_month', cohortMonth)
        .eq('week_start_date', format(weekStart, 'yyyy-MM-dd'))
        .maybeSingle();

      if (error) {
        console.error('Error fetching cohort stats:', error);
        return null;
      }

      return data;
    },
    enabled: !!babyBirthday,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
};
