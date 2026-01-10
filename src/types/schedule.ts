/**
 * Shared Schedule types for prediction engines
 * Consolidates interfaces from predictionEngine, schedulePredictor, simpleSchedulePredictor
 */

// Schedule event types
export type ScheduleEventType = 'wake' | 'nap' | 'feed' | 'bed';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DataStability = 'sparse' | 'unstable' | 'stable';

/**
 * A single event in a predicted schedule
 */
export interface ScheduleEvent {
  time: string;
  type: ScheduleEventType;
  duration?: string;
  notes?: string;
  confidence?: ConfidenceLevel;
  reasoning?: string;
  actualTime?: string;
  actualDuration?: string;
}

/**
 * A complete predicted schedule for a day
 */
export interface PredictedSchedule {
  events: ScheduleEvent[];
  confidence: ConfidenceLevel;
  basedOn: string;
  accuracyScore?: number;
  lastUpdated?: string;
  adjustmentNote?: string;
}

/**
 * Sleep segment for pattern analysis
 */
export interface SleepSegment {
  start: Date;
  end: Date | null;
  duration?: number; // minutes
  type: 'nap' | 'night';
}

/**
 * Feed event for pattern analysis
 */
export interface FeedEvent {
  timestamp: Date;
  volume?: number;
  type: 'bottle' | 'nursing';
}

/**
 * Age-based schedule parameters
 */
export interface AgeBasedParams {
  wake_window_min: number; // minutes
  wake_window_max: number;
  feed_interval_min: number;
  feed_interval_max: number;
  day_sleep_target: number;
  nap_floor_short: number;
  wakeWindowsByPosition?: Map<number, { median: number; count: number }>;
}

/**
 * Day progress tracking
 */
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

/**
 * Timing predictions for next actions
 */
export interface TimingPredictions {
  nextWakeAt?: Date;
  nextNapWindowStart?: Date;
  nextFeedAt?: Date;
  expectedFeedVolume?: number;
}

/**
 * Nap count analysis result
 */
export interface NapCountAnalysis {
  total_naps_today: number;
  confidence: ConfidenceLevel;
  is_transitioning: boolean;
  transition_note?: string;
  reasoning: string;
}

/**
 * Engine internals for debugging/display
 */
export interface EngineInternals {
  learnedWakeWindowMedian?: number;
  learnedFeedIntervalMedian?: number;
  learnedDaySleepMedian?: number;
  wakeWindowStdDev?: number;
  feedIntervalStdDev?: number;
  dataStability: DataStability;
  blendRatio: { age: number; learned: number };
  wakeWindowsByPosition?: Map<number, { median: number; count: number }>;
  currentWakeWindowPosition?: number;
}
