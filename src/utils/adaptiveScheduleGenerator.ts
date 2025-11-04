import { BabyCarePredictionEngine, type NextActionResult } from "./predictionEngine";
import { Activity } from "@/components/ActivityCard";

export interface ScheduleEvent {
  time: string;
  type: 'wake' | 'nap' | 'feed' | 'bed';
  duration?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export interface AdaptiveSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
  adjustmentNote?: string;
  accuracyScore?: number; // 0-100 percentage
  lastUpdated?: string;
}

/**
 * Generate an adaptive schedule focused on sleep patterns
 * Detects nap transitions and indicates uncertain naps
 */
export function generateAdaptiveSchedule(
  activities: Activity[],
  babyBirthday?: string
): AdaptiveSchedule {
  console.log('🔮 Generating adaptive schedule from sleep patterns');
  
  const events: ScheduleEvent[] = [];
  const now = new Date();
  
  // Find today's wake activity
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayActivities = activities.filter(a => {
    const actDate = new Date(a.loggedAt);
    return actDate >= todayStart;
  });
  
  // Check if baby woke up today
  const todayWakeActivity = todayActivities.find(a => {
    if (a.type === 'nap' && a.details?.endTime && a.details?.isNightSleep) {
      const timeMatch = a.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        return hour >= 4 && hour <= 11;
      }
    }
    return false;
  });
  
  let scheduleStartTime: Date;
  let hasActualWake = false;
  
  if (todayWakeActivity) {
    const endTimeStr = todayWakeActivity.details?.endTime || '';
    const timeMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      scheduleStartTime = new Date(now);
      scheduleStartTime.setHours(hour, minute, 0, 0);
      hasActualWake = true;
    } else {
      scheduleStartTime = new Date(todayWakeActivity.loggedAt);
      hasActualWake = true;
    }
  } else {
    // Calculate average wake time from historical data
    const recentNightSleeps = activities
      .filter(a => a.type === 'nap' && a.details?.endTime && a.details?.isNightSleep)
      .slice(0, 14);
    
    let avgWakeHour = 7;
    let avgWakeMinute = 0;
    
    if (recentNightSleeps.length > 0) {
      let totalMinutes = 0;
      let count = 0;
      
      recentNightSleeps.forEach(sleep => {
        const timeMatch = sleep.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          if (hour >= 4 && hour <= 11) {
            totalMinutes += hour * 60 + minute;
            count++;
          }
        }
      });
      
      if (count > 0) {
        const avgTotalMinutes = Math.round(totalMinutes / count);
        avgWakeHour = Math.floor(avgTotalMinutes / 60);
        avgWakeMinute = avgTotalMinutes % 60;
      }
    }
    
    scheduleStartTime = new Date(now);
    scheduleStartTime.setHours(avgWakeHour, avgWakeMinute, 0, 0);
  }
  
  // Add wake event
  events.push({
    time: formatTime(scheduleStartTime),
    type: 'wake',
    notes: 'Wake up',
    confidence: hasActualWake ? 'high' : 'medium',
    reasoning: hasActualWake ? 'Actual logged wake time' : 'Based on typical wake pattern'
  });
  
  // Analyze nap patterns
  const recentNaps = activities.filter(a => a.type === 'nap' && !a.details?.isNightSleep).slice(0, 50);
  
  let napTimingsMinutesFromWake: number[] = [];
  
  // Get nap data with wake context - track durations per nap number
  const daysWithWakeAndNaps = new Map<string, { wakeTime: Date, naps: Array<{ time: Date, duration: number }> }>();
  const napDurationsByPosition = new Map<number, number[]>(); // position -> durations
  
  activities.filter(a => a.type === 'nap' && a.details?.isNightSleep).slice(0, 21).forEach(nightSleep => {
    if (nightSleep.details?.endTime) {
      const wakeTime = parseTimeString(nightSleep.details.endTime);
      if (wakeTime) {
        const dateKey = new Date(nightSleep.loggedAt).toDateString();
        const wakeDate = new Date(nightSleep.loggedAt);
        wakeDate.setHours(wakeTime.getHours(), wakeTime.getMinutes(), 0, 0);
        
        daysWithWakeAndNaps.set(dateKey, { wakeTime: wakeDate, naps: [] });
      }
    }
  });
  
  recentNaps.forEach(nap => {
    const napDate = new Date(nap.loggedAt);
    const dateKey = napDate.toDateString();
    const dayData = daysWithWakeAndNaps.get(dateKey);
    
    if (nap.details?.startTime && nap.details?.endTime) {
      const start = parseTimeString(nap.details.startTime);
      const end = parseTimeString(nap.details.endTime);
      if (start && end) {
        const duration = (end.getTime() - start.getTime()) / 60000;
        if (duration > 15 && duration < 240) {
          if (dayData) {
            const minutesFromWake = (start.getTime() - dayData.wakeTime.getTime()) / 60000;
            if (minutesFromWake > 0 && minutesFromWake < 720) {
              napTimingsMinutesFromWake.push(minutesFromWake);
              dayData.naps.push({ time: start, duration });
            }
          }
        }
      }
    }
  });
  
  // Group naps by position in the day and calculate average duration per position
  daysWithWakeAndNaps.forEach(day => {
    day.naps.sort((a, b) => a.time.getTime() - b.time.getTime());
    day.naps.forEach((nap, index) => {
      if (!napDurationsByPosition.has(index)) {
        napDurationsByPosition.set(index, []);
      }
      napDurationsByPosition.get(index)!.push(nap.duration);
    });
  });
  
  // Calculate nap count per day
  const napCountsPerDay: number[] = [];
  daysWithWakeAndNaps.forEach(day => {
    if (day.naps.length > 0) {
      napCountsPerDay.push(day.naps.length);
    }
  });
  
  // Determine if in transition
  const isInTransition = detectNapTransition(napCountsPerDay);
  const mostCommonNapCount = getMostCommonValue(napCountsPerDay) || 2;
  const transitioningToCount = isInTransition ? mostCommonNapCount : null;
  
  // Generate nap schedule
  const napSchedule = generateNapSchedule(
    scheduleStartTime,
    mostCommonNapCount,
    napDurationsByPosition,
    napTimingsMinutesFromWake,
    isInTransition,
    transitioningToCount
  );
  
  events.push(...napSchedule);
  
  // Calculate bedtime - use same logic as edge function (from nap activities that start in evening)
  // Use the same 7-day window as the edge function
  const sevenDaysAgo = new Date(scheduleStartTime);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const napsForBedtime = activities
    .filter(a => {
      if (a.type !== 'nap' || !a.details?.startTime) return false;
      const napDate = new Date(a.loggedAt);
      return napDate >= sevenDaysAgo;
    });
  
  let bedtimeHour = 19;
  let bedtimeMinute = 0;
  
  const bedtimes: number[] = [];
  napsForBedtime.forEach(nap => {
    if (nap.details?.startTime) {
      const startTime = parseTimeString(nap.details.startTime);
      if (startTime) {
        const hour = startTime.getHours();
        const minute = startTime.getMinutes();
        
        // Consider naps starting between 7 PM and 11 PM as bedtime (matching edge function logic)
        if (hour >= 19 && hour <= 23) {
          bedtimes.push(hour * 60 + minute);
        }
      }
    }
  });
  
  if (bedtimes.length > 0) {
    const avgTotalMinutes = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length);
    bedtimeHour = Math.floor(avgTotalMinutes / 60);
    bedtimeMinute = avgTotalMinutes % 60;
    console.log('🛏️ Bedtime calculation:', {
      bedtimeCount: bedtimes.length,
      bedtimeValues: bedtimes,
      avgTotalMinutes,
      calculatedBedtime: `${bedtimeHour}:${bedtimeMinute.toString().padStart(2, '0')}`
    });
  }
  
  const bedtimeRoutine = new Date(scheduleStartTime);
  bedtimeRoutine.setHours(bedtimeHour, bedtimeMinute, 0, 0);
  
  console.log('🛏️ Final bedtime:', formatTime(bedtimeRoutine));
  
  events.push({
    time: formatTime(bedtimeRoutine),
    type: 'bed',
    notes: 'Bedtime routine',
    confidence: bedtimes.length > 0 ? 'high' : 'medium',
    reasoning: bedtimes.length > 0 ? 'Based on typical bedtime' : 'Age-appropriate bedtime'
  });
  
  const sleepBy = new Date(bedtimeRoutine.getTime() + 30 * 60000);
  events.push({
    time: `Sleep by ${formatTime(sleepBy)}`,
    type: 'bed',
    notes: '',
    confidence: 'high',
    reasoning: ''
  });
  
  // Determine confidence
  const dataStability = activities.length > 100 ? 'stable' : activities.length > 30 ? 'unstable' : 'sparse';
  let overallConfidence: 'high' | 'medium' | 'low' = 'low';
  
  if (dataStability === 'stable') {
    overallConfidence = 'high';
  } else if (dataStability === 'unstable') {
    overallConfidence = 'medium';
  }
  
  const activitiesCount = activities.length;
  const daysOfData = Math.ceil(activitiesCount / 8);
  const basedOn = `Based on ${activitiesCount} activities over ${daysOfData} days with adaptive learning`;
  
  console.log('✅ Adaptive schedule generated:', {
    eventsCount: events.length,
    confidence: overallConfidence,
    hasActualWake,
    mostCommonNapCount,
    isInTransition
  });
  
  return {
    events,
    confidence: overallConfidence,
    basedOn
  };
}

