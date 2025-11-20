import { useQuery } from "@tanstack/react-query";
import { differenceInWeeks } from "date-fns";
import { baselineWakeWindows } from "@/utils/ageAppropriateBaselines";

interface CohortRange {
  weekStart: Date;
  min: number | null;
  max: number | null;
}

// Get age-appropriate developmental baselines from expert sources
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
    queryKey: ['timeline-baseline-ranges', babyBirthday, weeks.map(w => w.toISOString()), metricType],
    queryFn: async (): Promise<CohortRange[]> => {
      if (!babyBirthday || !metricType || weeks.length === 0) {
        return weeks.map(w => ({ weekStart: w, min: null, max: null }));
      }

      const birthDate = new Date(babyBirthday);

      // For each timeline week, calculate the baby's age and use developmental baselines
      const ranges = weeks.map((weekStart) => {
        // Calculate baby's age in weeks at this timeline point
        const ageInWeeks = differenceInWeeks(weekStart, birthDate);
        
        if (ageInWeeks < 0) {
          return { weekStart, min: null, max: null };
        }

        // Get age-appropriate developmental baseline
        const baselineRange = getBaselineRange(ageInWeeks, metricType);
        
        if (!baselineRange) {
          return { weekStart, min: null, max: null };
        }

        return {
          weekStart,
          min: baselineRange.min,
          max: baselineRange.max
        };
      });

      return ranges;
    },
    enabled: !!babyBirthday && !!metricType && weeks.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
