/**
 * Generate a subtitle describing weekly nap rhythm patterns
 * Replaces AI-based generation with pattern detection logic
 */

interface DayNaps {
  date: string;
  naps: Array<{
    duration: number;
    startTime?: string;
  }>;
}

export function generateRhythmSubtitle(weekData: DayNaps[]): string {
  if (weekData.length === 0) return "";
  
  // Calculate statistics across the week
  const napCounts = weekData.map(day => day.naps.length);
  const avgNapCount = napCounts.reduce((a, b) => a + b, 0) / napCounts.length;
  const napCountVariance = Math.max(...napCounts) - Math.min(...napCounts);
  
  // Calculate nap durations
  const allNapDurations = weekData.flatMap(day => day.naps.map(n => n.duration));
  const avgDuration = allNapDurations.length > 0 
    ? allNapDurations.reduce((a, b) => a + b, 0) / allNapDurations.length 
    : 0;
  
  // Analyze trends over time (first half vs second half of week)
  const firstHalfDurations = weekData.slice(0, Math.floor(weekData.length / 2))
    .flatMap(day => day.naps.map(n => n.duration));
  const secondHalfDurations = weekData.slice(Math.floor(weekData.length / 2))
    .flatMap(day => day.naps.map(n => n.duration));
  
  const firstHalfAvg = firstHalfDurations.length > 0
    ? firstHalfDurations.reduce((a, b) => a + b, 0) / firstHalfDurations.length
    : 0;
  const secondHalfAvg = secondHalfDurations.length > 0
    ? secondHalfDurations.reduce((a, b) => a + b, 0) / secondHalfDurations.length
    : 0;
  
  const durationChange = secondHalfAvg - firstHalfAvg;
  
  // Analyze third nap pattern (if exists)
  const daysWithThirdNap = weekData.filter(day => day.naps.length >= 3);
  const thirdNapDurations = daysWithThirdNap.map(day => day.naps[2].duration);
  const avgThirdNapDuration = thirdNapDurations.length > 0
    ? thirdNapDurations.reduce((a, b) => a + b, 0) / thirdNapDurations.length
    : 0;
  
  // Check for transition patterns
  const recentNapCounts = napCounts.slice(-3); // Last 3 days
  const olderNapCounts = napCounts.slice(0, -3); // Earlier days
  const recentAvg = recentNapCounts.reduce((a, b) => a + b, 0) / recentNapCounts.length;
  const olderAvg = olderNapCounts.length > 0 
    ? olderNapCounts.reduce((a, b) => a + b, 0) / olderNapCounts.length 
    : recentAvg;
  
  // Pattern detection logic - confident trajectory statements
  
  // Nap count transitioning
  if (Math.abs(recentAvg - olderAvg) >= 0.5) {
    const targetNaps = Math.round(recentAvg);
    if (recentAvg < olderAvg) {
      return `Nap pattern trending toward ${targetNaps} nap${targetNaps !== 1 ? 's' : ''}`;
    } else {
      return `Nap frequency increasing toward ${targetNaps} naps`;
    }
  }
  
  // Nap durations trending
  if (Math.abs(durationChange) >= 20) {
    if (durationChange > 0) {
      return "Nap duration trending longer";
    } else {
      return "Nap duration trending shorter";
    }
  }
  
  // Third nap pattern
  if (daysWithThirdNap.length >= 3 && avgThirdNapDuration < 40) {
    return "Third nap naturally shortening";
  }
  
  if (daysWithThirdNap.length >= 4 && avgThirdNapDuration > 60) {
    return "Solid 3-nap rhythm established";
  }
  
  // Variable nap count
  if (napCountVariance >= 2) {
    return "Nap count adjusting day by day";
  }
  
  // Very consistent
  if (napCountVariance === 0 && Math.abs(durationChange) < 10) {
    return "Consistent rhythm established";
  }
  
  // Consistent nap count
  if (napCountVariance <= 1) {
    const roundedAvg = Math.round(avgNapCount);
    return `${roundedAvg}-nap rhythm holding steady`;
  }
  
  // Long naps
  if (avgDuration > 100) {
    return "Deep nap pattern established";
  }
  
  // Short naps
  if (avgDuration < 45) {
    return "Catnap rhythm in place";
  }
  
  // Default
  return "Rhythm taking shape";
}
