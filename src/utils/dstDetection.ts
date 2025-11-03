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
 * Returns dates in YYYY-MM-DD string format for reliable comparison
 */
function getDSTTransitionDates(timezone: string, year: number): { spring: string | null; fall: string | null } {
  if (!doesTimeZoneObserveDST(timezone)) {
    return { spring: null, fall: null };
  }
  
  // Check each day of the year for offset changes
  let springTransition: string | null = null;
  let fallTransition: string | null = null;
  
  let previousOffset: number | null = null;
  
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 31; day++) {
      try {
        // Create date at noon to avoid midnight edge cases
        const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
        if (date.getUTCMonth() !== month) break; // Invalid date
        
        // Get the offset for this date in the target timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false
        });
        
        // Calculate offset by comparing UTC time with local time
        const parts = formatter.formatToParts(date);
        const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const offset = 12 - localHour; // Difference from UTC noon
        
        if (previousOffset !== null && offset !== previousOffset) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          if (offset < previousOffset) {
            // Spring forward (clocks move ahead, offset decreases)
            springTransition = dateStr;
          } else {
            // Fall back (clocks move back, offset increases)
            fallTransition = dateStr;
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
  // Get today's date as YYYY-MM-DD string in local timezone
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Get yesterday's date string
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  const { spring, fall } = getDSTTransitionDates(tz, now.getFullYear());
  
  console.log('🕐 DST Detection - Transition dates:', {
    spring,
    fall,
    today: todayStr,
    yesterday: yesterdayStr,
    timezone: tz
  });
  
  // Check if today is a DST transition day
  const isSpringToday = spring === todayStr;
  const isFallToday = fall === todayStr;
  const isDSTToday = isSpringToday || isFallToday;
  
  // Check if yesterday was a DST transition day (extended adjustment period)
  const wasSpringYesterday = spring === yesterdayStr;
  const wasFallYesterday = fall === yesterdayStr;
  
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
