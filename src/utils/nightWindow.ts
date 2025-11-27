/**
 * Shared utility for night window detection
 * Determines if a given hour falls within the night sleep window
 */

export const isNightTime = (
  hour: number,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): boolean => {
  // Night window crosses midnight (e.g., 19:00-7:00)
  if (nightSleepStartHour > nightSleepEndHour) {
    return hour >= nightSleepStartHour || hour < nightSleepEndHour;
  }
  // Night window doesn't cross midnight (e.g., 22:00-6:00 but rare)
  return hour >= nightSleepStartHour && hour < nightSleepEndHour;
};

export const isDaytime = (
  hour: number,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): boolean => {
  return !isNightTime(hour, nightSleepStartHour, nightSleepEndHour);
};
