import { toZonedTime } from 'date-fns-tz';

export interface GuideTabActivity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

export interface ScheduleEvent {
  time: string;
  type: 'wake' | 'nap' | 'feed' | 'bed';
  duration?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  actualTime?: string; // Track actual time for accuracy comparison
  actualDuration?: string;
}

export interface PredictedSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
  accuracyScore?: number; // 0-100 percentage
  lastUpdated?: string;
  adjustmentNote?: string;
}

/**
 * Generate a predicted daily schedule based on historical activity patterns
 */
export function generatePredictedSchedule(
  activities: GuideTabActivity[],
  babyBirthday?: string,
  timezone: string = 'UTC'
): PredictedSchedule {
  
  // Get today's activities to check if wake time already logged (in user's timezone)
  const nowLocal = toZonedTime(new Date(), timezone);
  const todayLocal = new Date(nowLocal);
  todayLocal.setHours(0, 0, 0, 0);
  
  const todayActivities = activities.filter(a => {
    const actDateUTC = new Date(a.logged_at);
    const actDateLocal = toZonedTime(actDateUTC, timezone);
    return actDateLocal >= todayLocal;
  });
  
  console.log('📅 Timezone:', timezone, '| Today local:', todayLocal.toISOString(), '| Today activities:', todayActivities.length);
  
  // Check if there's a wake time logged today (using local time)
  const todayWakeActivity = todayActivities.find(a => {
    if (a.type === 'wake') return true;
    // For naps, check if end time is in morning (4-11 AM local)
    if (a.type === 'nap' && a.details?.endTime) {
      const actDateLocal = toZonedTime(new Date(a.logged_at), timezone);
      const localHour = actDateLocal.getHours();
      return localHour >= 4 && localHour <= 11;
    }
    return false;
  });
  
  // Calculate average wake time from night sleep patterns (convert to local time)
  const nightSleeps = activities
    .filter(a => a.type === 'nap' && a.details?.endTime)
    .map(nap => {
      const startTime = parseTimeString(nap.details?.startTime || '');
      const endTime = parseTimeString(nap.details?.endTime!);
      const duration = calculateDuration(startTime, endTime);
      const loggedAtLocal = toZonedTime(new Date(nap.logged_at), timezone);
      return { startTime, endTime, duration, loggedAt: loggedAtLocal.getTime() };
    })
    .filter(nap => nap.duration > 360); // Night sleep > 6 hours
  
  // Use today's actual wake time if logged, otherwise use average
  let wakeTime: number;
  // Prefer an actual night sleep end that looks like this morning (4–11am)
  const nightSleepCandidates = activities
    .filter(a => a.type === 'nap' && a.details?.startTime && a.details?.endTime)
    .map(a => {
      const start = parseTimeString(a.details.startTime);
      const end = parseTimeString(a.details.endTime);
      const duration = calculateDuration(start, end);
      const loggedAtLocal = toZonedTime(new Date(a.logged_at), timezone);
      return { start, end, duration, loggedAt: loggedAtLocal.getTime() };
    })
    .filter(s => s.duration > 360 && s.end >= 240 && s.end <= 660) // 4:00–11:00
    .sort((a, b) => b.loggedAt - a.loggedAt);

  if (nightSleepCandidates.length > 0) {
    wakeTime = nightSleepCandidates[0].end;
    console.log('🌅 Using last night\'s wake (by endTime):', formatTime(wakeTime));
  } else if (todayWakeActivity) {
    // Parse the actual wake time from today
    const wakeTimeStr = todayWakeActivity.details?.endTime || 
      toZonedTime(new Date(todayWakeActivity.logged_at), timezone).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    wakeTime = parseTimeString(wakeTimeStr);
    console.log('🌅 Using today\'s wake time:', wakeTimeStr, '→', wakeTime, 'minutes');
  } else {
    // Get average wake time (most common end time for night sleeps)
    wakeTime = getAverageWakeTime(nightSleeps);
    console.log('🌅 Using average wake time:', wakeTime, 'minutes (', formatTime(wakeTime), ')');
  }
  
  // Get average bed time (most common start time for night sleeps)
  const bedTime = getAverageBedTime(nightSleeps);
  
  // Calculate wake windows from historical data
  const wakeWindows = calculateAverageWakeWindow(activities);
  
  // Calculate feed intervals
  const feedIntervals = calculateAverageFeedInterval(activities);
  
  // Determine confidence FIRST based on data availability (Tiered system)
  const totalActivities = activities.length;
  const hasRecentData = activities.filter(a => {
    const loggedDate = new Date(a.logged_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return loggedDate >= threeDaysAgo;
  }).length >= 10;
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let basedOnText = '';
  
  if (totalActivities >= 10 && hasRecentData) {
    // Tier 3: Personalized
    confidence = 'high';
    const daysOfData = Math.ceil(activities.length / 8);
    basedOnText = `Based on ${activities.length} activities over ${daysOfData} days`;
  } else if (totalActivities >= 4) {
    // Tier 2: Pattern emerging
    confidence = 'medium';
    basedOnText = `Based on ${activities.length} activities and age patterns`;
  } else {
    // Tier 1: Age-based only
    confidence = 'low';
    const ageInMonths = babyBirthday 
      ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null;
    basedOnText = `Based on age${ageInMonths ? ` (${ageInMonths} months)` : ''}`;
  }
  
  // Build the schedule
  const events: ScheduleEvent[] = [];
  let currentTime = wakeTime;
  
  // Determine event-level confidence based on data quality
  const eventConfidence = (type: string): 'high' | 'medium' | 'low' => {
    if (confidence === 'high') return 'high';
    if (confidence === 'medium') return type === 'wake' || type === 'bed' ? 'high' : 'medium';
    return 'low';
  };

  // Add wake time
  console.log('📅 Adding wake event at:', formatTime(wakeTime));
  events.push({
    time: formatTime(wakeTime),
    type: 'wake',
    notes: 'Morning wake up',
    confidence: eventConfidence('wake'),
    reasoning: todayWakeActivity 
      ? `Using today's actual wake time`
      : (nightSleeps.length > 3 
          ? `Based on ${nightSleeps.length} recent wake times averaging ${formatTime(wakeTime)}`
          : 'Based on typical wake time for age')
  });
  
  // Generate naps throughout the day (no feed predictions)
  let napCount = 0;
  const targetNaps = getExpectedNaps(babyBirthday);
  currentTime = wakeTime; // Reset to wake time
  
  while (currentTime < bedTime - 120) { // Stop 2 hours before bed
    // Add wake window
    currentTime += wakeWindows.typical;
    
    // Add nap if we haven't hit the target
    if (napCount < targetNaps) {
      const napDuration = getNapDuration(napCount, babyBirthday);
      events.push({
        time: formatTime(currentTime),
        type: 'nap',
        duration: `${Math.floor(napDuration / 60)}h ${napDuration % 60}m`,
        notes: `Nap ${napCount + 1}`,
        confidence: eventConfidence('nap'),
        reasoning: wakeWindows.typical > 0
          ? `Average wake window: ${Math.floor(wakeWindows.typical / 60)}h ${wakeWindows.typical % 60}m`
          : `Typical nap timing for ${targetNaps}-nap schedule`
      });
      currentTime += napDuration;
      napCount++;
    } else {
      break;
    }
  }
  
  // Add bedtime
  events.push({
    time: formatTime(bedTime),
    type: 'bed',
    notes: 'Bedtime',
    confidence: eventConfidence('bed'),
    reasoning: nightSleeps.length > 3
      ? `Based on ${nightSleeps.length} recent bedtimes averaging ${formatTime(bedTime)}`
      : 'Based on recommended bedtime for age'
  });
  
  return {
    events,
    confidence,
    basedOn: basedOnText,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate accuracy of predictions by comparing with actual activities
 */
export function calculatePredictionAccuracy(
  predictedSchedule: PredictedSchedule,
  actualActivities: GuideTabActivity[],
  timezone: string = 'UTC'
): number {
  const nowLocal = toZonedTime(new Date(), timezone);
  const todayLocal = new Date(nowLocal);
  todayLocal.setHours(0, 0, 0, 0);
  
  const todayActivities = actualActivities.filter(a => {
    const actDateUTC = new Date(a.logged_at);
    const actDateLocal = toZonedTime(actDateUTC, timezone);
    return actDateLocal >= todayLocal;
  });

  if (todayActivities.length === 0) return 0;

  let matchCount = 0;
  let totalPredictions = 0;

  // Compare each predicted event with actual activities
  predictedSchedule.events.forEach(predicted => {
    totalPredictions++;
    const predictedMinutes = parseTimeString(predicted.time);
    
    // Find matching activity type within ±45 minutes
    const hasMatch = todayActivities.some(actual => {
      if (actual.type !== predicted.type && !(predicted.type === 'wake' && actual.type === 'nap')) {
        return false;
      }
      
      let actualMinutes: number;
      // For naps, use actual startTime if available, otherwise fall back to logged_at
      if (actual.type === 'nap' && actual.details?.startTime) {
        const timeMatch = actual.details.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          actualMinutes = hours * 60 + minutes;
        } else {
          const actualTimeUTC = new Date(actual.logged_at);
          const actualTimeLocal = toZonedTime(actualTimeUTC, timezone);
          actualMinutes = actualTimeLocal.getHours() * 60 + actualTimeLocal.getMinutes();
        }
      } else {
        const actualTimeUTC = new Date(actual.logged_at);
        const actualTimeLocal = toZonedTime(actualTimeUTC, timezone);
        actualMinutes = actualTimeLocal.getHours() * 60 + actualTimeLocal.getMinutes();
      }
      
      const diff = Math.abs(actualMinutes - predictedMinutes);
      
      return diff <= 45; // Within 45 minutes is considered a match
    });

    if (hasMatch) matchCount++;
  });

  return totalPredictions > 0 ? Math.round((matchCount / totalPredictions) * 100) : 0;
}

// Helper functions

function getTimeFromActivity(activity: GuideTabActivity): string {
  // Extract time string from logged_at
  const loggedDate = new Date(activity.logged_at);
  return loggedDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

function parseTimeString(timeStr: string): number {
  // Parse "7:30 AM" format to minutes since midnight
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  // Convert minutes since midnight to "7:30 AM" format
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

function calculateDuration(start: number, end: number): number {
  if (end >= start) return end - start;
  return (24 * 60) - start + end; // Handle crossing midnight
}

function getAverageWakeTime(nightSleeps: Array<{ startTime: number; endTime: number; duration: number }>): number {
  if (nightSleeps.length === 0) return 7 * 60; // Default 7 AM
  
  const endTimes = nightSleeps.map(s => s.endTime);
  const avg = endTimes.reduce((a, b) => a + b, 0) / endTimes.length;
  return Math.round(avg);
}

function getAverageBedTime(nightSleeps: Array<{ startTime: number; endTime: number; duration: number }>): number {
  if (nightSleeps.length === 0) return 19 * 60; // Default 7 PM
  
  const startTimes = nightSleeps.map(s => s.startTime);
  const avg = startTimes.reduce((a, b) => a + b, 0) / startTimes.length;
  return Math.round(avg);
}

function calculateAverageWakeWindow(activities: GuideTabActivity[]): { typical: number; range: string } {
  // Calculate wake windows between naps
  const naps = activities
    .filter(a => a.type === 'nap' && a.details?.endTime && a.details?.startTime)
    .sort((a, b) => {
      const aTime = new Date(a.logged_at).getTime();
      const bTime = new Date(b.logged_at).getTime();
      return aTime - bTime;
    });
  
  const wakeWindows: number[] = [];
  for (let i = 1; i < naps.length; i++) {
    const prevEnd = parseTimeString(naps[i - 1].details?.endTime!);
    const currStart = parseTimeString(naps[i].details?.startTime || getTimeFromActivity(naps[i]));
    const window = calculateDuration(prevEnd, currStart);
    if (window > 0 && window < 360) { // Reasonable wake window (< 6 hours)
      wakeWindows.push(window);
    }
  }
  
  if (wakeWindows.length === 0) {
    return { typical: 120, range: '1.5-2.5 hours' }; // Default
  }
  
  const avg = wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length;
  const hours = Math.floor(avg / 60);
  const mins = Math.round(avg % 60);
  
  return {
    typical: Math.round(avg),
    range: `${hours}h ${mins}m`
  };
}

function calculateAverageFeedInterval(activities: GuideTabActivity[]): { typical: number } {
  const feeds = activities
    .filter(a => a.type === 'feed')
    .sort((a, b) => {
      const aTime = new Date(a.logged_at).getTime();
      const bTime = new Date(b.logged_at).getTime();
      return aTime - bTime;
    });
  
  if (feeds.length < 2) return { typical: 180 }; // Default 3 hours
  
  const intervals: number[] = [];
  for (let i = 1; i < feeds.length; i++) {
    const prevTime = parseTimeString(getTimeFromActivity(feeds[i - 1]));
    const currTime = parseTimeString(getTimeFromActivity(feeds[i]));
    const interval = calculateDuration(prevTime, currTime);
    if (interval > 0 && interval < 360) {
      intervals.push(interval);
    }
  }
  
  if (intervals.length === 0) return { typical: 180 };
  
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return { typical: Math.round(avg) };
}

function getExpectedNaps(babyBirthday?: string): number {
  if (!babyBirthday) return 3;
  
  const ageInMonths = Math.floor(
    (Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  
  if (ageInMonths < 3) return 4;
  if (ageInMonths < 6) return 3;
  if (ageInMonths < 12) return 2;
  return 2;
}

function getNapDuration(napIndex: number, babyBirthday?: string): number {
  const ageInMonths = babyBirthday
    ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 6;
  
  // First nap of the day is usually longer
  if (napIndex === 0) {
    if (ageInMonths < 3) return 120; // 2 hours
    if (ageInMonths < 6) return 90; // 1.5 hours
    return 75; // 1h 15m
  }
  
  // Later naps are shorter
  if (ageInMonths < 3) return 90; // 1.5 hours
  if (ageInMonths < 6) return 60; // 1 hour
  return 45; // 45 min
}
