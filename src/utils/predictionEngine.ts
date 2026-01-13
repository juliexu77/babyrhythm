import { Activity } from "@/components/ActivityCard";

// ---------------------------
// TYPES & INTERFACES
// ---------------------------

export interface PredictionEvent {
  id: string;
  type: string; // Use string to match Activity type
  timestamp: Date;
  startTime?: Date;
  endTime?: Date;
  details: any;
}

export interface SleepSegment {
  start: Date;
  end: Date | null;
  duration?: number; // minutes
  type: 'nap' | 'night';
}

export interface FeedEvent {
  timestamp: Date;
  volume?: number;
  type: 'bottle' | 'nursing';
}

export interface PersonalizedParams {
  wake_window_min: number; // minutes
  wake_window_max: number;
  feed_interval_min: number;
  feed_interval_max: number;
  day_sleep_target: number;
  nap_floor_short: number;
  // Position-specific wake windows (1st, 2nd, 3rd of the day)
  wakeWindowsByPosition?: Map<number, { median: number; count: number }>; // position -> learned pattern
}

export interface PredictionScores {
  feed: number;
  sleep: number;
}

export interface PredictionRationale {
  t_since_last_feed_min: number | null;
  t_awake_now_min: number | null;
  cumulative_day_sleep_min: number;
  day_sleep_target_min: number;
  last_nap_duration_min: number | null;
  scores: PredictionScores;
  night_or_day: 'day' | 'night';
  flags: {
    cluster_feeding?: boolean;
    short_nap?: boolean;
    illness?: boolean;
    data_gap?: boolean;
    tz_change?: boolean;
    night_feed_suppressed?: boolean; // True if night feed was suppressed because baby sleeps through
  };
}

export interface TimingPredictions {
  nextWakeAt?: Date;
  nextNapWindowStart?: Date;
  nextFeedAt?: Date;
  expectedFeedVolume?: number;
}

export interface DayProgress {
  feedsToday: number;
  napsToday: number;
  diapersToday: number;
  totalDaySleepMinutes: number;
  expectedFeedsMin: number;
  expectedFeedsMax: number;
  expectedNapsMin: number;
  expectedNapsMax: number;
}

export interface EngineInternals {
  learnedWakeWindowMedian?: number;
  learnedFeedIntervalMedian?: number;
  learnedDaySleepMedian?: number;
  wakeWindowStdDev?: number;
  feedIntervalStdDev?: number;
  dataStability: 'sparse' | 'unstable' | 'stable';
  blendRatio: { age: number; learned: number };
  wakeWindowsByPosition?: Map<number, { median: number; count: number }>; // position-specific patterns
  currentWakeWindowPosition?: number; // which wake window is baby currently in
}

export interface NextActionResult {
  intent: 'FEED_SOON' | 'START_WIND_DOWN' | 'INDEPENDENT_TIME' | 'LET_SLEEP_CONTINUE' | 'HOLD';
  confidence: 'high' | 'medium' | 'low';
  timing: TimingPredictions;
  reasons: string[];
  dayProgress: DayProgress;
  internals: EngineInternals;
  rationale: PredictionRationale;
  reevaluate_in_minutes: number;
}

// ---------------------------
// AGE-BASED PARAMETERS
// ---------------------------

const AGE_BRACKETS: Record<string, PersonalizedParams> = {
  "0-3mo": {
    wake_window_min: 45, // 45 minutes
    wake_window_max: 90, // 1.5 hours
    feed_interval_min: 120, // 2 hours
    feed_interval_max: 180, // 3 hours
    day_sleep_target: 240, // 4 hours
    nap_floor_short: 20, // 20 minutes
  },
  "4-6mo": {
    wake_window_min: 105, // 1h45m
    wake_window_max: 150, // 2.5h
    feed_interval_min: 150, // 2.5h
    feed_interval_max: 210, // 3.5h
    day_sleep_target: 180, // 3h
    nap_floor_short: 30, // 30m
  },
  "7-12mo": {
    wake_window_min: 180, // 3h
    wake_window_max: 240, // 4h
    feed_interval_min: 180, // 3h
    feed_interval_max: 300, // 5h
    day_sleep_target: 150, // 2.5h
    nap_floor_short: 45, // 45m
  }
};

// ---------------------------
// UTILITY FUNCTIONS
// ---------------------------

function calculateAgeInMonths(birthday: string): number {
  const birth = new Date(birthday);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - birth.getTime());
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  return diffMonths;
}

function getAgeParams(ageInMonths: number): PersonalizedParams {
  if (ageInMonths < 4) return AGE_BRACKETS["0-3mo"];
  if (ageInMonths < 7) return AGE_BRACKETS["4-6mo"];
  return AGE_BRACKETS["7-12mo"];
}

// CIRCADIAN FEATURE: Determine if a UTC timestamp falls in night hours
// NOTE: This function uses hardcoded night window (19-7) as a fallback
// since the prediction engine is stateless and doesn't have access to user profile.
// For UI components, use useNightSleepWindow() hook instead.
// 
// FUTURE IMPROVEMENT: Accept timezone parameter and convert UTC to local hour
// to properly handle circadian features across timezones
function isNightTime(timestamp: Date): boolean {
  const hour = timestamp.getHours(); // Gets local hour from Date object
  return hour >= 19 || hour < 7; // 7PM to 7AM (default fallback)
}

/**
 * Check if a time falls within the night window (typically bedtime to morning wake)
 * Handles cases where the window crosses midnight
 */
function isWithinNightWindow(
  time: Date, 
  bedtimeHour: number = 19, 
  wakeHour: number = 7
): boolean {
  const hour = time.getHours();
  
  if (bedtimeHour > wakeHour) {
    // Night crosses midnight: e.g., 7pm (19) to 7am (7)
    return hour >= bedtimeHour || hour < wakeHour;
  } else {
    // Night doesn't cross midnight (unusual, but handle it)
    return hour >= bedtimeHour && hour < wakeHour;
  }
}

/**
 * Analyze historical data to determine if baby has a pattern of night feeds
 * @param feedEvents - Array of feed events
 * @param ageInMonths - Baby's age in months
 * @param bedtimeHour - Hour when night starts (default 19 = 7PM)
 * @param wakeHour - Hour when morning starts (default 7 = 7AM)
 * @returns true if baby has a night feeding pattern, false if they sleep through
 */
