/**
 * Centralized time utilities
 * Consolidates duplicate time parsing/formatting functions across the codebase
 */

/**
 * Parse a time string like "2:30 PM" to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  
  // Handle 12-hour format
  if (period) {
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to a time string like "2:30 PM"
 */
export function formatMinutesToTime(totalMinutes: number, use24Hour = false): string {
  // Normalize to 0-1440 range
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalizedMinutes / 60);
  const mins = Math.floor(normalizedMinutes % 60);
  
  if (use24Hour) {
    return `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate duration between two time strings
 * Returns duration in minutes, handling midnight crossover
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  let duration = endMinutes - startMinutes;
  
  // Handle crossing midnight
  if (duration < 0) {
    duration += 24 * 60;
  }
  
  return duration;
}

/**
 * Format duration in minutes to a human-readable string
 * e.g., 90 -> "1h 30m", 45 -> "45m", 120 -> "2h"
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Format duration in minutes to a short string
 * e.g., 90 -> "1:30", 45 -> "0:45"
 */
export function formatDurationShort(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parse a Date object to a time string
 */
export function dateToTimeString(date: Date, use24Hour = false): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return formatMinutesToTime(hours * 60 + minutes, use24Hour);
}

/**
 * Create a Date object from today's date and a time string
 */
export function timeStringToDate(timeStr: string, baseDate = new Date()): Date {
  const minutes = parseTimeToMinutes(timeStr);
  const result = new Date(baseDate);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

/**
 * Get time difference between two Date objects in minutes
 */
export function getTimeDifferenceMinutes(date1: Date, date2: Date): number {
  return Math.round((date1.getTime() - date2.getTime()) / 60000);
}

/**
 * Format a Date to locale time string
 */
export function formatLocaleTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

/**
 * Check if a time is within a range (handles midnight crossover)
 */
export function isTimeInRange(timeMinutes: number, rangeStart: number, rangeEnd: number): boolean {
  // Normalize all values
  timeMinutes = ((timeMinutes % 1440) + 1440) % 1440;
  rangeStart = ((rangeStart % 1440) + 1440) % 1440;
  rangeEnd = ((rangeEnd % 1440) + 1440) % 1440;
  
  if (rangeStart <= rangeEnd) {
    // Normal range (e.g., 9:00 AM - 5:00 PM)
    return timeMinutes >= rangeStart && timeMinutes <= rangeEnd;
  } else {
    // Crosses midnight (e.g., 10:00 PM - 6:00 AM)
    return timeMinutes >= rangeStart || timeMinutes <= rangeEnd;
  }
}

/**
 * Check if a time is during night hours (default: 7PM - 7AM)
 */
export function isNightTime(date: Date, nightStart = 19, nightEnd = 7): boolean {
  const hour = date.getHours();
  return hour >= nightStart || hour < nightEnd;
}

/**
 * Add minutes to a time string
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const currentMinutes = parseTimeToMinutes(timeStr);
  return formatMinutesToTime(currentMinutes + minutesToAdd);
}

/**
 * Get the current time as minutes since midnight
 */
export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
