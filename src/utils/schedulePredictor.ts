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
}

export interface PredictedSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
}

/**
 * Generate a predicted daily schedule based on historical activity patterns
 */
export function generatePredictedSchedule(
  activities: GuideTabActivity[],
  babyBirthday?: string
): PredictedSchedule {
  
  // Calculate average wake time from night sleep patterns
  const nightSleeps = activities
    .filter(a => a.type === 'nap' && a.details?.endTime)
    .map(nap => {
      // For GuideTab activities, extract time from logged_at
      const loggedDate = new Date(nap.logged_at);
      const timeStr = loggedDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const startTime = parseTimeString(nap.details?.startTime || timeStr);
      const endTime = parseTimeString(nap.details?.endTime!);
      return { startTime, endTime, duration: calculateDuration(startTime, endTime) };
    })
    .filter(nap => nap.duration > 360); // Night sleep > 6 hours
  
  // Get average wake time (most common end time for night sleeps)
  const wakeTime = getAverageWakeTime(nightSleeps);
  
  // Get average bed time (most common start time for night sleeps)
  const bedTime = getAverageBedTime(nightSleeps);
  
  // Calculate wake windows from historical data
  const wakeWindows = calculateAverageWakeWindow(activities);
  
  // Calculate feed intervals
  const feedIntervals = calculateAverageFeedInterval(activities);
  
  // Build the schedule
  const events: ScheduleEvent[] = [];
  let currentTime = wakeTime;
  
  // Add wake time
  events.push({
    time: formatTime(currentTime),
    type: 'wake',
    notes: 'Morning wake up'
  });
  
  // Add first feed (usually within 30-60 min of waking)
  currentTime += 30;
  events.push({
    time: formatTime(currentTime),
    type: 'feed',
    notes: 'Morning feed'
  });
  
  // Generate naps and feeds throughout the day
  let napCount = 0;
  const targetNaps = getExpectedNaps(babyBirthday);
  
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
        notes: `Nap ${napCount + 1}`
      });
      currentTime += napDuration;
      napCount++;
      
      // Add feed after nap (usually within 30 min)
      if (currentTime < bedTime - 120) {
        currentTime += 20;
        events.push({
          time: formatTime(currentTime),
          type: 'feed',
          notes: 'Post-nap feed'
        });
      }
    }
  }
  
  // Add bedtime feed
  events.push({
    time: formatTime(bedTime - 30),
    type: 'feed',
    notes: 'Bedtime feed'
  });
  
  // Add bedtime
  events.push({
    time: formatTime(bedTime),
    type: 'bed',
    notes: 'Bedtime'
  });
  
  // Determine confidence based on data availability
  const hasEnoughData = activities.length >= 20;
  const hasRecentData = activities.filter(a => {
    const loggedDate = new Date(a.logged_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return loggedDate >= threeDaysAgo;
  }).length >= 10;
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (hasEnoughData && hasRecentData) confidence = 'high';
  else if (hasEnoughData || hasRecentData) confidence = 'medium';
  
  const daysOfData = Math.ceil(activities.length / 8); // Rough estimate
  
  return {
    events,
    confidence,
    basedOn: `Based on ${activities.length} activities over ${daysOfData} days`
  };
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
