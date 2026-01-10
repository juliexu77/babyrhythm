/**
 * Simple schedule predictor for nap count analysis.
 * Uses shared age-based expectations for consistency.
 * 
 * NOTE: This is a simplified predictor. For full predictions,
 * see predictionEngine.ts which handles real-time next-action predictions.
 */

import { getScheduleForAge, calculateAgeInWeeks } from './ageAppropriateBaselines';
import { getExpectedNaps, type ExpectedRange } from './ageBasedExpectations';

export interface NapCountAnalysis {
  total_naps_today: number;
  confidence: 'high' | 'medium' | 'low';
  is_transitioning: boolean;
  transition_note?: string;
  reasoning: string;
}

interface Activity {
  type: string;
  logged_at: string;
  details?: {
    startTime?: string;
    endTime?: string;
  };
}

function getRecentNapCount(activities: Activity[]): number {
  // Look at last 3 days to determine current nap pattern
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
  
  const recentNaps = activities.filter(a => 
    a.type === 'nap' && 
    a.logged_at >= threeDaysAgoStr &&
    a.details?.startTime && 
    a.details?.endTime
  );
  
  // Group by day and get average
  const napsByDay: { [key: string]: number } = {};
  recentNaps.forEach(nap => {
    const day = nap.logged_at.split('T')[0];
    napsByDay[day] = (napsByDay[day] || 0) + 1;
  });
  
  const days = Object.keys(napsByDay);
  if (days.length === 0) return 0;
  
  const totalNaps = Object.values(napsByDay).reduce((sum, count) => sum + count, 0);
  return Math.round(totalNaps / days.length);
}

function getNapCountVariance(activities: Activity[]): number {
  // Check variance in nap counts over last 5 days
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];
  
  const recentNaps = activities.filter(a => 
    a.type === 'nap' && 
    a.logged_at >= fiveDaysAgoStr &&
    a.details?.startTime && 
    a.details?.endTime
  );
  
  const napsByDay: { [key: string]: number } = {};
  recentNaps.forEach(nap => {
    const day = nap.logged_at.split('T')[0];
    napsByDay[day] = (napsByDay[day] || 0) + 1;
  });
  
  const counts = Object.values(napsByDay);
  if (counts.length < 2) return 0;
  
  const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
  
  return variance;
}

export function predictDailySchedule(
  recentActivities: Activity[],
  todayActivities: Activity[],
  babyBirthday: string | undefined,
  timezone: string
): NapCountAnalysis {
  if (!babyBirthday) {
    return {
      total_naps_today: 0,
      confidence: 'low',
      is_transitioning: false,
      reasoning: 'No baby birthday set. Please add baby\'s birthday in settings to get schedule predictions.'
    };
  }
  
  const ageInWeeks = calculateAgeInWeeks(babyBirthday);
  const baselineSchedule = getScheduleForAge(ageInWeeks);
  
  if (!baselineSchedule) {
    return {
      total_naps_today: 0,
      confidence: 'low',
      is_transitioning: false,
      reasoning: 'Unable to determine appropriate schedule for this age.'
    };
  }
  
  // Determine how many naps baby is currently doing
  const recentNapCount = getRecentNapCount(recentActivities);
  const baselineNapCount = baselineSchedule.totalNaps;
  
  // Calculate nap count variance to detect transitions
  const napVariance = getNapCountVariance(recentActivities);
  const isTransitioning = napVariance > 0.5; // High variance indicates transition
  
  // Determine actual nap count to use
  let predictedNapCount = baselineNapCount;
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let reasoning = '';
  let transitionNote: string | undefined;
  
  if (recentNapCount === 0) {
    // No recent data - use baseline
    predictedNapCount = baselineNapCount;
    confidence = 'medium';
    reasoning = `Based on age-appropriate schedule for ${Math.floor(ageInWeeks / 4.33)} month old babies (${baselineNapCount} naps typical).`;
  } else if (Math.abs(recentNapCount - baselineNapCount) <= 1) {
    // Close to baseline - high confidence
    predictedNapCount = recentNapCount;
    confidence = 'high';
    const ageMonths = Math.floor(ageInWeeks / 4.33);
    reasoning = `${recentNapCount} nap${recentNapCount !== 1 ? 's' : ''} per day based on recent ${ageMonths} month pattern. Wake windows: ${baselineSchedule.wakeWindows[0]}.`;
  } else if (recentNapCount < baselineNapCount) {
    // Dropping naps - likely transitioning
    predictedNapCount = recentNapCount;
    confidence = 'medium';
    isTransitioning && (transitionNote = `May be transitioning from ${baselineNapCount} to ${recentNapCount} naps`);
    reasoning = `Currently doing ${recentNapCount} nap${recentNapCount !== 1 ? 's' : ''} daily (baseline is ${baselineNapCount}). ${isTransitioning ? 'Nap pattern is adjusting - this is normal!' : ''}`;
  } else {
    // More naps than baseline - unusual
    predictedNapCount = baselineNapCount;
    confidence = 'medium';
    reasoning = `Predicting ${baselineNapCount} naps based on age. Recent pattern shows ${recentNapCount} naps, which may indicate shorter naps or overtiredness.`;
  }
  
  return {
    total_naps_today: predictedNapCount,
    confidence,
    is_transitioning: isTransitioning,
    transition_note: transitionNote,
    reasoning
  };
}
