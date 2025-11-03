/**
 * Daylight Saving Time (DST) Detection Utilities
 * 
 * Detects DST transitions and provides adjusted predictions during transition periods
 */

interface DSTTransition {
  isDSTToday: boolean;
  isDSTTransitionPeriod: boolean; // Today or day after DST change
  transitionType: 'spring-forward' | 'fall-back' | null;
  message: string;
}

/**
 * Checks if DST occurs in the given timezone
 * Returns true if the timezone observes DST
 */
function doesTimeZoneObserveDST(timezone: string): boolean {
  // Create two dates: one in winter, one in summer
  const january = new Date(new Date().getFullYear(), 0, 1);
  const july = new Date(new Date().getFullYear(), 6, 1);
  
  // Get timezone offsets for both dates
  const janOffset = new Date(january.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
  const julyOffset = new Date(july.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
  
  // If offsets differ, timezone observes DST
  return janOffset !== julyOffset;
}

/**
 * Gets the DST transition dates for the current year in the given timezone
 */
function getDSTTransitionDates(timezone: string, year: number): { spring: Date | null; fall: Date | null } {
  if (!doesTimeZoneObserveDST(timezone)) {
    return { spring: null, fall: null };
  }
  
  // Check each day of the year for offset changes
  let springTransition: Date | null = null;
  let fallTransition: Date | null = null;
  
  let previousOffset: number | null = null;
  
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 31; day++) {
      try {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break; // Invalid date
        
        const offset = new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
        
        if (previousOffset !== null && offset !== previousOffset) {
          if (offset < previousOffset) {
            // Spring forward (offset decreases)
            springTransition = new Date(year, month, day);
          } else {
            // Fall back (offset increases)
            fallTransition = new Date(year, month, day);
          }
        }
        
        previousOffset = offset;
      } catch (e) {
        // Invalid date, skip
        continue;
      }
    }
  }
  
  return { spring: springTransition, fall: fallTransition };
}

/**
 * Checks if today or tomorrow is a DST transition day
 */
export function checkDSTTransition(timezone?: string): DSTTransition {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log('🕐 DST Detection - Checking timezone:', tz);
  
  // If timezone doesn't observe DST, return no transition
  if (!doesTimeZoneObserveDST(tz)) {
    console.log('🕐 DST Detection - Timezone does not observe DST');
    return {
      isDSTToday: false,
      isDSTTransitionPeriod: false,
      transitionType: null,
      message: ''
    };
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { spring, fall } = getDSTTransitionDates(tz, now.getFullYear());
  
  console.log('🕐 DST Detection - Transition dates:', {
    spring: spring?.toDateString(),
    fall: fall?.toDateString(),
    today: today.toDateString(),
    timezone: tz
  });
  
  // Check if today is a DST transition day
  const isSpringToday = spring && today.getTime() === spring.getTime();
  const isFallToday = fall && today.getTime() === fall.getTime();
  const isDSTToday = isSpringToday || isFallToday;
  
  // Check if yesterday was a DST transition day (extended adjustment period)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasSpringYesterday = spring && yesterday.getTime() === spring.getTime();
  const wasFallYesterday = fall && yesterday.getTime() === fall.getTime();
  
  const isDSTTransitionPeriod = isDSTToday || wasSpringYesterday || wasFallYesterday;
  
  console.log('🕐 DST Detection - Results:', {
    isDSTToday,
    isDSTTransitionPeriod,
    isSpringToday,
    isFallToday,
    wasSpringYesterday,
    wasFallYesterday
  });
  
  let transitionType: 'spring-forward' | 'fall-back' | null = null;
  let message = '';
  
  if (isSpringToday || wasSpringYesterday) {
    transitionType = 'spring-forward';
    if (isSpringToday) {
      message = "Today's Daylight Saving Time change may shift rhythms. Bedtime and wake times may vary more than usual.";
    } else {
      message = "Adjusting to yesterday's time change. Schedule may still be settling.";
    }
  } else if (isFallToday || wasFallYesterday) {
    transitionType = 'fall-back';
    if (isFallToday) {
      message = "Today's Daylight Saving Time change may shift rhythms. Bedtime and wake times may vary more than usual.";
    } else {
      message = "Adjusting to yesterday's time change. Schedule may still be settling.";
    }
  }
  
  return {
    isDSTToday,
    isDSTTransitionPeriod,
    transitionType,
    message
  };
}

/**
 * Get adjusted confidence level during DST transition
 */
export function getAdjustedConfidenceForDST(
  baseConfidence: 'high' | 'medium' | 'low',
  isDSTTransitionPeriod: boolean
): 'high' | 'medium' | 'low' {
  if (!isDSTTransitionPeriod) return baseConfidence;
  
  // Reduce confidence during DST transitions
  if (baseConfidence === 'high') return 'medium';
  if (baseConfidence === 'medium') return 'low';
  return 'low';
}
