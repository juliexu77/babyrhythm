import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { differenceInMinutes, parseISO, startOfDay, format } from "date-fns";

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

// Convert time string to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const date = new Date(timeStr);
  return date.getHours() * 60 + date.getMinutes();
}

// Convert minutes since midnight to readable time
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Get activities from the last N days
function getRecentActivities(activities: Activity[], days: number): Activity[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activities.filter(a => {
    const activityDate = parseISO(a.loggedAt);
    return activityDate >= cutoff;
  });
}

// Check if activity was already logged today
function wasLoggedToday(activities: Activity[], type: 'nap' | 'feed', subType?: string): boolean {
  const todayStart = startOfDay(new Date());
  
  return activities.some(a => {
    if (a.type !== type) return false;
    
    const activityDate = parseISO(a.loggedAt);
    if (activityDate < todayStart) return false;
    
    // Check subtype
    if (subType === 'bedtime') {
      const activityMinutes = timeToMinutes(a.loggedAt);
      return activityMinutes >= 18 * 60 && activityMinutes <= 22 * 60; // 6 PM - 10 PM
    } else if (subType === 'morning-wake') {
      const activityMinutes = timeToMinutes(a.loggedAt);
      return activityMinutes >= 5 * 60 && activityMinutes <= 9 * 60; // 5 AM - 9 AM
    } else if (subType === 'first-nap') {
      // Check if this is the first nap of the day
      const dayNaps = activities.filter(n => {
        if (n.type !== 'nap') return false;
        const napDate = parseISO(n.loggedAt);
        return napDate >= todayStart && napDate < activityDate;
      });
      return dayNaps.length === 0 && a.type === 'nap';
    }
    
    return true;
  });
}

// Analyze patterns for a specific activity type
function analyzePattern(
  activities: Activity[], 
  type: 'nap' | 'feed',
  timeRangeStart?: number, // minutes since midnight
  timeRangeEnd?: number,
  subType?: 'bedtime' | 'morning-wake' | 'first-nap'
): ActivityPattern | null {
  const recent = getRecentActivities(activities, 14); // Last 14 days
  
  let relevantActivities = recent.filter(a => a.type === type);
  
  // Filter by time range if specified
  if (timeRangeStart !== undefined && timeRangeEnd !== undefined) {
    relevantActivities = relevantActivities.filter(a => {
      const mins = timeToMinutes(a.loggedAt);
      return mins >= timeRangeStart && mins <= timeRangeEnd;
    });
  }
  
  // For first-nap, get only the first nap of each day
  if (subType === 'first-nap') {
    const napsByDay = new Map<string, Activity>();
    relevantActivities.forEach(a => {
      const dayKey = format(parseISO(a.loggedAt), 'yyyy-MM-dd');
      const existing = napsByDay.get(dayKey);
      if (!existing || parseISO(a.loggedAt) < parseISO(existing.loggedAt)) {
        napsByDay.set(dayKey, a);
      }
    });
    relevantActivities = Array.from(napsByDay.values());
  }
  
  if (relevantActivities.length < 5) return null; // Need at least 5 occurrences
  
  const times = relevantActivities.map(a => timeToMinutes(a.loggedAt));
  const medianTime = median(times);
  const stdDev = standardDeviation(times);
  
  // Determine grace period based on activity type
  let gracePeriodMinutes = 45; // default
  if (subType === 'bedtime') gracePeriodMinutes = 90;
  else if (subType === 'morning-wake') gracePeriodMinutes = 60;
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
  babyName?: string
): MissedActivitySuggestion | null {
  return useMemo(() => {
    const currentTime = new Date();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Define patterns to monitor in priority order
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
        timeStart: 18 * 60, // 6 PM
        timeEnd: 22 * 60,   // 10 PM
        message: (time) => `Did ${babyName || 'baby'} go to bed around ${time}?`
      },
      {
        type: 'nap',
        subType: 'morning-wake',
        timeStart: 5 * 60,  // 5 AM
        timeEnd: 9 * 60,    // 9 AM
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
      // Skip if already logged today
      if (wasLoggedToday(activities, patternConfig.type, patternConfig.subType)) {
        continue;
      }
      
      // Analyze pattern
      const pattern = analyzePattern(
        activities,
        patternConfig.type,
        patternConfig.timeStart,
        patternConfig.timeEnd,
        patternConfig.subType
      );
      
      if (!pattern) continue;
      
      // Calculate confidence
      const confidence = calculateConfidence(pattern);
      
      // Only show high confidence suggestions
      if (confidence < 0.7) continue;
      
      // Check if enough time has passed
      if (!shouldShowSuggestion(pattern, currentMinutes)) continue;
      
      // Check localStorage for dismissals
      const dismissalKey = `missed-${pattern.type}-${pattern.subType || 'default'}-${format(currentTime, 'yyyy-MM-dd')}`;
      const isDismissed = localStorage.getItem(dismissalKey) === 'true';
      if (isDismissed) continue;
      
      // Found a valid suggestion!
      return {
        activityType: pattern.type,
        subType: pattern.subType,
        suggestedTime: minutesToTime(pattern.medianTime),
        medianTimeMinutes: pattern.medianTime,
        confidence,
        message: patternConfig.message(minutesToTime(pattern.medianTime))
      };
    }
    
    return null;
  }, [activities, babyName]);
}
