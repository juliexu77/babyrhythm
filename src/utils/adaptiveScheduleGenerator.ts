import { Activity } from "@/components/ActivityCard";
import { isNightSleep, isDaytimeNap } from "./napClassification";
import { formatInTimeZone } from 'date-fns-tz';
import { getScheduleForAge, calculateAgeInWeeks } from './ageAppropriateBaselines';

export interface ScheduleEvent {
  time: string;
  type: 'wake' | 'nap' | 'feed' | 'bed';
  duration?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export interface NapCountAnalysis {
  total_naps_today: number;
  confidence: 'high' | 'medium' | 'low';
  is_transitioning: boolean;
  transition_note?: string;
  reasoning: string;
}

export interface AdaptiveSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
  adjustmentNote?: string;
  accuracyScore?: number; // 0-100 percentage
  lastUpdated?: string;
  predictedBedtime?: string; // e.g., "7:30 PM"
  bedtimeConfidence?: 'high' | 'medium' | 'low';
}

/**
 * Generate an adaptive schedule using:
 * - Actual wake time (when available) or historical average
 * - Recent nap count from data
 * - Age-appropriate wake windows and nap durations
 */
export function generateAdaptiveSchedule(
  activities: Activity[],
  babyBirthday?: string,
  napCountAnalysis?: NapCountAnalysis,
  totalActivitiesCount?: number,
  forceShowAllNaps?: boolean,
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7,
  timezone: string = 'America/New_York'
): AdaptiveSchedule {
  console.log('🔮 Generating adaptive schedule:', {
    hasNapCountAnalysis: !!napCountAnalysis,
    napCount: napCountAnalysis?.total_naps_today,
    confidence: napCountAnalysis?.confidence,
    isTransitioning: napCountAnalysis?.is_transitioning,
    timezone
  });
  
  const events: ScheduleEvent[] = [];
  const now = new Date();
  
  // Get today's date in user's timezone
  const todayLocal = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  
  // Calculate yesterday - subtract 1 day from now before formatting
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayLocal = formatInTimeZone(yesterday, timezone, 'yyyy-MM-dd');
  
  // Filter activities by their LOCAL date
  const recentActivities = activities.filter(a => {
    // First try date_local from details
    if ((a.details as any)?.date_local) {
      return (a.details as any).date_local === todayLocal || (a.details as any).date_local === yesterdayLocal;
    }
    // Fall back to converting logged_at to user timezone
    const loggedAt = (a as any).loggedAt || (a as any).logged_at;
    if (loggedAt) {
      const activityDateInTimezone = formatInTimeZone(new Date(loggedAt), timezone, 'yyyy-MM-dd');
      return activityDateInTimezone === todayLocal || activityDateInTimezone === yesterdayLocal;
    }
    return false;
  });
  
  const todayActivities = recentActivities.filter(a => {
    if ((a.details as any)?.date_local) {
      return (a.details as any).date_local === todayLocal;
    }
    const loggedAt = (a as any).loggedAt || (a as any).logged_at;
    if (loggedAt) {
      const activityDateInTimezone = formatInTimeZone(new Date(loggedAt), timezone, 'yyyy-MM-dd');
      return activityDateInTimezone === todayLocal;
    }
    return false;
  });
  
  // Check if baby woke up today - find night sleep that STARTED yesterday
  const todayWakeActivity = recentActivities.find(a => {
    if (a.type === 'nap' && a.details?.startTime && isNightSleep(a, nightSleepStartHour, nightSleepEndHour)) {
      const activityDateLocal = (a.details as any)?.date_local;
      
      if (!activityDateLocal) {
        return false;
      }
      
      // Night sleep should have started yesterday
      if (activityDateLocal === yesterdayLocal && a.details.endTime) {
        const endTimeMatch = a.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (endTimeMatch) {
          let hour = parseInt(endTimeMatch[1]);
          const period = endTimeMatch[3].toUpperCase();
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;

          // Validate wake time is in valid morning window (4 AM to 12 PM)
          return hour >= 4 && hour <= 12;
        }
      }
    }
    return false;
  });
  
  let scheduleStartTime: Date;
  let hasActualWake = false;
  
  if (todayWakeActivity) {
    // Use today's actual wake time
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
    // No wake activity found today, use historical average
    const recentNightSleeps = activities
      .filter(a => a.type === 'nap' && a.details?.endTime && isNightSleep(a, nightSleepStartHour, nightSleepEndHour))
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
  
  // Get age-appropriate schedule baselines
  const ageInWeeks = babyBirthday ? calculateAgeInWeeks(babyBirthday) : null;
  const ageBasedSchedule = ageInWeeks ? getScheduleForAge(ageInWeeks) : null;
  
  // Determine nap count from analysis or fallback to age-appropriate default
  let napCount: number;
  let isInTransition: boolean;
  
  if (napCountAnalysis) {
    napCount = napCountAnalysis.total_naps_today;
    isInTransition = napCountAnalysis.is_transitioning;
    console.log('📊 Using nap count from analysis:', {
      napCount,
      isInTransition,
      confidence: napCountAnalysis.confidence,
      reasoning: napCountAnalysis.reasoning
    });
  } else if (ageBasedSchedule) {
    napCount = ageBasedSchedule.totalNaps;
    isInTransition = false;
    console.log('📊 Using age-appropriate nap count:', {
      napCount,
      ageInWeeks
    });
  } else {
    // Ultimate fallback
    napCount = 3;
    isInTransition = false;
    console.log('📊 Using default nap count:', napCount);
  }
  
  // Parse age-appropriate wake window for each nap position
  // Helper function to parse wake window string
  const parseWakeWindow = (wwStr: string): number => {
    const match = wwStr.match(/(\d+(?:\.\d+)?)/g); // Extract numbers
    if (match && match.length > 0) {
      const firstNum = parseFloat(match[0]);
      const lastNum = match.length > 1 ? parseFloat(match[match.length - 1]) : firstNum;
      const avgHours = (firstNum + lastNum) / 2;
      return Math.round(avgHours * 60);
    }
    return 150; // default 2.5 hours
  };
  
  // Generate naps using age-appropriate patterns with progressive wake windows
  let currentTime = new Date(scheduleStartTime);
  
  for (let napIndex = 0; napIndex < napCount; napIndex++) {
    // Get wake window for this specific nap position
    let wakeWindowMinutes = 150; // default 2.5 hours
    if (ageBasedSchedule && ageBasedSchedule.wakeWindows.length > napIndex) {
      wakeWindowMinutes = parseWakeWindow(ageBasedSchedule.wakeWindows[napIndex]);
    } else if (ageBasedSchedule && ageBasedSchedule.wakeWindows.length > 0) {
      // Fallback to last defined wake window if we don't have enough
      wakeWindowMinutes = parseWakeWindow(ageBasedSchedule.wakeWindows[ageBasedSchedule.wakeWindows.length - 1]);
    }
    
    // Add wake window
    currentTime = new Date(currentTime.getTime() + wakeWindowMinutes * 60000);
    
    // Determine nap duration based on position and age
    let napDurationMinutes = 60; // default 1 hour
    
    if (ageBasedSchedule && ageBasedSchedule.napWindows[napIndex]) {
      const napWindow = ageBasedSchedule.napWindows[napIndex];
      const durStr = napWindow.duration;
      // Parse duration like "1-2h" or "30m-1h"
      const hourMatch = durStr.match(/(\d+)-(\d+)h/);
      const minMatch = durStr.match(/(\d+)m-(\d+)h/);
      
      if (hourMatch) {
        const avgHours = (parseInt(hourMatch[1]) + parseInt(hourMatch[2])) / 2;
        napDurationMinutes = Math.round(avgHours * 60);
      } else if (minMatch) {
        const minVal = parseInt(minMatch[1]);
        const hourVal = parseInt(minMatch[2]) * 60;
        napDurationMinutes = Math.round((minVal + hourVal) / 2);
      }
    } else {
      // Fallback: first nap longer, later naps shorter
      if (napIndex === 0) {
        napDurationMinutes = 90; // 1.5 hours
      } else {
        napDurationMinutes = 60; // 1 hour
      }
    }
    
    const napEndTime = new Date(currentTime.getTime() + napDurationMinutes * 60000);
    
    events.push({
      time: formatTime(currentTime),
      type: 'nap',
      duration: formatDuration(napDurationMinutes),
      notes: `Nap ${napIndex + 1}`,
      confidence: 'medium',
      reasoning: ageBasedSchedule 
        ? `Age-appropriate wake window: ${ageBasedSchedule.wakeWindows[Math.min(napIndex, ageBasedSchedule.wakeWindows.length - 1)]}`
        : 'Standard wake window for age'
    });
    
    currentTime = napEndTime;
  }
  
  // Calculate bedtime using historical average
  let computedBedtime: Date | null = null;
  let bedtimeConfidence: 'high' | 'medium' | 'low' = 'medium';
  let bedtimeReason = '';
  
  // Historical average: average of night sleep start times over last 7 days
  const sevenDaysAgo = new Date(scheduleStartTime);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const nightStarts: number[] = activities
    .filter(a => {
      if (a.type !== 'nap' || !a.details?.startTime) return false;
      const startTime = parseTimeString(a.details.startTime);
      if (!startTime) return false;
      const hour = startTime.getHours();
      // Night sleep typically starts between 6 PM (18) and midnight (23)
      return hour >= 18 && hour <= 23;
    })
    .filter(a => new Date(a.loggedAt) >= sevenDaysAgo)
    .map(a => parseTimeString(a.details!.startTime))
    .filter((d): d is Date => !!d)
    .map(d => d.getHours() * 60 + d.getMinutes());
  
  if (nightStarts.length > 0) {
    const avg = Math.round(nightStarts.reduce((a,b)=>a+b,0)/nightStarts.length);
    const h = Math.floor(avg/60), m = avg%60;
    computedBedtime = new Date(scheduleStartTime);
    computedBedtime.setHours(h, m, 0, 0);
    bedtimeConfidence = nightStarts.length >= 5 ? 'high' : 'medium';
    bedtimeReason = `Based on ${nightStarts.length} nights of historical data`;
  } else if (ageBasedSchedule) {
    // Use age-appropriate bedtime from baselines
    const bedtimeStr = ageBasedSchedule.bedtime;
    const timeMatch = bedtimeStr.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      computedBedtime = new Date(scheduleStartTime);
      // Adjust for PM if hour < 12
      computedBedtime.setHours(hour < 12 ? hour + 12 : hour, minute, 0, 0);
      bedtimeConfidence = 'medium';
      bedtimeReason = 'Age-appropriate bedtime';
    } else {
      // Fallback to 7:30 PM
      computedBedtime = new Date(scheduleStartTime);
      computedBedtime.setHours(19, 30, 0, 0);
      bedtimeConfidence = 'low';
      bedtimeReason = 'Default bedtime';
    }
  } else {
    // Sensible default near 7:30 PM
    computedBedtime = new Date(scheduleStartTime);
    computedBedtime.setHours(19, 30, 0, 0);
    bedtimeConfidence = 'low';
    bedtimeReason = 'Default bedtime (no historical data)';
  }
  
  // Clamp between 6:30 PM and 9:30 PM
  const clamp = (d: Date) => {
    const lo = new Date(d); lo.setHours(18,30,0,0);
    const hi = new Date(d); hi.setHours(21,30,0,0);
    if (d < lo) return lo;
    if (d > hi) return hi;
    return d;
  };
  
  computedBedtime = clamp(computedBedtime!);
  
  console.log('🛏️ Bedtime:', {
    nightSamplesCount: nightStarts.length,
    computed: formatTime(computedBedtime!),
    reason: bedtimeReason,
    confidence: bedtimeConfidence
  });
  
  const predictedBedtimeStr = formatTime(computedBedtime!);
  
  events.push({
    time: predictedBedtimeStr,
    type: 'bed',
    notes: 'Bedtime',
    confidence: bedtimeConfidence,
    reasoning: bedtimeReason
  });
  
  // Use analysis confidence if available
  let overallConfidence: 'high' | 'medium' | 'low';
  if (napCountAnalysis) {
    overallConfidence = napCountAnalysis.confidence;
  } else {
    const dataStability = activities.length > 100 ? 'stable' : activities.length > 30 ? 'unstable' : 'sparse';
    if (dataStability === 'stable') {
      overallConfidence = 'high';
    } else if (dataStability === 'unstable') {
      overallConfidence = 'medium';
    } else {
      overallConfidence = 'low';
    }
  }
  
  // Use total activities count if provided
  const displayActivitiesCount = totalActivitiesCount ?? activities.length;
  const daysOfData = Math.ceil(displayActivitiesCount / 8);
  const basedOn = `${displayActivitiesCount} activities over ${daysOfData} days`;
  
  const adjustmentNote = napCountAnalysis?.is_transitioning 
    ? napCountAnalysis.transition_note 
    : undefined;
  
  // Calculate accuracy score by comparing with today's activities
  let accuracyScore: number | undefined = undefined;
  if (todayActivities.length >= 1) {
    let accurateCount = 0;
    let totalComparisons = 0;
    
    // Check nap accuracies
    const todayNaps = todayActivities.filter(a => a.type === 'nap' && !a.details?.isNightSleep);
    const predictedNaps = events.filter(e => e.type === 'nap');
    
    todayNaps.forEach(actualNap => {
      if (!actualNap.details?.startTime) return;
      const actualTime = parseTimeString(actualNap.details.startTime);
      if (!actualTime) return;
      
      // Find closest predicted nap
      const actualMinutes = actualTime.getHours() * 60 + actualTime.getMinutes();
      const closestPredicted = predictedNaps.reduce((closest, pred) => {
        const predTime = parseTimeString(pred.time);
        if (!predTime) return closest;
        const predMinutes = predTime.getHours() * 60 + predTime.getMinutes();
        const diff = Math.abs(predMinutes - actualMinutes);
        
        if (!closest || diff < closest.diff) {
          return { pred, diff };
        }
        return closest;
      }, null as { pred: ScheduleEvent; diff: number } | null);
      
      if (closestPredicted && closestPredicted.diff <= 30) {
        accurateCount++;
      }
      totalComparisons++;
    });
    
    if (totalComparisons > 0) {
      accuracyScore = Math.round((accurateCount / totalComparisons) * 100);
    }
  }
  
  console.log('✅ Adaptive schedule generated:', {
    eventsCount: events.length,
    confidence: overallConfidence,
    hasActualWake,
    napCount,
    isInTransition,
    usedNapCountAnalysis: !!napCountAnalysis,
    accuracyScore
  });
  
  return {
    events,
    confidence: overallConfidence,
    basedOn,
    adjustmentNote,
    accuracyScore,
    predictedBedtime: predictedBedtimeStr,
    bedtimeConfidence
  };
}

// Helper functions

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
