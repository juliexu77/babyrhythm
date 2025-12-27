import { useMemo, useState, useEffect } from "react";
import { Activity } from "@/components/ActivityCard";
import { format } from "date-fns";
import { isNightSleep, isDaytimeNap, parseTimeToHour } from "@/utils/napClassification";
import { isActivityOnDate, getActivityEventDateString, getActivityEventDate } from "@/utils/activityDate";

export interface MissedActivitySuggestion {
  activityType: 'nap' | 'feed';
  subType?: 'bedtime' | 'morning-wake' | 'first-nap';
  suggestedTime: string; // e.g., "7:30 PM"
  medianTimeMinutes: number; // minutes since midnight
  confidence: number; // 0-1
  message: string; // e.g., "Did Caleb sleep around 7:30 PM?"
}

interface ActivityPattern {
  type: 'nap' | 'feed';
  subType?: 'bedtime' | 'morning-wake' | 'first-nap';
  times: number[]; // minutes since midnight
  medianTime: number;
  stdDev: number;
  occurrenceCount: number;
  gracePeriodMinutes: number;
}

// Calculate standard deviation
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

// Calculate median
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

// Convert time string to minutes since midnight (LOCAL time, not UTC)
function timeToMinutes(activity: Activity): number {
  // Priority 1: Use details.startTime if available (for naps)
  if (activity.details?.startTime) {
    const timeStr = activity.details.startTime;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
  }
  
  // Priority 2: Use time_local from details if available (stored as any)
  const timeLocal = (activity.details as any)?.time_local;
  if (timeLocal) {
    const match = timeLocal.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours * 60 + minutes;
    }
  }
  
  // Fallback: Convert UTC to local time
  const date = new Date(activity.loggedAt);
  return date.getHours() * 60 + date.getMinutes();
}

// Convert minutes since midnight to readable time
function minutesToTime(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Get activities from the last N days (based on actual event date, not when logged)
function getRecentActivities(activities: Activity[], days: number): Activity[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0); // Start of day
  
  return activities.filter(a => {
    const activityDate = getActivityEventDate(a);
    activityDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    return activityDate >= cutoff;
  });
}

// Check if activity was already logged today (based on ACTIVITY's event date, not when logged)
function wasLoggedToday(
  activities: Activity[], 
  type: 'nap' | 'feed', 
  subType?: string,
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): boolean {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const parseToMinutes = (timeStr: string): number | null => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  
  return activities.some(a => {
    if (a.type !== type) return false;
    
    if (subType === 'morning-wake') {
      // Treat "today" based on the WAKE (end) date, not the start date.
      if (!(isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && !!(a.details as any)?.endTime)) return false;
      const startDayKey = getActivityEventDateString(a);
      const startStr = (a.details as any)?.startTime || (a.details as any)?.time_local;
      const endStr = (a.details as any)?.endTime as string | undefined;
      if (!startStr || !endStr) return false;
      const startMins = parseToMinutes(startStr);
      const endMins = parseToMinutes(endStr);
      if (startMins == null || endMins == null) return false;
      // Compute end date key
      const [y, m, d] = startDayKey.split('-').map(Number);
      const endDate = new Date(y, m - 1, d);
      if (endMins < startMins) {
        endDate.setDate(endDate.getDate() + 1);
      }
      const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      
      return endKey === todayKey;
    }
    
    if (subType === 'bedtime') {
      // Check if this is a night sleep
      if (!isNightSleep(a, nightSleepStartHour, nightSleepEndHour)) return false;
      
      // Check if bedtime started today
      if (isActivityOnDate(a, today)) return true;
      
      // Also check if bedtime started yesterday and is ongoing (hasn't ended yet)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (isActivityOnDate(a, yesterday)) {
        // If no end time, it's still ongoing
        if (!a.details?.endTime) return true;
        
        // If has end time, check if it extends into today
        const startStr = a.details?.startTime;
        const endStr = a.details?.endTime;
        if (!startStr || !endStr) return false;
        
        const startMins = parseToMinutes(startStr);
        const endMins = parseToMinutes(endStr);
        if (startMins == null || endMins == null) return false;
        
        // If end time < start time, sleep crosses midnight into today
        return endMins < startMins;
      }
      
      return false;
    }
    
    // For other subtypes, compare using the ACTIVITY's event (start) date
    if (!isActivityOnDate(a, today)) return false;
    
    if (subType === 'first-nap') {
      return isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour);
    }
    
    return true;
  });
}

