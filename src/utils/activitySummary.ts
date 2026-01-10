/**
 * Activity summary utilities for calculating daily stats.
 * Extracted from HomeTab for reuse across components.
 */

import { Activity } from "@/types/activity";
import { isDaytimeNap } from "@/utils/napClassification";

export interface DailySummary {
  feedCount: number;
  napCount: number;
  diaperCount: number;
  solidsCount: number;
  noteCount: number;
}

/**
 * Calculate daily summary from activities
 */
export const getDailySummary = (
  activities: Activity[],
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): DailySummary => {
  return {
    feedCount: activities.filter(a => a.type === 'feed').length,
    napCount: activities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    ).length,
    diaperCount: activities.filter(a => a.type === 'diaper').length,
    solidsCount: activities.filter(a => a.type === 'solids').length,
    noteCount: activities.filter(a => a.type === 'note').length,
  };
};

/**
 * Get the latest solids activity
 */
export const getLatestSolids = (activities: Activity[]): Activity | null => {
  const solidsActivities = activities
    .filter(a => a.type === 'solids')
    .sort((a, b) => {
      const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
      const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
      return timeB - timeA;
    });
  
  return solidsActivities[0] || null;
};

/**
 * Calculate total feed volume for activities
 */
export const getTotalFeedVolume = (activities: Activity[]): { total: number; unit: string } => {
  const feeds = activities.filter(a => a.type === 'feed' && a.details?.quantity);
  
  if (feeds.length === 0) return { total: 0, unit: 'ml' };
  
  // Determine dominant unit
  const unitCounts = feeds.reduce((acc, f) => {
    const unit = f.details?.unit || 'ml';
    acc[unit] = (acc[unit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantUnit = Object.entries(unitCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'ml';
  
  // Sum volumes (convert if needed)
  const total = feeds.reduce((sum, f) => {
    const qty = parseFloat(f.details?.quantity || '0');
    const unit = f.details?.unit || 'ml';
    
    if (unit === dominantUnit) return sum + qty;
    
    // Convert between oz and ml
    if (dominantUnit === 'ml' && unit === 'oz') return sum + (qty * 29.5735);
    if (dominantUnit === 'oz' && unit === 'ml') return sum + (qty / 29.5735);
    
    return sum + qty;
  }, 0);
  
  return { total: Math.round(total), unit: dominantUnit };
};

/**
 * Calculate total nap minutes for activities
 */
export const getTotalNapMinutes = (
  activities: Activity[],
  nightSleepStartHour: number = 19,
  nightSleepEndHour: number = 7
): number => {
  const daytimeNaps = activities.filter(a => 
    a.type === 'nap' && 
    isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) &&
    a.details?.startTime &&
    a.details?.endTime
  );
  
  return daytimeNaps.reduce((total, nap) => {
    const startMinutes = parseTimeToMinutes(nap.details!.startTime!);
    const endMinutes = parseTimeToMinutes(nap.details!.endTime!);
    
    const duration = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60) - startMinutes + endMinutes;
    
    return total + duration;
  }, 0);
};

/**
 * Parse time string to minutes from midnight
 */
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};