function detectNapTransition(napCountsPerDay: number[]): boolean {
  if (napCountsPerDay.length < 5) return false;
  
  // Look at last 7 days
  const recent = napCountsPerDay.slice(0, 7);
  const uniqueCounts = new Set(recent);
  
  // If we see 2+ different nap counts in recent days, likely transitioning
  if (uniqueCounts.size >= 2) {
    // Check if there's a trend (decreasing nap count over time)
    const older = recent.slice(3, 7);
    const newer = recent.slice(0, 3);
    
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
    
    // Transitioning if newer average is lower
    return newerAvg < olderAvg;
  }
  
  return false;
}

function getMostCommonValue(arr: number[]): number | null {
  if (arr.length === 0) return null;
  
  const counts = new Map<number, number>();
  arr.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
  
  let maxCount = 0;
  let mostCommon = arr[0];
  
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  });
  
  return mostCommon;
}

function generateNapSchedule(
  wakeTime: Date,
  napCount: number,
  napDurationsByPosition: Map<number, number[]>,
  timingsFromWake: number[],
  isInTransition: boolean,
  transitioningToCount: number | null
): ScheduleEvent[] {
  const naps: ScheduleEvent[] = [];
  
  // Determine nap timings based on historical data or defaults
  let napStartTimes: number[] = []; // Minutes from wake
  
  if (timingsFromWake.length >= napCount) {
    // Use historical data - sort and cluster into nap groups
    const sorted = [...timingsFromWake].sort((a, b) => a - b);
    
    // Simple clustering: divide the day into nap periods
    if (napCount === 1) {
      napStartTimes = [median(sorted)];
    } else if (napCount === 2) {
      const mid = Math.floor(sorted.length / 2);
      napStartTimes = [
        median(sorted.slice(0, mid)),
        median(sorted.slice(mid))
      ];
    } else if (napCount === 3) {
      const third = Math.floor(sorted.length / 3);
      napStartTimes = [
        median(sorted.slice(0, third)),
        median(sorted.slice(third, third * 2)),
        median(sorted.slice(third * 2))
      ];
    }
  } else {
    // Use age-appropriate defaults
    if (napCount === 1) {
      napStartTimes = [150]; // 2.5 hours after wake
    } else if (napCount === 2) {
      napStartTimes = [150, 360]; // 2.5h and 6h after wake
    } else if (napCount === 3) {
      napStartTimes = [120, 270, 420]; // 2h, 4.5h, 7h after wake
    }
  }
  
  // Generate nap events
  napStartTimes.forEach((minutesFromWake, index) => {
    const napTime = new Date(wakeTime.getTime() + minutesFromWake * 60000);
    
    // Skip naps after 5 PM
    if (napTime.getHours() >= 17) return;
    
    const napNumber = index + 1;
    
    // Use actual average duration for this nap position, or fall back to 90 minutes
    const positionDurations = napDurationsByPosition.get(index);
    const duration = positionDurations && positionDurations.length > 0
      ? Math.round(positionDurations.reduce((a, b) => a + b, 0) / positionDurations.length)
      : 90;
    
    // Determine if this specific nap is uncertain
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let notes = `Nap ${napNumber}`;
    
    if (isInTransition) {
      // Last nap in the schedule is the transitional one
      if (napNumber === napStartTimes.length && transitioningToCount && transitioningToCount < napCount) {
        confidence = 'low';
        notes = `Nap ${napNumber} (might not happen — transitioning to ${transitioningToCount} ${transitioningToCount === 1 ? 'nap' : 'naps'})`;
      }
    }
    
    naps.push({
      time: formatTime(napTime),
      type: 'nap',
      duration: formatDuration(duration),
      notes,
      confidence,
      reasoning: confidence === 'low' ? 'Nap schedule transitioning' : 'Based on typical nap timing'
    });
  });
  
  return naps;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function parseTimeString(timeStr: string): Date | null {
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return null;
  
  let hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function parseDisplayTime(displayTime: string, baseDate: Date): Date {
  // Handle "Sleep by X:XX AM/PM" format
  const sleepByMatch = displayTime.match(/Sleep by (.+)/);
  if (sleepByMatch) {
    displayTime = sleepByMatch[1];
  }
  
  const parsed = parseTimeString(displayTime);
  if (!parsed) return baseDate;
  
  const result = new Date(baseDate);
  result.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0);
  return result;
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