function analyzePattern(
  activities: Activity[], 
  type: 'nap' | 'feed',
  timeRangeStart?: number, // minutes since midnight
  timeRangeEnd?: number,
  subType?: 'bedtime' | 'morning-wake' | 'first-nap',
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): ActivityPattern | null {
  const recent = getRecentActivities(activities, 14); // Last 14 days
  
  
  let relevantActivities = recent.filter(a => a.type === type);
  
  // Filter using napClassification utilities for subtypes
  if (subType === 'bedtime') {
    // For bedtime pattern, include all historical night sleeps (start times)
    const nightSleeps = relevantActivities.filter(a => 
      isNightSleep(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    
    relevantActivities = nightSleeps;
  } else if (subType === 'morning-wake') {
    // Get wake times from completed night sleeps
    relevantActivities = relevantActivities.filter(a => 
      isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && !!a.details?.endTime
    );
  } else if (timeRangeStart !== undefined && timeRangeEnd !== undefined) {
    relevantActivities = relevantActivities.filter(a => {
      const mins = timeToMinutes(a);
      return mins >= timeRangeStart && mins <= timeRangeEnd;
    });
  }
  
  // For first-nap, get only the first daytime nap of each day (using activity date, not logged date)
  if (subType === 'first-nap') {
    // Filter to only daytime naps
    relevantActivities = relevantActivities.filter(a => 
      isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    const napsByDay = new Map<string, Activity>();
    relevantActivities.forEach(a => {
      // Use getActivityEventDateString for consistent date grouping
      const dayKey = getActivityEventDateString(a);
      
      const existing = napsByDay.get(dayKey);
      if (!existing) {
        napsByDay.set(dayKey, a);
      } else {
        // Keep the earlier activity based on startTime
        const existingMins = timeToMinutes(existing);
        const currentMins = timeToMinutes(a);
        if (currentMins < existingMins) {
          napsByDay.set(dayKey, a);
        }
      }
    });
    relevantActivities = Array.from(napsByDay.values());
  }
  
  // For morning-wake, extract the end time instead of start time
  if (subType === 'morning-wake') {
    const times = relevantActivities
      .filter(a => a.details?.endTime)
      .map(a => {
        const endTime = a.details!.endTime as string;
        const match = endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return -1;
        
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      })
      .filter(t => t >= 0);
    
    if (times.length < 3) return null;  // Lowered from 5 to 3 for earlier detection
    
    const medianTime = median(times);
    const stdDev = standardDeviation(times);
    
    return {
      type,
      subType,
      times,
      medianTime,
      stdDev,
      occurrenceCount: times.length,
      gracePeriodMinutes: 60
    };
  }
  
  if (relevantActivities.length < 3) return null; // Lowered from 5 to 3 for earlier detection
  
  const times = relevantActivities.map(a => timeToMinutes(a));
  const medianTime = median(times);
  const stdDev = standardDeviation(times);
  
  // Determine grace period based on activity type
  let gracePeriodMinutes = 45; // default
  if (subType === 'bedtime') gracePeriodMinutes = 90;
  else if (subType === 'first-nap') gracePeriodMinutes = 60;
  
  return {
    type,
    subType,
    times,
    medianTime,
    stdDev,
    occurrenceCount: relevantActivities.length,
    gracePeriodMinutes
  };
}

// Calculate confidence score
function calculateConfidence(pattern: ActivityPattern): number {
  // Consistency: based on standard deviation (lower is better)
  const consistency = Math.max(0, 1 - (pattern.stdDev / 45)); // 45 min threshold
  
  // Completeness: based on occurrence count
  const completeness = Math.min(1, pattern.occurrenceCount / 7);
  
  // Recency weight: more recent patterns matter more
  const recency = Math.min(1, pattern.occurrenceCount / 10) * 1.2;
  
  return consistency * completeness * recency;
}

// Check if enough time has passed to show suggestion
function shouldShowSuggestion(pattern: ActivityPattern, currentMinutes: number): boolean {
  const timeSinceMedian = currentMinutes - pattern.medianTime;
  
  // Handle day boundary (e.g., for morning wake at 7 AM when current is 2 AM)
  let adjustedTimeSince = timeSinceMedian;
  if (timeSinceMedian < -12 * 60) { // More than 12 hours behind
    adjustedTimeSince = timeSinceMedian + 24 * 60;
  }
  
  return adjustedTimeSince >= pattern.gracePeriodMinutes;
}

export function useMissedActivityDetection(
  activities: Activity[],
  babyName?: string,
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7,
  householdId?: string
): MissedActivitySuggestion | null {
  const [currentTimeKey, setCurrentTimeKey] = useState(() => new Date().toISOString());

  // Re-check every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeKey(new Date().toISOString());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const currentTime = new Date();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Check if any activity was just accepted (within last 2 minutes)
    // This prevents prompts from reappearing immediately after logging
    const checkRecentAcceptance = (type: string, subType?: string) => {
      const acceptKey = `accepted-${householdId || 'household'}-${type}-${subType || 'default'}-${format(currentTime, 'yyyy-MM-dd-HH:mm')}`;
      const prevMinuteKey = `accepted-${householdId || 'household'}-${type}-${subType || 'default'}-${format(new Date(currentTime.getTime() - 60000), 'yyyy-MM-dd-HH:mm')}`;
      const acceptedNow = localStorage.getItem(acceptKey);
      const acceptedPrevMin = localStorage.getItem(prevMinuteKey);
      
      if (acceptedNow || acceptedPrevMin) {
        const timestamp = parseInt(acceptedNow || acceptedPrevMin || '0');
        const minutesSinceAccept = (Date.now() - timestamp) / 1000 / 60;
        if (minutesSinceAccept < 2) {
          return true;
        }
      }
      return false;
    };
    
    
    // Define patterns to monitor in priority order (using user's night sleep settings)
    const patternsToCheck: Array<{
      type: 'nap' | 'feed';
      subType?: 'bedtime' | 'morning-wake' | 'first-nap';
      timeStart?: number;
      timeEnd?: number;
      message: (time: string) => string;
    }> = [
      {
        type: 'nap',
        subType: 'bedtime',
        message: (time) => `Did ${babyName || 'baby'} go to bed around ${time}?`
      },
      {
        type: 'nap',
        subType: 'morning-wake',
        message: (time) => `Did ${babyName || 'baby'} wake up around ${time}?`
      },
      {
        type: 'feed',
        message: (time) => `Did ${babyName || 'baby'} have a feed around ${time}?`
      },
      {
        type: 'nap',
        subType: 'first-nap',
        message: (time) => `Did ${babyName || 'baby'} take a nap around ${time}?`
      }
    ];
    
    // Check each pattern
    for (const patternConfig of patternsToCheck) {
      console.log(`🔍 Checking pattern: ${patternConfig.type} ${patternConfig.subType || ''}`);
      
      // Special handling for morning-wake: Check if there's an ongoing night sleep
      if (patternConfig.subType === 'morning-wake') {
        const alreadyLogged = wasLoggedToday(activities, 'nap', 'morning-wake', nightSleepStartHour, nightSleepEndHour);
        
        if (alreadyLogged) {
          continue;
        }
        
        // Check for ongoing night sleep from yesterday or today (since night sleep spans dates)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const ongoingNightSleep = activities.find(a => {
          return a.type === 'nap' && 
                 isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && 
                 !a.details?.endTime && 
                 (isActivityOnDate(a, new Date()) || isActivityOnDate(a, yesterday));
        });
        
        // If there's ongoing night sleep, check if wake-up is overdue
        if (ongoingNightSleep) {
          const sleepStartMinutes = timeToMinutes(ongoingNightSleep);
          let expectedWakeMinutes = nightSleepEndHour * 60 + 30; // Default: 30 min after night end (e.g., 7:30 AM)
          
          // Use historical pattern if available
          const pattern = analyzePattern(
            activities,
            'nap',
            undefined,
            undefined,
            'morning-wake',
            nightSleepStartHour,
            nightSleepEndHour
          );
          
          if (pattern && pattern.occurrenceCount >= 3) {
            expectedWakeMinutes = pattern.medianTime;
          }
          
          // CRITICAL FIX: Only prompt for wake-up if we're actually in the morning
          // Current time should be AFTER nightSleepEndHour and BEFORE nightSleepStartHour
          const currentHour = currentTime.getHours();
          const isInMorning = currentHour >= nightSleepEndHour && currentHour < nightSleepStartHour;
          
          // Also check if the sleep started recently (within last 2 hours) - don't prompt if just started
          const sleepStarted = new Date(ongoingNightSleep.loggedAt || new Date());
          const hoursSinceSleepStart = (currentTime.getTime() - sleepStarted.getTime()) / (1000 * 60 * 60);
          const sleepJustStarted = hoursSinceSleepStart < 2;
          
          // If current time is > 1 hour past expected wake AND we're in the morning AND sleep didn't just start
          if (isInMorning && !sleepJustStarted && currentMinutes > expectedWakeMinutes + 60) {
            // Check localStorage for dismissals before returning
            const dismissalKey = `missed-${householdId || 'household'}-nap-morning-wake-${format(currentTime, 'yyyy-MM-dd')}`;
            const isDismissed = localStorage.getItem(dismissalKey) === 'true';
            
            if (isDismissed) {
              continue;
            }
            
            // Check for recent acceptance before showing
            if (checkRecentAcceptance('nap', 'morning-wake')) {
              continue;
            }
            
            const suggestedTime = minutesToTime(expectedWakeMinutes);
            return {
              activityType: 'nap',
              subType: 'morning-wake',
              suggestedTime,
              medianTimeMinutes: expectedWakeMinutes,
              confidence: 0.8,
              message: `Did ${babyName || 'baby'} wake up around ${suggestedTime}?`
            };
          }
          
          // Not overdue yet, skip
          continue;
        } else {
          // No ongoing night sleep, skip
          continue;
        }
      }
      
      // Skip if already logged today
      const alreadyLogged = wasLoggedToday(activities, patternConfig.type, patternConfig.subType, nightSleepStartHour, nightSleepEndHour);
      
      if (alreadyLogged) {
        console.log(`✓ Already logged today`);
        continue;
      }
      
      // Analyze pattern
      const pattern = analyzePattern(
        activities,
        patternConfig.type,
        patternConfig.timeStart,
        patternConfig.timeEnd,
        patternConfig.subType,
        nightSleepStartHour,
        nightSleepEndHour
      );
      
      
      if (!pattern) {
        console.log(`✗ No pattern found (need at least 3 occurrences)`);
        continue;
      }
      
      console.log(`📊 Pattern found:`, {
        medianTime: minutesToTime(pattern.medianTime),
        occurrences: pattern.occurrenceCount,
        stdDev: pattern.stdDev.toFixed(1),
        gracePeriod: pattern.gracePeriodMinutes
      });
      
      // Calculate confidence
      const confidence = calculateConfidence(pattern);
      const requiredConfidence = (pattern.type === 'nap' && pattern.subType === 'bedtime') ? 0.55 : 0.7;
      
      console.log(`🎯 Confidence: ${confidence.toFixed(2)} (required: ${requiredConfidence})`);
      
      // Only show high confidence suggestions
      if (confidence < requiredConfidence) {
        console.log(`✗ Confidence too low`);
        continue;
      }
      
      // Check if enough time has passed
      const shouldShow = shouldShowSuggestion(pattern, currentMinutes);
      
      console.log(`⏰ Current time: ${minutesToTime(currentMinutes)}, Should show: ${shouldShow}`);
      
      if (!shouldShow) {
        console.log(`✗ Not enough time passed (grace period: ${pattern.gracePeriodMinutes}min)`);
        continue;
      }
      
      // Check localStorage for dismissals
      const dismissalKey = `missed-${householdId || 'household'}-${pattern.type}-${pattern.subType || 'default'}-${format(currentTime, 'yyyy-MM-dd')}`;
      const isDismissed = localStorage.getItem(dismissalKey) === 'true';
      
      if (isDismissed) {
        console.log(`✗ Already dismissed today`);
        continue;
      }
      
      // Found a valid suggestion!
      // Check for recent acceptance before showing
      if (checkRecentAcceptance(pattern.type, pattern.subType)) {
        console.log(`✗ Recently accepted`);
        continue;
      }
      
      const suggestion = {
        activityType: pattern.type,
        subType: pattern.subType,
        suggestedTime: minutesToTime(pattern.medianTime),
        medianTimeMinutes: pattern.medianTime,
        confidence,
        message: patternConfig.message(minutesToTime(pattern.medianTime))
      };
      
      console.log(`✅ Showing missed activity prompt:`, suggestion.message);
      return suggestion;
    }
    
    return null;
  }, [activities, babyName, nightSleepStartHour, nightSleepEndHour, householdId, currentTimeKey]);
}
