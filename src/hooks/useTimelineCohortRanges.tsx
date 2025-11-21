import { useQuery } from "@tanstack/react-query";
import { differenceInWeeks } from "date-fns";
import { baselineWakeWindows, getFeedingGuidanceForAge } from "@/utils/ageAppropriateBaselines";

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
    // Night sleep typically represents 60-75% of total sleep depending on age
    // Based on Taking Cara Babies and AAP guidelines:
    // Newborns: 8-10hrs, 3mo: 9-11hrs, 6mo: 10-12hrs, 12mo+: 10-12hrs
    if (ageInWeeks < 8) return { min: 8, max: 10 };
    if (ageInWeeks < 16) return { min: 9, max: 11 };
    if (ageInWeeks < 52) return { min: 10, max: 12 };
    return { min: 10, max: 12 };
  } else if (metricType === 'dayNaps') {
    const match = baseline.napCount.match(/(\d+)(?:-(\d+))?/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return { min, max };
    }
  } else if (metricType === 'wakeWindows') {
    const ww = baseline.wakeWindows[0];
    
    // Handle special cases like "All day"
    if (ww === "All day") return { min: 10, max: 14 };
    
    // Handle minute-based wake windows (e.g., "45min-1hr")
    if (ww.includes('min')) {
      const minMatch = ww.match(/(\d+)min/);
      const hrMatch = ww.match(/(\d+(?:\.\d+)?)hr/);
      if (minMatch && hrMatch) {
        return { min: parseInt(minMatch[1]) / 60, max: parseFloat(hrMatch[1]) };
      }
    }
    
    // Handle hour-based wake windows (e.g., "1.5-2.5hrs")
    const match = ww.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      return { min, max };
    }
  } else if (metricType === 'feedVolume') {
    // Get feeding guidance from expert sources
    const guidance = getFeedingGuidanceForAge(ageInWeeks);
    
    // Parse the amount range (e.g., "4-6 oz (120-180ml)")
    const match = guidance.amount.match(/(\d+)-(\d+)\s*oz/);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      return { min, max };
    }
    
    // Fallback if parsing fails
    return { min: 4, max: 8 };
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
