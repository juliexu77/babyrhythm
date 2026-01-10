/**
 * Age-based developmental expectations for feeds, naps, and wake windows.
 * Centralized utility to replace duplicated logic across components.
 */

export interface ExpectedRange {
  min: number;
  max: number;
  typical: string;
}

/**
 * Get expected number of feeds per day based on baby's age in months
 */
export const getExpectedFeeds = (months: number | null): ExpectedRange | null => {
  if (months === null) return null;
  if (months < 1) return { min: 8, max: 12, typical: "8-12" };
  if (months < 3) return { min: 6, max: 8, typical: "6-8" };
  if (months < 6) return { min: 5, max: 7, typical: "5-7" };
  if (months < 9) return { min: 4, max: 6, typical: "4-6" };
  if (months < 12) return { min: 3, max: 5, typical: "3-5" };
  return { min: 3, max: 4, typical: "3-4" };
};

/**
 * Get expected number of naps per day based on baby's age in months
 */
export const getExpectedNaps = (months: number | null): ExpectedRange | null => {
  if (months === null) return null;
  if (months < 3) return { min: 4, max: 6, typical: "4-6" };
  if (months < 6) return { min: 3, max: 4, typical: "3-4" };
  if (months < 9) return { min: 2, max: 3, typical: "2-3" };
  if (months < 12) return { min: 2, max: 3, typical: "2-3" };
  if (months < 18) return { min: 1, max: 2, typical: "1-2" };
  return { min: 1, max: 2, typical: "1-2" };
};

/**
 * Get expected wake window in minutes based on baby's age in months
 */
export const getExpectedWakeWindow = (months: number | null): number => {
  if (months === null) return 120; // default 2 hours
  if (months < 3) return 90; // 1.5 hours
  if (months < 6) return 120; // 2 hours
  if (months < 9) return 150; // 2.5 hours
  return 180; // 3 hours
};

/**
 * Get expected nap duration in minutes based on baby's age in months
 */
export const getExpectedNapDuration = (months: number | null): number => {
  if (months === null) return 90; // default 90 minutes
  if (months < 3) return 120; // 2 hours for newborns
  if (months < 6) return 90; // 1.5 hours
  if (months < 12) return 75; // 1h 15m
  return 60; // 1 hour for older babies
};

/**
 * Detect if baby is in a nap transition window based on age in days
 */
export interface TransitionWindow {
  from: number;
  to: number;
  label: string;
}

export const detectTransitionWindow = (ageInDays: number | null): TransitionWindow | null => {
  if (!ageInDays) return null;
  
  if (ageInDays >= 90 && ageInDays <= 120) {
    return { from: 4, to: 3, label: "3-4 month transition" };
  }
  if (ageInDays >= 180 && ageInDays <= 270) {
    return { from: 3, to: 2, label: "6-9 month transition" };
  }
  if (ageInDays >= 456 && ageInDays <= 547) {
    return { from: 2, to: 1, label: "15-18 month transition" };
  }
  return null;
};

/**
 * Get status indicator for feeds based on time of day
 */
export type StatusIndicator = 'on-track' | 'attention';

export const getFeedStatusIndicator = (
  count: number, 
  months: number | null,
  currentHour: number
): StatusIndicator => {
  const expected = getExpectedFeeds(months);
  if (!expected) return 'on-track';
  
  // Calculate progress based on WAKING hours only (7am-7pm = 12 hours)
  const wakeHour = 7;
  const sleepHour = 19;
  const totalWakingHours = sleepHour - wakeHour;
  
  if (currentHour < wakeHour) {
    return 'on-track'; // Too early to judge
  }
  
  const wakingHoursPassed = Math.max(0, currentHour - wakeHour);
  const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
  
  const typicalFeeds = Math.round((expected.min + expected.max) / 2);
  const expectedByNow = Math.round(typicalFeeds * dayProgress);
  
  // Early in the day (before 10am), be lenient
  if (currentHour < 10) {
    return 'on-track';
  }
  
  // Mid to late day: compare to proportional expectations
  if (count >= expectedByNow || count >= expectedByNow - 1) {
    return 'on-track';
  }
  return 'attention';
};

/**
 * Get status indicator for sleep based on time of day
 */
export const getSleepStatusIndicator = (
  count: number, 
  months: number | null,
  currentHour: number
): StatusIndicator => {
  const expected = getExpectedNaps(months);
  if (!expected) return 'on-track';
  
  const wakeHour = 7;
  const sleepHour = 19;
  const totalWakingHours = sleepHour - wakeHour;
  
  if (currentHour < wakeHour) {
    return 'on-track';
  }
  
  const wakingHoursPassed = Math.max(0, currentHour - wakeHour);
  const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
  const typicalNaps = Math.round((expected.min + expected.max) / 2);
  const expectedByNow = Math.round(typicalNaps * dayProgress);
  
  if (currentHour < 10) {
    return 'on-track';
  }
  
  if (count >= expectedByNow || count >= expectedByNow - 1) {
    return 'on-track';
  }
  return 'attention';
};

/**
 * Get developmental phase description based on age
 */
export const getDevelopmentalPhase = (months: number | null, weeks: number | null): string | null => {
  if (months === null) return null;
  
  if (months < 3) return 'inSleepyNewbornPhase';
  if (months < 6) return 'discoveringWorld';
  if (months < 9) return 'curiousExploratoryPhase';
  if (months < 12) return 'becomingMobile';
  if (months < 18) return 'learningToCommunicate';
  return 'growingIntoOwnPerson';
};
