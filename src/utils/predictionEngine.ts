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
  };
}

export interface NextActionResult {
  next_action: 'FEED_NOW' | 'START_WIND_DOWN' | 'INDEPENDENT_TIME' | 'LET_SLEEP_CONTINUE' | 'HOLD';
  confidence: number;
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

function isNightTime(timestamp: Date): boolean {
  const hour = timestamp.getHours();
  return hour >= 19 || hour < 7; // 7PM to 7AM
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

function parseActivitiesToEvents(activities: Activity[]): PredictionEvent[] {
  return activities
    .filter(activity => activity.type !== 'note') // Ignore notes and other non-essential logs
    .map(activity => ({
      id: activity.id,
      type: activity.type,
      timestamp: new Date(activity.time),
      startTime: activity.details.startTime ? new Date(activity.details.startTime) : undefined,
      endTime: activity.details.endTime ? new Date(activity.details.endTime) : undefined,
      details: activity.details
    }))
    .filter(event => event.timestamp <= new Date()) // Remove future events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Most recent first
}

function extractSleepSegments(events: PredictionEvent[]): SleepSegment[] {
  return events
    .filter(e => e.type === 'nap')
    .map(e => ({
      start: e.startTime || e.timestamp,
      end: e.endTime || null,
      type: (isNightTime(e.startTime || e.timestamp) ? 'night' : 'nap') as 'nap' | 'night'
    }))
    .filter(s => s.end) // Only complete sleep segments
    .map(s => ({
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

function calculateAdaptiveParams(events: PredictionEvent[], baseParams: PersonalizedParams): PersonalizedParams {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => e.timestamp >= threeDaysAgo);

  // Calculate wake windows
  const sleepSegments = extractSleepSegments(recentEvents);
  const wakeWindows: number[] = [];
  
  for (let i = 0; i < sleepSegments.length - 1; i++) {
    const current = sleepSegments[i];
    const next = sleepSegments[i + 1];
    if (current.end && next.start) {
      const wakeWindow = Math.round((next.start.getTime() - current.end.getTime()) / 60000);
      if (wakeWindow > 0 && wakeWindow < 480) { // Reasonable wake window (< 8h)
        wakeWindows.push(wakeWindow);
      }
    }
  }

  // Calculate feed intervals
  const feedEvents = extractFeedEvents(recentEvents);
  const feedIntervals: number[] = [];
  
  for (let i = 0; i < feedEvents.length - 1; i++) {
    const interval = Math.round((feedEvents[i].timestamp.getTime() - feedEvents[i + 1].timestamp.getTime()) / 60000);
    if (interval > 0 && interval < 480) { // Reasonable interval (< 8h)
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

  // Apply adaptive parameters with sufficient data points
  const adaptive = { ...baseParams };
  
  if (wakeWindows.length >= 4) {
    const medianWakeWindow = median(wakeWindows);
    adaptive.wake_window_min = clamp(medianWakeWindow * 0.8, baseParams.wake_window_min * 0.7, baseParams.wake_window_min * 1.3);
    adaptive.wake_window_max = clamp(medianWakeWindow * 1.2, baseParams.wake_window_max * 0.7, baseParams.wake_window_max * 1.3);
  }
  
  if (feedIntervals.length >= 4) {
    const medianFeedInterval = median(feedIntervals);
    adaptive.feed_interval_min = clamp(medianFeedInterval * 0.8, baseParams.feed_interval_min * 0.7, baseParams.feed_interval_min * 1.3);
    adaptive.feed_interval_max = clamp(medianFeedInterval * 1.2, baseParams.feed_interval_max * 0.7, baseParams.feed_interval_max * 1.3);
  }
  
  if (dailySleepTotals.length >= 3) {
    const medianDaySleep = median(dailySleepTotals);
    adaptive.day_sleep_target = clamp(medianDaySleep, 120, 270); // 2-4.5 hours
  }

  return adaptive;
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

  constructor(activities: Activity[], babyBirthday?: string) {
    this.events = parseActivitiesToEvents(activities);
    this.sleepSegments = extractSleepSegments(this.events);
    this.feedEvents = extractFeedEvents(this.events);
    
    const ageInMonths = babyBirthday ? calculateAgeInMonths(babyBirthday) : 6;
    this.params = getAgeParams(ageInMonths);
    this.adaptiveParams = calculateAdaptiveParams(this.events, this.params);
  }

  private getTimeSinceLastFeed(now: Date): number | null {
    if (this.feedEvents.length === 0) return null;
    const lastFeed = this.feedEvents[0];
    return Math.round((now.getTime() - lastFeed.timestamp.getTime()) / 60000);
  }

  private getTimeAwakeNow(now: Date): number | null {
    const completeSleepSegments = this.sleepSegments.filter(s => s.end);
    if (completeSleepSegments.length === 0) return null;
    
    const lastSleep = completeSleepSegments[0];
    if (!lastSleep.end) return null;
    
    // Check if baby is currently sleeping
    const ongoingSleep = this.sleepSegments.find(s => !s.end && s.start <= now);
    if (ongoingSleep) return null; // Currently asleep
    
    return Math.round((now.getTime() - lastSleep.end.getTime()) / 60000);
  }

  private getCumulativeDaySleep(now: Date): number {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    return this.sleepSegments
      .filter(s => s.type === 'nap' && s.start >= todayStart && s.duration)
      .reduce((total, s) => total + (s.duration || 0), 0);
  }

  private getLastNapDuration(): number | null {
    const dayNaps = this.sleepSegments.filter(s => s.type === 'nap' && s.duration);
    return dayNaps.length > 0 ? dayNaps[0].duration || null : null;
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

  private calculateFeedPressureScore(
    tSinceLastFeed: number | null,
    isNight: boolean,
    clusterFeeding: boolean,
    illness: boolean = false
  ): number {
    if (tSinceLastFeed === null) return 0.8; // High pressure if no feed data
    
    const base = sigmoid((tSinceLastFeed - this.adaptiveParams.feed_interval_min) / 30);
    
    let modifiers = 1.0;
    if (clusterFeeding) modifiers *= 0.85;
    if (isNight) modifiers *= 0.9;
    if (illness) modifiers *= 1.15;
    
    return clamp(base * modifiers, 0, 1);
  }

  private calculateSleepPressureScore(
    tAwakeNow: number | null,
    cumulativeDaySleep: number,
    shortNapFlag: boolean,
    isNight: boolean
  ): number {
    if (tAwakeNow === null) return 0; // Can't calculate without wake time
    
    const w1 = sigmoid((tAwakeNow - this.adaptiveParams.wake_window_max) / 20);
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
    // If t_since_last_feed > feed_interval_max => choose FEED
    if (tSinceLastFeed && tSinceLastFeed > this.adaptiveParams.feed_interval_max) {
      return 'FEED_NOW';
    }
    
    // Else if t_awake_now > wake_window_max => choose NAP
    if (tAwakeNow && tAwakeNow > this.adaptiveParams.wake_window_max) {
      return 'START_WIND_DOWN';
    }
    
    // Short nap recovery logic
    if (lastNapDuration && lastNapDuration <= this.adaptiveParams.nap_floor_short && 
        tAwakeNow && tAwakeNow >= 0.75 * this.adaptiveParams.wake_window_max) {
      return 'START_WIND_DOWN';
    }
    
    return 'INDEPENDENT_TIME';
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
      return {
        next_action: 'LET_SLEEP_CONTINUE',
        confidence: 0.9,
        rationale: {
          t_since_last_feed_min: tSinceLastFeed,
          t_awake_now_min: null,
          cumulative_day_sleep_min: cumulativeDaySleep,
          day_sleep_target_min: this.adaptiveParams.day_sleep_target,
          last_nap_duration_min: lastNapDuration,
          scores: { feed: 0, sleep: 1 },
          night_or_day: isNight ? 'night' : 'day',
          flags: { cluster_feeding: clusterFeeding, short_nap: shortNapFlag, data_gap: dataGap }
        },
        reevaluate_in_minutes: 30
      };
    }

    // Data gap handling
    if (dataGap) {
      return {
        next_action: 'FEED_NOW',
        confidence: 0.3,
        rationale: {
          t_since_last_feed_min: tSinceLastFeed,
          t_awake_now_min: tAwakeNow,
          cumulative_day_sleep_min: cumulativeDaySleep,
          day_sleep_target_min: this.adaptiveParams.day_sleep_target,
          last_nap_duration_min: lastNapDuration,
          scores: { feed: 0.8, sleep: 0 },
          night_or_day: isNight ? 'night' : 'day',
          flags: { cluster_feeding: clusterFeeding, short_nap: shortNapFlag, data_gap: true }
        },
        reevaluate_in_minutes: 45
      };
    }

    // Calculate pressure scores
    const feedScore = this.calculateFeedPressureScore(tSinceLastFeed, isNight, clusterFeeding);
    const sleepScore = this.calculateSleepPressureScore(tAwakeNow, cumulativeDaySleep, shortNapFlag, isNight);
    
    const THRESHOLD_FEED = 0.55;
    const THRESHOLD_WIND_DOWN = 0.60;
    const DECISION_MARGIN = 0.08;

    let nextAction: NextActionResult['next_action'];
    let confidence = Math.max(feedScore, sleepScore);
    let conflictZone = false;

    // Primary decision logic
    if (feedScore >= THRESHOLD_FEED && feedScore - sleepScore > DECISION_MARGIN) {
      nextAction = 'FEED_NOW';
    } else if (sleepScore >= THRESHOLD_WIND_DOWN && sleepScore - feedScore > DECISION_MARGIN) {
      nextAction = 'START_WIND_DOWN';
    } else {
      // Conflict zone - apply tie breakers
      conflictZone = true;
      nextAction = this.applyTieBreakers(tSinceLastFeed, tAwakeNow, lastNapDuration);
      
      // Night-time override for independent time
      if (nextAction === 'INDEPENDENT_TIME' && isNight) {
        nextAction = 'START_WIND_DOWN';
      }
      
      // Prevent extending beyond wake window max unless feed overdue
      if (nextAction === 'INDEPENDENT_TIME' && tAwakeNow > this.adaptiveParams.wake_window_max && feedScore < THRESHOLD_FEED) {
        nextAction = 'START_WIND_DOWN';
      }
    }

    // Adjust confidence
    if (conflictZone) confidence -= 0.05;
    if (dataGap) confidence -= 0.1;
    confidence = clamp(confidence, 0.2, 0.95);

    // Determine reevaluation time
    const reevaluateIn = {
      'FEED_NOW': 45,
      'START_WIND_DOWN': 10,
      'INDEPENDENT_TIME': 10,
      'LET_SLEEP_CONTINUE': 30,
      'HOLD': 10
    }[nextAction];

    return {
      next_action: nextAction,
      confidence,
      rationale: {
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
          data_gap: dataGap
        }
      },
      reevaluate_in_minutes: reevaluateIn
    };
  }
}