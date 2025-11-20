import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInWeeks, startOfWeek, format, startOfMonth, addWeeks } from "date-fns";
import { baselineWakeWindows } from "@/utils/ageAppropriateBaselines";

interface CohortRange {
  weekStart: Date;
  min: number | null;
  max: number | null;
}

// Fallback to age-appropriate baselines when cohort data unavailable
const getBaselineRange = (ageInWeeks: number, metricType: string) => {
  const baseline = baselineWakeWindows.find(
    b => ageInWeeks >= b.ageStart && ageInWeeks <= b.ageEnd
  );
  
  if (!baseline) return null;

  if (metricType === 'nightSleep') {
    const match = baseline.totalSleep.match(/(\d+)-(\d+)/);
    if (match) {
      const min = parseInt(match[1]) * 0.6;
      const max = parseInt(match[2]) * 0.75;
      return { min, max };
    }
  } else if (metricType === 'dayNaps') {
    const match = baseline.napCount.match(/(\d+)(?:-(\d+))?/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return { min, max };
    }
  } else if (metricType === 'wakeWindows') {
    const ww = baseline.wakeWindows[0];
    const match = ww.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      return { min, max };
    }
  } else if (metricType === 'feedVolume') {
    if (ageInWeeks < 4) return { min: 18, max: 26 };
    if (ageInWeeks < 8) return { min: 22, max: 30 };
    if (ageInWeeks < 16) return { min: 24, max: 32 };
    if (ageInWeeks < 24) return { min: 26, max: 34 };
    if (ageInWeeks < 52) return { min: 24, max: 32 };
    return { min: 20, max: 28 };
  }
  
  return null;
};

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

        console.log('🔍 Cohort lookup:', {
          weekStart: format(weekStart, 'MMM d, yyyy'),
          babyAgeWeeks: ageInWeeks,
          babyAgeMonths: (ageInWeeks / 4.33).toFixed(1),
          cohortMonth,
          targetWeekStart
        });

        // Fetch cohort statistics for babies of this age
        const { data, error } = await supabase
          .from('cohort_statistics')
          .select('night_sleep_hours, naps_per_day, avg_feed_volume, cohort_label')
          .eq('cohort_month', cohortMonth)
          .eq('week_start_date', targetWeekStart)
          .maybeSingle();

        if (error) {
          console.error('❌ Cohort fetch error:', error);
        }

        // If no cohort data, fall back to age-appropriate baselines
        if (!data) {
          console.warn('⚠️ No cohort data, using baseline for age:', ageInWeeks, 'weeks');
          const baselineRange = getBaselineRange(ageInWeeks, metricType);
          if (baselineRange) {
            console.log('✅ Using baseline range:', baselineRange);
            return {
              weekStart,
              min: baselineRange.min,
              max: baselineRange.max
            };
          }
          return { weekStart, min: null, max: null };
        }

        console.log('✅ Cohort data found:', {
          weekStart: format(weekStart, 'MMM d'),
          cohortLabel: data.cohort_label,
          naps: data.naps_per_day,
          nightSleep: data.night_sleep_hours
        });

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
          // Fall back to baselines
          const baselineRange = getBaselineRange(ageInWeeks, metricType);
          if (baselineRange) {
            return {
              weekStart,
              min: baselineRange.min,
              max: baselineRange.max
            };
          }
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
