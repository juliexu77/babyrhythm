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

export interface AISchedulePrediction {
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
 * Generate an adaptive schedule using AI pattern prediction + historical timing data
 * AI provides high-level pattern (nap count, transitions, confidence)
 * This function calculates all specific times, wake windows, and bedtime
 */
export function generateAdaptiveSchedule(
  activities: Activity[],
  babyBirthday?: string,
  aiPrediction?: AISchedulePrediction
): AdaptiveSchedule {
  console.log('🔮 Generating adaptive schedule:', {
    hasAIPrediction: !!aiPrediction,
    aiNapCount: aiPrediction?.total_naps_today,
    aiConfidence: aiPrediction?.confidence,
    isTransitioning: aiPrediction?.is_transitioning
  });
  
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
  
  // Use AI prediction if available, otherwise fall back to historical analysis
  let napCount: number;
  let isInTransition: boolean;
  let transitioningToCount: number | null;
  
  if (aiPrediction) {
    // AI tells us the expected nap count and transition state
    napCount = aiPrediction.total_naps_today;
    isInTransition = aiPrediction.is_transitioning;
    transitioningToCount = isInTransition ? napCount : null;
    console.log('📊 Using AI prediction for schedule structure:', {
      napCount,
      isInTransition,
      confidence: aiPrediction.confidence,
      reasoning: aiPrediction.reasoning
    });
  } else {
    // Fallback to historical pattern detection
    isInTransition = detectNapTransition(napCountsPerDay);
    napCount = getMostCommonValue(napCountsPerDay) || 2;
    transitioningToCount = isInTransition ? napCount : null;
    console.log('📊 Using historical analysis for schedule structure:', {
      napCount,
      isInTransition,
      napCountsPerDay
    });
  }
  
  // Calculate baby's age in months
  const babyAgeMonths = babyBirthday 
    ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  
  // Generate nap schedule with AI-predicted nap count and historical data for validation
  const napSchedule = generateNapSchedule(
    scheduleStartTime,
    napCount,
    napDurationsByPosition,
    napTimingsMinutesFromWake,
    isInTransition,
    transitioningToCount,
    babyAgeMonths,
    daysWithWakeAndNaps // Pass historical day sleep data for validation
  );
  
  events.push(...napSchedule);
  
  // Calculate bedtime using robust final wake window logic
  // 1) Prefer today's last nap end + final wake window (FWW)
  // 2) Fallback to predicted last nap end + FWW
  // 3) Fallback to historical night sleep start average (7-day)
  // 4) Clamp to a reasonable window (6:30 PM - 9:30 PM)
  
  const getMonths = (birthday?: string) => {
    if (!birthday) return null;
    const dob = new Date(birthday);
    const diff = Date.now() - dob.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44)));
  };
  
  const ageMonths = getMonths(babyBirthday);
  
  const parseDurationToMinutes = (dur?: string) => {
    if (!dur) return 90; // sensible default
    const m = dur.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
    if (!m) return 90;
    const h = m[1] ? parseInt(m[1]) : 0;
    const min = m[2] ? parseInt(m[2]) : 0;
    return h * 60 + min;
  };
  
  // Bedtime based on historical average only
  let computedBedtime: Date | null = null;
  let bedtimeConfidence: 'high' | 'medium' | 'low' = 'medium';
  let bedtimeReason = '';
  
  // Historical average: average of night sleep start times over last 7 days
  // Detect night sleep by TIMING (6 PM - midnight) not just the isNightSleep flag
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
  
  console.log('🛏️ Bedtime (historical average):', {
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
  
  // Use AI confidence if available, otherwise determine from data stability
  let overallConfidence: 'high' | 'medium' | 'low';
  if (aiPrediction) {
    overallConfidence = aiPrediction.confidence;
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
  
  const activitiesCount = activities.length;
  const daysOfData = Math.ceil(activitiesCount / 8);
  const basedOn = aiPrediction 
    ? `AI pattern analysis: ${aiPrediction.reasoning}`
    : `Based on ${activitiesCount} activities over ${daysOfData} days`;
  
  const adjustmentNote = aiPrediction?.is_transitioning 
    ? aiPrediction.transition_note 
    : undefined;
  
  
  // Calculate accuracy score by comparing with today's activities
  let accuracyScore = 0;
  if (hasActualWake && todayActivities.length >= 3) {
    let accurateCount = 0;
    let totalPredictions = 0;
    
    // Check wake accuracy (already logged)
    if (hasActualWake) {
      accurateCount++;
      totalPredictions++;
    }
    
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
      totalPredictions++;
    });
    
    if (totalPredictions > 0) {
      accuracyScore = Math.round((accurateCount / totalPredictions) * 100);
    }
  }
  
  console.log('✅ Adaptive schedule generated:', {
    eventsCount: events.length,
    confidence: overallConfidence,
    hasActualWake,
    napCount,
    isInTransition,
    usedAIPrediction: !!aiPrediction,
    accuracyScore
  });
  
  return {
    events,
    confidence: overallConfidence,
    basedOn,
    adjustmentNote,
    accuracyScore: accuracyScore > 0 ? accuracyScore : undefined,
    predictedBedtime: predictedBedtimeStr,
    bedtimeConfidence
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
  transitioningToCount: number | null,
  babyAgeMonths: number | null,
  historicalDaySleepData: Map<string, { wakeTime: Date, naps: Array<{ time: Date, duration: number }> }>
): ScheduleEvent[] {
  const naps: ScheduleEvent[] = [];
  
  // Calculate predicted bedtime first to use as cutoff for naps
  const sevenDaysAgo = new Date(wakeTime);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const nightStarts: number[] = historicalDaySleepData 
    ? Array.from(historicalDaySleepData.values())
        .map(day => {
          // Find the last nap of the day which is likely bedtime
          if (day.naps.length === 0) return null;
          const lastNap = day.naps[day.naps.length - 1];
          return lastNap.time.getHours() * 60 + lastNap.time.getMinutes();
        })
        .filter((t): t is number => t !== null && t >= 18 * 60) // Only evening times (after 6 PM)
    : [];

  // Calculate average bedtime from historical data
  let bedtimeCutoffHour = 19; // Default 7 PM
  if (nightStarts.length > 0) {
    const avgMinutes = Math.round(nightStarts.reduce((a,b)=>a+b,0)/nightStarts.length);
    bedtimeCutoffHour = Math.floor(avgMinutes / 60);
  }
  
  // Use bedtime minus 1 hour as the latest nap start time
  const napCutoffHour = Math.max(16, bedtimeCutoffHour - 1); // Minimum 4 PM, typically 1 hour before bed
  
  console.log('⏰ Nap cutoff calculation:', {
    bedtimeHour: bedtimeCutoffHour,
    napCutoffHour,
    nightSleepSamples: nightStarts.length
  });
  
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
      napStartTimes = [120, 240, 360]; // 2h, 4h, 6h after wake (adjusted to fit before 5 PM)
    }
  }
  
  // Generate initial nap events
  napStartTimes.forEach((minutesFromWake, index) => {
    const napTime = new Date(wakeTime.getTime() + minutesFromWake * 60000);
    
    // Skip naps that would interfere with bedtime (dynamic cutoff based on historical bedtime)
    if (napTime.getHours() >= napCutoffHour) {
      console.log(`⏭️ Skipping nap ${index + 1} scheduled at ${formatTime(napTime)} (after ${napCutoffHour}:00 cutoff, bedtime typically at ${bedtimeCutoffHour}:00)`);
      return;
    }
    
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
  
  // Calculate average total DAY sleep from historical data (excludes night sleep)
  const historicalDailySleepTotals: number[] = [];
  historicalDaySleepData.forEach(day => {
    // day.naps already contains only daytime naps (night sleep filtered out earlier)
    const totalDayMinutes = day.naps.reduce((sum, nap) => sum + nap.duration, 0);
    if (totalDayMinutes > 0 && totalDayMinutes < 600) { // Sanity check: 0-10 hours
      historicalDailySleepTotals.push(totalDayMinutes);
    }
  });
  
  // Use historical average as the target, with age-based fallback
  let recommendedMinutes: number;
  if (historicalDailySleepTotals.length >= 3) {
    // Use historical average from last 3+ days
    recommendedMinutes = Math.round(
      historicalDailySleepTotals.reduce((a, b) => a + b, 0) / historicalDailySleepTotals.length
    );
    console.log('💤 Using historical day sleep average:', {
      days: historicalDailySleepTotals.length,
      avgHours: (recommendedMinutes / 60).toFixed(1),
      samples: historicalDailySleepTotals.map(m => (m / 60).toFixed(1))
    });
  } else {
    // Fallback to age-appropriate defaults if insufficient data
    const getDefaultDaySleep = (months: number | null): number => {
      if (months === null) return 3.5;
      if (months <= 3) return 5.0;
      if (months <= 6) return 4.0;
      if (months <= 9) return 3.5;
      if (months <= 12) return 3.0;
      if (months <= 18) return 2.5;
      return 2.0;
    };
    recommendedMinutes = getDefaultDaySleep(babyAgeMonths) * 60;
    console.log('💤 Using age-based fallback for day sleep:', {
      ageMonths: babyAgeMonths,
      hours: (recommendedMinutes / 60).toFixed(1),
      reason: `Only ${historicalDailySleepTotals.length} days of data`
    });
  }
  
  const parseDurationToMinutes = (dur: string): number => {
    const match = dur.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
    if (!match) return 90;
    const h = match[1] ? parseInt(match[1]) : 0;
    const m = match[2] ? parseInt(match[2]) : 0;
    return h * 60 + m;
  };
  
  const totalDaySleepMinutes = naps.reduce((sum, nap) => sum + parseDurationToMinutes(nap.duration || '90m'), 0);
  
  console.log('💤 Day sleep validation:', {
    recommendedHours: (recommendedMinutes / 60).toFixed(1),
    scheduledHours: (totalDaySleepMinutes / 60).toFixed(1),
    napCount: naps.length,
    source: historicalDailySleepTotals.length >= 3 ? 'historical' : 'age-based'
  });
  
  // If total exceeds historical average by more than 30 minutes, shorten last nap
  if (totalDaySleepMinutes > recommendedMinutes + 30 && naps.length > 0) {
    const excess = totalDaySleepMinutes - recommendedMinutes;
    const lastNap = naps[naps.length - 1];
    const lastNapMinutes = parseDurationToMinutes(lastNap.duration || '90m');
    const newLastNapMinutes = Math.max(30, lastNapMinutes - excess); // Minimum 30 min nap
    
    naps[naps.length - 1] = {
      ...lastNap,
      duration: formatDuration(newLastNapMinutes),
      notes: lastNap.notes // Keep original notes, adjustment is transparent
    };
    
    console.log('🔧 Shortened last nap:', {
      from: formatDuration(lastNapMinutes),
      to: formatDuration(newLastNapMinutes),
      reason: `Exceeded typical day sleep by ${Math.round(excess)}m`
    });
  }
  
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