function hasNightFeedPattern(
  feedEvents: FeedEvent[],
  ageInMonths: number,
  bedtimeHour: number = 19,
  wakeHour: number = 7
): boolean {
  // Newborns (under 3 months / ~12 weeks) always need night feeds
  if (ageInMonths < 3) {
    console.log('🍼 Night feed pattern: Always true for newborns under 3 months');
    return true;
  }
  
  // Check last 7 days of feeds
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentFeeds = feedEvents.filter(f => f.timestamp >= sevenDaysAgo);
  
  // Count feeds during night window
  const nightFeeds = recentFeeds.filter(f => {
    const feedHour = f.timestamp.getHours();
    return isWithinNightWindow(f.timestamp, bedtimeHour, wakeHour);
  });
  
  // Pattern exists if 2+ night feeds in last 7 days
  const hasPattern = nightFeeds.length >= 2;
  
  console.log('🌙 Night feed pattern analysis:', {
    ageInMonths,
    recentFeedsTotal: recentFeeds.length,
    nightFeedsCount: nightFeeds.length,
    hasPattern,
    threshold: 2,
    bedtimeHour,
    wakeHour,
    nightFeedTimes: nightFeeds.slice(0, 5).map(f => ({
      time: f.timestamp.toLocaleTimeString(),
      date: f.timestamp.toLocaleDateString()
    }))
  });
  
  return hasPattern;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

// ---------------------------
// DATA PROCESSING
// ---------------------------

// TIMEZONE ARCHITECTURE:
// - Storage: All timestamps stored as UTC ISO strings in database
// - Compute: All interval/duration calculations done in UTC
// - Display: Convert UTC to local only at display boundaries
// - Circadian features: Derive local hour from UTC + stored IANA timezone

function parseActivitiesToEvents(activities: Activity[]): PredictionEvent[] {
  const parsed = activities
    .filter(activity => activity.type !== 'note')
    .map(activity => {
      // Parse logged_at as UTC timestamp (canonical storage)
      // PostgreSQL timestamp with time zone is stored as UTC
      const utcTimestamp = activity.loggedAt ? new Date(activity.loggedAt) : new Date();
      
      // CRITICAL: Use UTC timestamp directly for all calculations
      // The loggedAt field already contains the correct UTC time when the activity occurred
      // We should NOT re-parse display times as they can cause timezone drift
      
      // Parse the actual activity time (e.g., "6:45 PM" for feeds)
      // Use loggedAt as canonical timestamp - it's already correct in UTC
      let activityTimestamp = utcTimestamp;
      
      // For naps with start/end times, calculate based on logged_at date
      let startTime: Date | undefined = undefined;
      let endTime: Date | undefined = undefined;
      
      if (activity.type === 'nap' && activity.details?.startTime) {
        // Use UTC date from loggedAt for consistency
        const loggedDate = new Date(utcTimestamp);
        
        // Parse start time
        const startMatch = activity.details.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (startMatch) {
          let startHours = parseInt(startMatch[1]);
          const startMinutes = parseInt(startMatch[2]);
          const startPeriod = startMatch[3].toUpperCase();
          if (startPeriod === 'PM' && startHours !== 12) startHours += 12;
          if (startPeriod === 'AM' && startHours === 12) startHours = 0;
          
          startTime = new Date(Date.UTC(
            loggedDate.getUTCFullYear(),
            loggedDate.getUTCMonth(),
            loggedDate.getUTCDate(),
            startHours,
            startMinutes,
            0,
            0
          ));
        }
        
        // Parse end time
        if (activity.details.endTime) {
          const endMatch = activity.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (endMatch) {
            let endHours = parseInt(endMatch[1]);
            const endMinutes = parseInt(endMatch[2]);
            const endPeriod = endMatch[3].toUpperCase();
            if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
            if (endPeriod === 'AM' && endHours === 12) endHours = 0;
            
            endTime = new Date(Date.UTC(
              loggedDate.getUTCFullYear(),
              loggedDate.getUTCMonth(),
              loggedDate.getUTCDate(),
              endHours,
              endMinutes,
              0,
              0
            ));
            
            // Handle naps that cross midnight
            if (startTime && endTime < startTime) {
              endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
            }
          }
        }
      }

      return {
        id: activity.id,
        type: activity.type,
        timestamp: activityTimestamp,  // Use loggedAt timestamp - already correct in UTC
        startTime,
        endTime,
        details: activity.details
      } as PredictionEvent;
    });
  
  const now = new Date();
  const filtered = parsed.filter(event => event.timestamp <= now);
  
  console.log('📋 parseActivitiesToEvents:', {
    input: activities.length,
    parsed: parsed.length,
    filtered: filtered.length,
    nowUTC: now.toISOString(),
    filteredOut: parsed.filter(e => e.timestamp > now).map(e => ({
      id: e.id,
      type: e.type,
      timestampUTC: e.timestamp.toISOString(),
      minutesInFuture: Math.round((e.timestamp.getTime() - now.getTime()) / 60000)
    })),
    feedEvents: filtered.filter(e => e.type === 'feed').slice(0, 5).map(e => ({
      id: e.id,
      timestampUTC: e.timestamp.toISOString(),
      minutesAgo: Math.round((now.getTime() - e.timestamp.getTime()) / 60000),
      details: e.details
    }))
  });
  
  // Sort by UTC timestamp (most recent first)
  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function extractSleepSegments(events: PredictionEvent[]): SleepSegment[] {
  const sleepEvents = events.filter(e => e.type === 'nap');

  console.log('💤 extractSleepSegments - raw naps:', sleepEvents.map(e => ({
    id: e.id,
    start: e.startTime?.toISOString() || e.timestamp.toISOString(),
    end: e.endTime?.toISOString() || 'null',
    hasEndTime: !!e.endTime
  })));

  const sleepSegments = sleepEvents
    .map(e => ({
      start: e.startTime || e.timestamp,
      end: e.endTime || null,
      type: (isNightTime(e.startTime || e.timestamp) ? 'night' : 'nap') as 'nap' | 'night'
    }))
    .sort((a, b) => b.start.getTime() - a.start.getTime()); // Most recent first
  
  console.log('💤 extractSleepSegments - processed segments:', sleepSegments.slice(0, 3).map(s => ({
    start: s.start.toISOString(),
    end: s.end?.toISOString() || 'null',
    type: s.type
  })));
    
  // Try to infer an end time for open sleeps using the next event after the start
  // But don't auto-close ongoing night sleep or very recent sleep
  const eventsAsc = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const now = new Date();
  sleepSegments.forEach(segment => {
    if (!segment.end) {
      const timeSinceStart = (now.getTime() - segment.start.getTime()) / 60000; // minutes
      const nextAfter = eventsAsc.find(e => e.timestamp > segment.start && e.type !== 'nap' && e.type !== 'night');
      
      // If there's a subsequent non-sleep activity (feed, diaper, etc.), 
      // the baby must have woken up by then - use that as the nap end time
      if (nextAfter && segment.type !== 'night') {
        segment.end = nextAfter.timestamp;
        console.log('🔄 Auto-closing nap based on subsequent activity:', {
          napStart: segment.start.toISOString(),
          nextActivity: nextAfter.timestamp.toISOString(),
          activityType: nextAfter.type
        });
      }
    }
  });
  
  // Add duration for completed segments, but keep ongoing ones too
  return sleepSegments.map(s => ({
    ...s,
    duration: s.end ? Math.round((s.end.getTime() - s.start.getTime()) / 60000) : undefined
  }));
}

function extractFeedEvents(events: PredictionEvent[]): FeedEvent[] {
  return events
    .filter(e => e.type === 'feed') // In the current system, feeds are just 'feed' type
    .map(e => ({
      timestamp: e.startTime && e.endTime 
        ? new Date((e.startTime.getTime() + e.endTime.getTime()) / 2) // Midpoint for nursing sessions
        : e.timestamp,
      volume: parseFloat(e.details.quantity || '0'),
      type: e.details.quantity ? 'bottle' : 'nursing' as 'bottle' | 'nursing'
    }));
}

// ---------------------------
// PERSONALIZATION
// ---------------------------

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

interface AdaptiveResult {
  params: PersonalizedParams;
  internals: {
    learnedWakeWindowMedian?: number;
    learnedFeedIntervalMedian?: number;
    learnedDaySleepMedian?: number;
    wakeWindowStdDev?: number;
    feedIntervalStdDev?: number;
    dataStability: 'sparse' | 'unstable' | 'stable';
    blendRatio: { age: number; learned: number };
    wakeWindows: number[];
    feedIntervals: number[];
    dailySleepTotals: number[];
    wakeWindowsByPosition?: Map<number, { median: number; count: number }>;
  };
}

function calculateAdaptiveParams(events: PredictionEvent[], baseParams: PersonalizedParams): AdaptiveResult {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => e.timestamp >= sevenDaysAgo);

  // Calculate wake windows with position tracking
  const sleepSegments = extractSleepSegments(recentEvents);
  const napSegments = sleepSegments.filter(s => s.type === 'nap' && s.end);
  
  // Group naps by day to track wake window positions
  const napsByDay = new Map<string, SleepSegment[]>();
  napSegments.forEach(nap => {
    const dayKey = nap.start.toDateString();
    if (!napsByDay.has(dayKey)) {
      napsByDay.set(dayKey, []);
    }
    napsByDay.get(dayKey)!.push(nap);
  });
  
  // Sort naps within each day by start time
  napsByDay.forEach(naps => naps.sort((a, b) => a.start.getTime() - b.start.getTime()));
  
  // Track wake windows by position (1st, 2nd, 3rd, etc.)
  const wakeWindowsByPosition = new Map<number, number[]>();
  const wakeWindows: number[] = [];
  
  napsByDay.forEach(dayNaps => {
    for (let i = 0; i < dayNaps.length - 1; i++) {
      const current = dayNaps[i];
      const next = dayNaps[i + 1];
      
      if (current.end && next.start) {
        const wakeWindow = Math.round((next.start.getTime() - current.end.getTime()) / 60000);
        
        // Filter out unrealistic wake windows
        if (wakeWindow > 0 && wakeWindow < 480) {
          wakeWindows.push(wakeWindow);
          
          // Track by position (i+1 because we're looking at wake window AFTER nap i)
          const position = i + 1;
          if (!wakeWindowsByPosition.has(position)) {
            wakeWindowsByPosition.set(position, []);
          }
          wakeWindowsByPosition.get(position)!.push(wakeWindow);
        }
      }
    }
  });

  // Calculate feed intervals
  const feedEvents = extractFeedEvents(recentEvents);
  const feedIntervals: number[] = [];
  
  for (let i = 0; i < feedEvents.length - 1; i++) {
    const interval = Math.round((feedEvents[i].timestamp.getTime() - feedEvents[i + 1].timestamp.getTime()) / 60000);
    if (interval > 0 && interval < 480) {
      feedIntervals.push(interval);
    }
  }

  // Calculate daily sleep totals
  const dailySleepTotals: number[] = [];
  const sleepByDay = new Map<string, number>();
  
  sleepSegments.forEach(segment => {
    if (segment.duration && segment.type === 'nap') {
      const dateKey = segment.start.toDateString();
      sleepByDay.set(dateKey, (sleepByDay.get(dateKey) || 0) + segment.duration);
    }
  });
  
  dailySleepTotals.push(...sleepByDay.values());

  // Determine blend ratio based on data quality
  let blendRatio = { age: 0.8, learned: 0.2 };
  let dataStability: 'sparse' | 'unstable' | 'stable' = 'sparse';

  if (wakeWindows.length >= 3 && feedIntervals.length >= 3) {
    const wakeStdDev = standardDeviation(wakeWindows);
    const wakeMedian = median(wakeWindows);
    const coefficientOfVariation = wakeStdDev / wakeMedian;
    
    console.log('📊 Data Stability Check:', {
      wakeWindows: wakeWindows.length,
      feedIntervals: feedIntervals.length,
      wakeMedian,
      wakeStdDev,
      coefficientOfVariation,
      threshold: 0.4
    });
    
    // Relaxed threshold: CV < 40% (was 30%) to account for natural baby rhythm variations
    const isStable = coefficientOfVariation < 0.4;
    
    if (isStable) {
      blendRatio = { age: 0.3, learned: 0.7 };
      dataStability = 'stable';
    } else {
      blendRatio = { age: 0.6, learned: 0.4 };
      dataStability = 'unstable';
    }
    
    console.log('✅ Data Stability Result:', dataStability);
  }

  // Apply blended parameters
  const adaptive = { ...baseParams };
  
  // Calculate position-specific medians (only if enough data per position)
  const positionMedians = new Map<number, { median: number; count: number }>();
  wakeWindowsByPosition.forEach((windows, position) => {
    if (windows.length >= 3) { // Minimum 3 samples per position
      positionMedians.set(position, {
        median: median(windows),
        count: windows.length
      });
    }
  });
  
  // Store position-specific patterns for use in predictions
  if (positionMedians.size > 0) {
    adaptive.wakeWindowsByPosition = positionMedians;
    
    console.log('📊 Position-Specific Wake Windows:', 
      Array.from(positionMedians.entries()).map(([pos, data]) => ({
        position: pos,
        median: Math.round(data.median),
        count: data.count,
        hours: Math.round(data.median / 60 * 10) / 10
      }))
    );
  }
  
  if (wakeWindows.length >= 3) {
    const medianWakeWindow = median(wakeWindows);
    const blended = baseParams.wake_window_max * blendRatio.age + medianWakeWindow * blendRatio.learned;
    
    // Enforce stricter minimum bounds to prevent unreasonably short wake windows
    // Use 80% of base params as absolute floor (not 70%)
    const minWakeWindowFloor = baseParams.wake_window_min * 0.8;
    const maxWakeWindowFloor = baseParams.wake_window_max * 0.8;
    
    adaptive.wake_window_min = clamp(blended * 0.8, minWakeWindowFloor, baseParams.wake_window_min * 1.5);
    adaptive.wake_window_max = clamp(blended, maxWakeWindowFloor, baseParams.wake_window_max * 1.5);
    
    console.log('📊 Wake Window Adaptation:', {
      baseMin: baseParams.wake_window_min,
      baseMax: baseParams.wake_window_max,
      learnedMedian: medianWakeWindow,
      blended,
      adaptedMin: adaptive.wake_window_min,
      adaptedMax: adaptive.wake_window_max,
      floorMin: minWakeWindowFloor,
      floorMax: maxWakeWindowFloor
    });
  }
  
  if (feedIntervals.length >= 3) {
    const medianFeedInterval = median(feedIntervals);
    const blended = baseParams.feed_interval_max * blendRatio.age + medianFeedInterval * blendRatio.learned;
    adaptive.feed_interval_min = clamp(blended * 0.8, baseParams.feed_interval_min * 0.7, baseParams.feed_interval_min * 1.5);
    adaptive.feed_interval_max = clamp(blended, baseParams.feed_interval_max * 0.7, baseParams.feed_interval_max * 1.5);
  }
  
  if (dailySleepTotals.length >= 3) {
    const medianDaySleep = median(dailySleepTotals);
    adaptive.day_sleep_target = clamp(medianDaySleep, 120, 300);
  }

  return {
    params: adaptive,
    internals: {
      learnedWakeWindowMedian: wakeWindows.length >= 3 ? median(wakeWindows) : undefined,
      learnedFeedIntervalMedian: feedIntervals.length >= 3 ? median(feedIntervals) : undefined,
      learnedDaySleepMedian: dailySleepTotals.length >= 3 ? median(dailySleepTotals) : undefined,
      wakeWindowStdDev: wakeWindows.length >= 3 ? standardDeviation(wakeWindows) : undefined,
      feedIntervalStdDev: feedIntervals.length >= 3 ? standardDeviation(feedIntervals) : undefined,
      dataStability,
      blendRatio,
      wakeWindows,
      feedIntervals,
      dailySleepTotals,
      wakeWindowsByPosition: positionMedians.size > 0 ? positionMedians : undefined
    }
  };
}

// ---------------------------
// CORE PREDICTION ENGINE
// ---------------------------

export class BabyCarePredictionEngine {
  private events: PredictionEvent[] = [];
  private sleepSegments: SleepSegment[] = [];
  private feedEvents: FeedEvent[] = [];
  private params: PersonalizedParams;
  private adaptiveParams: PersonalizedParams;
  private internals: EngineInternals;
  private ageInMonths: number;

  constructor(activities: Activity[], babyBirthday?: string) {
    this.events = parseActivitiesToEvents(activities);
    this.sleepSegments = extractSleepSegments(this.events);
    this.feedEvents = extractFeedEvents(this.events);
    
    this.ageInMonths = babyBirthday ? calculateAgeInMonths(babyBirthday) : 6;
    this.params = getAgeParams(this.ageInMonths);
    
    const adaptiveResult = calculateAdaptiveParams(this.events, this.params);
    this.adaptiveParams = adaptiveResult.params;
    this.internals = adaptiveResult.internals;
  }

  private getTimeSinceLastFeed(now: Date): number | null {
    if (this.feedEvents.length === 0) return null;
    const lastFeed = this.feedEvents[0];
    return Math.round((now.getTime() - lastFeed.timestamp.getTime()) / 60000);
  }

  private getTimeAwakeNow(now: Date): number | null {
    // Check for ongoing sleep (no end time) - within last 24 hours to avoid stale data
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ongoingSleep = this.sleepSegments.find(s => !s.end && s.start >= oneDayAgo && s.start <= now);
    if (ongoingSleep) {
      console.log('😴 Currently sleeping since:', ongoingSleep.start.toISOString());
      return null; // Currently asleep
    }
    
    const completeSleepSegments = this.sleepSegments.filter(s => s.end);
    if (completeSleepSegments.length === 0) return null;
    
    const lastSleep = completeSleepSegments[0];
    if (!lastSleep.end) return null;
    
    const awakeMinutes = Math.round((now.getTime() - lastSleep.end.getTime()) / 60000);
    console.log('⏰ Time awake:', {
      lastSleepEnd: lastSleep.end.toISOString(),
      awakeMinutes,
      awakeHours: Math.round(awakeMinutes / 60 * 10) / 10
    });
    
    return awakeMinutes;
  }

  private getCumulativeDaySleep(now: Date): number {
    // Use local day boundaries (not UTC)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    console.log('📅 Day boundaries:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString(),
      now: now.toISOString()
    });
    
    let totalDaySleep = 0;
    
    for (const segment of this.sleepSegments) {
      // Skip night sleep for day calculations (only count naps)
      if (segment.type === 'night') continue;
      
      const segmentStart = segment.start;
      let segmentEnd = segment.end;
      
      // For ongoing sleep (no end time), use current time
      if (!segmentEnd) {
        // Only count as ongoing if it started today and is still active
        if (segmentStart >= todayStart && segmentStart <= now) {
          segmentEnd = now;
          console.log('🔄 Including ongoing nap:', {
            start: segmentStart.toISOString(),
            end: segmentEnd.toISOString(),
            duration: Math.round((segmentEnd.getTime() - segmentStart.getTime()) / 60000)
          });
        } else {
          continue; // Skip ongoing naps from previous days
        }
      }
      
      // Calculate overlap with today's boundaries
      const overlapStart = new Date(Math.max(segmentStart.getTime(), todayStart.getTime()));
      const overlapEnd = new Date(Math.min(segmentEnd.getTime(), todayEnd.getTime()));
      
      // Only count if there's actual overlap
      if (overlapStart < overlapEnd) {
        const overlapMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
        totalDaySleep += overlapMinutes;
        
        console.log('💤 Counting sleep segment:', {
          segmentStart: segmentStart.toISOString(),
          segmentEnd: segmentEnd.toISOString(),
          overlapStart: overlapStart.toISOString(),
          overlapEnd: overlapEnd.toISOString(),
          overlapMinutes,
          totalSoFar: totalDaySleep
        });
      }
    }
    
    console.log('📊 Final day sleep total:', {
      totalMinutes: totalDaySleep,
      totalHours: Math.round(totalDaySleep / 60 * 10) / 10,
      segmentsCount: this.sleepSegments.length
    });
    
    return totalDaySleep;
  }

  private getLastNapDuration(): number | null {
    const dayNaps = this.sleepSegments.filter(s => s.type === 'nap');
    if (dayNaps.length === 0) return null;
    
    const lastNap = dayNaps[0];
    
    // For ongoing naps, calculate current duration
    if (!lastNap.end) {
      const ongoingDuration = Math.round((new Date().getTime() - lastNap.start.getTime()) / 60000);
      console.log('🔄 Ongoing nap duration:', ongoingDuration, 'minutes');
      return ongoingDuration;
    }
    
    // For completed naps, use stored duration or calculate
    const duration = lastNap.duration || 
      Math.round((lastNap.end.getTime() - lastNap.start.getTime()) / 60000);
    
    console.log('💤 Last completed nap duration:', duration, 'minutes');
    return duration;
  }

  private isClusterFeeding(): boolean {
    if (this.feedEvents.length < 3) return false;
    
    const recentFeeds = this.feedEvents.slice(0, 3);
    let shortIntervals = 0;
    
    for (let i = 0; i < recentFeeds.length - 1; i++) {
      const interval = Math.round((recentFeeds[i].timestamp.getTime() - recentFeeds[i + 1].timestamp.getTime()) / 60000);
      if (interval < this.adaptiveParams.feed_interval_min) {
        shortIntervals++;
      }
    }
    
    return shortIntervals >= 2;
  }

  /**
   * Check if baby has a night feeding pattern
   * Uses learned data from the engine's feed events
   */
  private hasNightFeedPattern(): boolean {
    return hasNightFeedPattern(this.feedEvents, this.ageInMonths);
  }

  private calculateFeedPressureScore(
    tSinceLastFeed: number | null,
    isNight: boolean,
    clusterFeeding: boolean,
    illness: boolean = false,
    predictedFeedTime?: Date
  ): { score: number; nightFeedSuppressed: boolean } {
    if (tSinceLastFeed === null) return { score: 0.8, nightFeedSuppressed: false }; // High pressure if no feed data
    
    const base = sigmoid((tSinceLastFeed - this.adaptiveParams.feed_interval_min) / 30);
    
    let modifiers = 1.0;
    if (clusterFeeding) modifiers *= 0.85;
    if (isNight) modifiers *= 0.9;
    if (illness) modifiers *= 1.15;
    
    let score = clamp(base * modifiers, 0, 1);
    let nightFeedSuppressed = false;
    
    // Night feed suppression: Don't predict night feeds if baby doesn't have that pattern
    // Only suppress if we're actually predicting a feed during night hours
    if (isNight && score >= 0.4) {
      const nightPattern = this.hasNightFeedPattern();
      
      if (!nightPattern) {
        // Baby sleeps through the night - suppress night feed predictions
        console.log('🌙 Suppressing night feed prediction - baby sleeps through the night');
        score = 0.15; // Very low score - won't trigger feed suggestion
        nightFeedSuppressed = true;
      }
    }
    
    return { score, nightFeedSuppressed };
  }

  private calculateSleepPressureScore(
    tAwakeNow: number | null,
    cumulativeDaySleep: number,
    shortNapFlag: boolean,
    isNight: boolean,
    now: Date
  ): number {
    if (tAwakeNow === null) return 0; // Can't calculate without wake time
    
    // CRITICAL FIX: Enforce minimum wake window - never suggest sleep if below age-appropriate minimum
    // This prevents premature wind-down suggestions immediately after waking
    const minWakeWindow = this.adaptiveParams.wake_window_min;
    if (tAwakeNow < minWakeWindow) {
      console.log('🚫 Sleep pressure = 0: Below minimum wake window', {
        awakeMinutes: tAwakeNow,
        minRequired: minWakeWindow,
        ageBasedMin: this.adaptiveParams.wake_window_min
      });
      return 0;
    }
    
    // Use position-specific wake window if available
    let targetWakeWindow = this.adaptiveParams.wake_window_max;
    
    if (this.adaptiveParams.wakeWindowsByPosition && this.adaptiveParams.wakeWindowsByPosition.size > 0) {
      const currentPosition = this.getCurrentWakeWindowPosition(now);
      const positionData = this.adaptiveParams.wakeWindowsByPosition.get(currentPosition);
      
      if (positionData && positionData.count >= 3) {
        // Use learned position-specific wake window
        targetWakeWindow = positionData.median;
        
        console.log('🎯 Using position-specific wake window:', {
          position: currentPosition,
          learned: Math.round(positionData.median),
          baseMax: this.adaptiveParams.wake_window_max,
          count: positionData.count
        });
      }
    }
    
    const w1 = sigmoid((tAwakeNow - targetWakeWindow) / 20);
    const sleepDeficit = this.adaptiveParams.day_sleep_target - cumulativeDaySleep;
    const w2 = sigmoid(sleepDeficit / 40);
    const w3 = shortNapFlag ? 0.15 : 0;
    
    let base = clamp(0.55 * w1 + 0.35 * w2 + w3, 0, 1);
    
    if (isNight) {
      base = Math.min(1.0, base + 0.1);
    }
    
    return base;
  }

  private applyTieBreakers(
    tSinceLastFeed: number | null,
    tAwakeNow: number | null,
    lastNapDuration: number | null
  ): 'FEED_NOW' | 'START_WIND_DOWN' | 'INDEPENDENT_TIME' {
    // Use age-appropriate minimum wake window (e.g., 45min for newborns, longer for older babies)
    const minCooldownAfterWake = this.adaptiveParams.wake_window_min;
    
    // If t_since_last_feed > feed_interval_max => choose FEED
    if (tSinceLastFeed && tSinceLastFeed > this.adaptiveParams.feed_interval_max) {
      return 'FEED_NOW';
    }
    
    // Else if t_awake_now > wake_window_max => choose NAP
    // BUT only if we've passed the minimum cooldown
    if (tAwakeNow && tAwakeNow > this.adaptiveParams.wake_window_max && tAwakeNow >= minCooldownAfterWake) {
      return 'START_WIND_DOWN';
    }
    
    // Short nap recovery logic - also enforce cooldown
    if (lastNapDuration && lastNapDuration <= this.adaptiveParams.nap_floor_short && 
        tAwakeNow && tAwakeNow >= 0.75 * this.adaptiveParams.wake_window_max && 
        tAwakeNow >= minCooldownAfterWake) {
      return 'START_WIND_DOWN';
    }
    
    // When both are approaching thresholds, favor the one closer to its limit
    // But don't suggest nap if below cooldown threshold
    if (tSinceLastFeed && tAwakeNow && tAwakeNow >= minCooldownAfterWake) {
      const feedProgress = tSinceLastFeed / this.adaptiveParams.feed_interval_max;
      const napProgress = tAwakeNow / this.adaptiveParams.wake_window_max;
      
      // If either is > 80% of max, choose it
      if (feedProgress > 0.8) return 'FEED_NOW';
      if (napProgress > 0.8) return 'START_WIND_DOWN';
      
      // Otherwise choose whichever is further along
      return feedProgress > napProgress ? 'FEED_NOW' : 'START_WIND_DOWN';
    }
    
    // If we're below cooldown and have feed data, suggest feeding
    if (tSinceLastFeed && tAwakeNow && tAwakeNow < minCooldownAfterWake) {
      const feedProgress = tSinceLastFeed / this.adaptiveParams.feed_interval_max;
      if (feedProgress > 0.5) return 'FEED_NOW';
    }
    
    return 'INDEPENDENT_TIME';
  }

  private getExpectedFeeds(): { min: number; max: number } {
    if (this.ageInMonths < 1) return { min: 8, max: 12 };
    if (this.ageInMonths < 3) return { min: 6, max: 8 };
    if (this.ageInMonths < 6) return { min: 5, max: 7 };
    if (this.ageInMonths < 9) return { min: 4, max: 6 };
    if (this.ageInMonths < 12) return { min: 3, max: 5 };
    return { min: 3, max: 4 };
  }

  private getExpectedNaps(): { min: number; max: number } {
    if (this.ageInMonths < 3) return { min: 4, max: 6 };
    if (this.ageInMonths < 6) return { min: 3, max: 4 };
    if (this.ageInMonths < 9) return { min: 2, max: 3 };
    if (this.ageInMonths < 12) return { min: 2, max: 3 };
    if (this.ageInMonths < 18) return { min: 1, max: 2 };
    return { min: 1, max: 2 };
  }

  private getCurrentWakeWindowPosition(now: Date): number {
    // Determine which wake window of the day we're in based on completed naps today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const completedNapsToday = this.sleepSegments.filter(s => 
      s.type === 'nap' &&
      s.start >= todayStart && 
      s.start < todayEnd && 
      s.end !== null
    ).length;
    
    // Position is number of completed naps + 1
    // 0 naps = position 1 (first wake window of the day)
    // 1 nap = position 2 (second wake window, after first nap)
    // etc.
    return completedNapsToday + 1;
  }

  private getDayProgress(now: Date): DayProgress {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayEvents = this.events.filter(e => e.timestamp >= todayStart && e.timestamp < todayEnd);
    const feedsToday = todayEvents.filter(e => e.type === 'feed').length;
    const napsToday = this.sleepSegments.filter(s => 
      s.start >= todayStart && s.start < todayEnd && s.end !== null
    ).length;
    const diapersToday = todayEvents.filter(e => e.type === 'diaper').length;
    
    const expectedFeeds = this.getExpectedFeeds();
    const expectedNaps = this.getExpectedNaps();

    return {
      feedsToday,
      napsToday,
      diapersToday,
      totalDaySleepMinutes: this.getCumulativeDaySleep(now),
      expectedFeedsMin: expectedFeeds.min,
      expectedFeedsMax: expectedFeeds.max,
      expectedNapsMin: expectedNaps.min,
      expectedNapsMax: expectedNaps.max
    };
  }

  private generateReasons(rationale: PredictionRationale, intent: string): string[] {
    const reasons: string[] = [];
    
    if (rationale.t_awake_now_min !== null && intent.includes('WIND_DOWN')) {
      const hours = Math.floor(rationale.t_awake_now_min / 60);
      const mins = rationale.t_awake_now_min % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      reasons.push(`Awake for ${timeStr}`);
    }

    if (rationale.t_since_last_feed_min !== null && intent.includes('FEED')) {
      const hours = Math.floor(rationale.t_since_last_feed_min / 60);
      const mins = rationale.t_since_last_feed_min % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      reasons.push(`${timeStr} since last feed`);
    }

    if (rationale.flags.short_nap && intent.includes('WIND_DOWN')) {
      reasons.push('Last nap was shorter than typical');
    }

    if (rationale.cumulative_day_sleep_min < rationale.day_sleep_target_min * 0.7) {
      reasons.push('Day sleep is below target');
    }

    if (rationale.flags.cluster_feeding) {
      reasons.push('Cluster feeding pattern detected');
    }

    if (rationale.night_or_day === 'night') {
      reasons.push('Evening hours — winding down time');
    }

    return reasons;
  }

  private calculateTimingPredictions(now: Date, rationale: PredictionRationale): TimingPredictions {
    const timing: TimingPredictions = {};

    // Calculate next feed time
    if (rationale.t_since_last_feed_min !== null) {
      const nextFeedMinutes = this.adaptiveParams.feed_interval_max - rationale.t_since_last_feed_min;
      if (nextFeedMinutes > 0) {
        timing.nextFeedAt = new Date(now.getTime() + nextFeedMinutes * 60000);
      } else {
        timing.nextFeedAt = now;
      }
    }

    // Calculate expected feed volume
    const recentFeeds = this.feedEvents.slice(0, 3).filter(f => f.volume && f.volume > 0);
    if (recentFeeds.length > 0) {
      const avgVolume = recentFeeds.reduce((sum, f) => sum + (f.volume || 0), 0) / recentFeeds.length;
      timing.expectedFeedVolume = Math.round(avgVolume);
    }

    // Calculate next nap window if awake - use position-specific wake window if available
    if (rationale.t_awake_now_min !== null) {
      // Use age-appropriate minimum wake window (e.g., 45min for newborns, longer for older babies)
      const minCooldownAfterWake = this.adaptiveParams.wake_window_min;
      
      console.log('🔍 Calculating nap window:', {
        awakeMinutes: rationale.t_awake_now_min,
        ageBasedMinWakeWindow: minCooldownAfterWake,
        belowMinimum: rationale.t_awake_now_min < minCooldownAfterWake
      });
      
      // ALWAYS enforce minimum wake window - never predict nap sooner than age-appropriate minimum
      if (rationale.t_awake_now_min < minCooldownAfterWake) {
        const remainingCooldown = minCooldownAfterWake - rationale.t_awake_now_min;
        timing.nextNapWindowStart = new Date(now.getTime() + remainingCooldown * 60000);
        console.log('✅ Applied cooldown:', {
          remainingCooldown,
          nextNapAt: timing.nextNapWindowStart.toLocaleTimeString()
        });
      } else {
        // Use position-specific wake window if available
        let targetWakeWindow = this.adaptiveParams.wake_window_max;
        
        if (this.adaptiveParams.wakeWindowsByPosition && this.adaptiveParams.wakeWindowsByPosition.size > 0) {
          const currentPosition = this.getCurrentWakeWindowPosition(now);
          const positionData = this.adaptiveParams.wakeWindowsByPosition.get(currentPosition);
          
          if (positionData && positionData.count >= 3) {
            targetWakeWindow = positionData.median;
            console.log('📍 Using position-specific wake window:', {
              position: currentPosition,
              targetMinutes: targetWakeWindow,
              samples: positionData.count
            });
          }
        }
        
        const napWindowMinutes = targetWakeWindow - rationale.t_awake_now_min;
        
        if (napWindowMinutes > 0) {
          timing.nextNapWindowStart = new Date(now.getTime() + napWindowMinutes * 60000);
          console.log('✅ Calculated nap window:', {
            targetWakeWindow,
            napWindowMinutes,
            nextNapAt: timing.nextNapWindowStart.toLocaleTimeString()
          });
        } else {
          // Baby has been awake longer than target - nap is overdue
          timing.nextNapWindowStart = now;
          console.log('⚠️ Nap overdue - baby awake longer than target');
        }
      }
    }

    // Calculate next wake time if sleeping
    if (rationale.t_awake_now_min === null && this.sleepSegments.length > 0) {
      const ongoingSleep = this.sleepSegments.find(s => !s.end);
      if (ongoingSleep) {
        // For night sleep, use much longer expected duration
        if (ongoingSleep.type === 'night') {
          // Night sleep: 8-12 hours depending on age
          let expectedNightDuration = 600; // 10 hours default
          if (this.ageInMonths < 3) expectedNightDuration = 480; // 8 hours for newborns (more frequent wakes)
          else if (this.ageInMonths < 6) expectedNightDuration = 600; // 10 hours
          else expectedNightDuration = 660; // 11 hours for older babies
          
          timing.nextWakeAt = new Date(ongoingSleep.start.getTime() + expectedNightDuration * 60000);
        } else {
          // Day nap: use age-appropriate nap duration
          let expectedNapDuration = 90;
          if (this.ageInMonths < 3) expectedNapDuration = 120;
          else if (this.ageInMonths < 6) expectedNapDuration = 90;
          else if (this.ageInMonths < 12) expectedNapDuration = 75;
          else expectedNapDuration = 60;

          // Blend with learned if available
          if (this.internals.learnedDaySleepMedian && this.internals.dataStability !== 'sparse') {
            const dayNaps = this.getDayProgress(now).napsToday || 3;
            const learnedAvgNap = this.internals.learnedDaySleepMedian / Math.max(dayNaps, 2);
            expectedNapDuration = expectedNapDuration * this.internals.blendRatio.age + 
                                 learnedAvgNap * this.internals.blendRatio.learned;
          }

          timing.nextWakeAt = new Date(ongoingSleep.start.getTime() + expectedNapDuration * 60000);
        }
      }
    }

    return timing;
  }

  public getNextAction(now: Date = new Date()): NextActionResult {
    const isNight = isNightTime(now);
    const tSinceLastFeed = this.getTimeSinceLastFeed(now);
    const tAwakeNow = this.getTimeAwakeNow(now);
    const cumulativeDaySleep = this.getCumulativeDaySleep(now);
    const lastNapDuration = this.getLastNapDuration();
    const clusterFeeding = this.isClusterFeeding();
    const shortNapFlag = lastNapDuration !== null && lastNapDuration <= this.adaptiveParams.nap_floor_short;
    const dataGap = tSinceLastFeed === null || tSinceLastFeed > 360; // 6+ hours

    // Check if currently sleeping
    if (tAwakeNow === null) {
      const rationale: PredictionRationale = {
        t_since_last_feed_min: tSinceLastFeed,
        t_awake_now_min: null,
        cumulative_day_sleep_min: cumulativeDaySleep,
        day_sleep_target_min: this.adaptiveParams.day_sleep_target,
        last_nap_duration_min: lastNapDuration,
        scores: { feed: 0, sleep: 1 },
        night_or_day: isNight ? 'night' : 'day',
        flags: { cluster_feeding: clusterFeeding, short_nap: shortNapFlag, data_gap: dataGap }
      };

      return {
        intent: 'LET_SLEEP_CONTINUE',
        confidence: 'high',
        timing: this.calculateTimingPredictions(now, rationale),
        reasons: ['Currently sleeping'],
        dayProgress: this.getDayProgress(now),
        internals: this.internals,
        rationale,
        reevaluate_in_minutes: 30
      };
    }

    // Data gap handling
    if (dataGap) {
      const rationale: PredictionRationale = {
        t_since_last_feed_min: tSinceLastFeed,
        t_awake_now_min: tAwakeNow,
        cumulative_day_sleep_min: cumulativeDaySleep,
        day_sleep_target_min: this.adaptiveParams.day_sleep_target,
        last_nap_duration_min: lastNapDuration,
        scores: { feed: 0.8, sleep: 0 },
        night_or_day: isNight ? 'night' : 'day',
        flags: { cluster_feeding: clusterFeeding, short_nap: shortNapFlag, data_gap: true }
      };

      return {
        intent: 'FEED_SOON',
        confidence: 'low',
        timing: this.calculateTimingPredictions(now, rationale),
        reasons: ['Not enough recent data', 'Feed likely overdue'],
        dayProgress: this.getDayProgress(now),
        internals: this.internals,
        rationale,
        reevaluate_in_minutes: 45
      };
    }

    // Calculate predicted feed time to determine if it falls in night hours
    // FIX: Check if PREDICTED feed time is night, not current time
    let predictedFeedTime: Date | undefined;
    if (tSinceLastFeed !== null) {
      const nextFeedMinutes = Math.max(0, this.adaptiveParams.feed_interval_max - tSinceLastFeed);
      predictedFeedTime = new Date(now.getTime() + nextFeedMinutes * 60000);
    }
    
    // Use predicted feed time for night check, fall back to current time
    const isNightForFeed = predictedFeedTime ? isNightTime(predictedFeedTime) : isNight;
    
    // Calculate pressure scores
    const feedResult = this.calculateFeedPressureScore(tSinceLastFeed, isNightForFeed, clusterFeeding, false, predictedFeedTime);
    const feedScore = feedResult.score;
    const nightFeedSuppressed = feedResult.nightFeedSuppressed;
    const sleepScore = this.calculateSleepPressureScore(tAwakeNow, cumulativeDaySleep, shortNapFlag, isNight, now);
    
    // Track current wake window position in internals
    const currentPosition = this.getCurrentWakeWindowPosition(now);
    this.internals.currentWakeWindowPosition = currentPosition;
    
    const THRESHOLD_FEED = 0.55;
    const THRESHOLD_WIND_DOWN = 0.60;
    const DECISION_MARGIN = 0.08;

    type Intent = 'FEED_SOON' | 'START_WIND_DOWN' | 'INDEPENDENT_TIME' | 'LET_SLEEP_CONTINUE' | 'HOLD';
    let intent: Intent;
    let confidenceScore = Math.max(feedScore, sleepScore);
    let conflictZone = false;

    // Primary decision logic
    if (feedScore >= THRESHOLD_FEED && feedScore - sleepScore > DECISION_MARGIN) {
      intent = 'FEED_SOON';
    } else if (sleepScore >= THRESHOLD_WIND_DOWN && sleepScore - feedScore > DECISION_MARGIN) {
      intent = 'START_WIND_DOWN';
    } else {
      // Conflict zone - apply tie breakers
      conflictZone = true;
      const tieBreaker = this.applyTieBreakers(tSinceLastFeed, tAwakeNow, lastNapDuration);
      intent = tieBreaker === 'FEED_NOW' ? 'FEED_SOON' : tieBreaker;
      
      // Night-time override for independent time
      if (intent === 'INDEPENDENT_TIME' && isNight) {
        intent = 'START_WIND_DOWN';
      }
      
      // Prevent extending beyond wake window max unless feed overdue
      if (intent === 'INDEPENDENT_TIME' && tAwakeNow > this.adaptiveParams.wake_window_max && feedScore < THRESHOLD_FEED) {
        intent = 'START_WIND_DOWN';
      }
    }

    // Adjust confidence - be less penalizing for stable data
    if (conflictZone && this.internals.dataStability !== 'stable') {
      confidenceScore -= 0.05;
    }
    if (dataGap) confidenceScore -= 0.1;
    confidenceScore = clamp(confidenceScore, 0.2, 0.95);

    // Map to confidence level - prioritize stable data patterns
    let confidence: 'high' | 'medium' | 'low';
    
    // Stable data with clear decision = high confidence
    if (confidenceScore >= 0.7 && !conflictZone && this.internals.dataStability === 'stable') {
      confidence = 'high';
    } 
    // Stable data always gets at least medium confidence, even in conflict
    else if (this.internals.dataStability === 'stable') {
      confidence = 'medium';
    }
    // Decent score with unstable data
    else if (confidenceScore >= 0.6 && this.internals.dataStability === 'unstable') {
      confidence = 'medium';
    }
    // Lower scores or sparse data
    else if (confidenceScore >= 0.45) {
      confidence = 'medium';
    }
    else {
      confidence = 'low';
    }

    // Determine reevaluation time
    const reevaluateIn = {
      'FEED_SOON': 45,
      'START_WIND_DOWN': 10,
      'INDEPENDENT_TIME': 10,
      'LET_SLEEP_CONTINUE': 30,
      'HOLD': 10
    }[intent];

    const rationale: PredictionRationale = {
      t_since_last_feed_min: tSinceLastFeed,
      t_awake_now_min: tAwakeNow,
      cumulative_day_sleep_min: cumulativeDaySleep,
      day_sleep_target_min: this.adaptiveParams.day_sleep_target,
      last_nap_duration_min: lastNapDuration,
      scores: { feed: feedScore, sleep: sleepScore },
      night_or_day: isNight ? 'night' : 'day',
      flags: {
        cluster_feeding: clusterFeeding,
        short_nap: shortNapFlag,
        data_gap: dataGap,
        night_feed_suppressed: nightFeedSuppressed
      }
    };

    return {
      intent,
      confidence,
      timing: this.calculateTimingPredictions(now, rationale),
      reasons: this.generateReasons(rationale, intent),
      dayProgress: this.getDayProgress(now),
      internals: this.internals,
      rationale,
      reevaluate_in_minutes: reevaluateIn
    };
  }
}