import { Activity } from "@/components/ActivityCard";
import { differenceInHours } from "date-fns";

// Flexible activity type that works with both database format and component format
type FlexibleActivity = {
  id: string;
  type: string;
  loggedAt?: string;
  logged_at?: string;
  details: any;
  time?: string;
};

// Get age-appropriate expectations for feeds
const getExpectedFeeds = (months: number | null) => {
  if (months === null) return null;
  if (months < 1) return { min: 8, max: 12, typical: "8-12" };
  if (months < 3) return { min: 6, max: 8, typical: "6-8" };
  if (months < 6) return { min: 5, max: 7, typical: "5-7" };
  if (months < 9) return { min: 4, max: 6, typical: "4-6" };
  if (months < 12) return { min: 3, max: 5, typical: "3-5" };
  return { min: 3, max: 4, typical: "3-4" };
};

// Get age-appropriate expectations for naps
const getExpectedNaps = (months: number | null) => {
  if (months === null) return null;
  if (months < 1) return { min: 4, max: 8, typical: "4-8" };
  if (months < 3) return { min: 4, max: 6, typical: "4-6" };
  if (months < 6) return { min: 3, max: 4, typical: "3-4" };
  if (months < 9) return { min: 2, max: 3, typical: "2-3" };
  if (months < 12) return { min: 2, max: 3, typical: "2-3" };
  return { min: 1, max: 2, typical: "1-2" };
};

/**
 * Calculate daily sentiment/tone for a specific day's activities
 * @param dayActivities - Activities for the specific day
 * @param allActivities - All activities (for calculating "hours since first")
 * @param babyAgeMonths - Baby's age in months (for age-appropriate expectations)
 * @param currentHour - Current hour (0-23) for time-of-day logic
 * @returns Sentiment object with emoji and text
 */
export const getDailySentiment = (
  dayActivities: FlexibleActivity[],
  allActivities: FlexibleActivity[],
  babyAgeMonths: number | null,
  currentHour: number = new Date().getHours()
) => {
  // Check if user is in first 24-96 hours from first activity
  if (allActivities.length > 0) {
    const firstActivity = [...allActivities].sort((a, b) => {
      const aTime = a.loggedAt || a.logged_at;
      const bTime = b.loggedAt || b.logged_at;
      return new Date(aTime!).getTime() - new Date(bTime!).getTime();
    })[0];
    
    const firstLoggedAt = firstActivity.loggedAt || firstActivity.logged_at;
    if (firstLoggedAt) {
      const firstActivityTime = new Date(firstLoggedAt);
      const now = new Date();
      const hoursSinceFirst = differenceInHours(now, firstActivityTime);
      
      // Show "Early Days" for first 24 hours
      if (hoursSinceFirst < 24) {
        return { emoji: "🌤", text: "Early Days" };
      }
      
      // Days 2-4: Use simplified chip set while establishing baseline
      if (hoursSinceFirst >= 24 && hoursSinceFirst < 96) {
        const feedCount = dayActivities.filter(a => a.type === 'feed').length;
        const napCount = dayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
        
        // Show "New Discovery" early in day with some activity
        if (currentHour < 12 && (feedCount >= 1 || napCount >= 1) && 
            (feedCount + napCount <= 3)) {
          return { emoji: "🌈", text: "New Discovery" };
        }
        
        // Default to "Building Rhythm" for days 2-4
        return { emoji: "🌿", text: "Building Rhythm" };
      }
    }
  }
  
  const feedCount = dayActivities.filter(a => a.type === 'feed').length;
  const napCount = dayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
  const diaperCount = dayActivities.filter(a => a.type === 'diaper').length;
  
  const expected = getExpectedFeeds(babyAgeMonths);
  const expectedNaps = getExpectedNaps(babyAgeMonths);
  
  // 1. 🌱 Growth Spurt Week - significantly more feeds than typical
  if (expected && feedCount > expected.max + 2) {
    return { emoji: "🌱", text: "Growth Spurt Week" };
  }
  
  // 2. 🍼 Feed-Heavy Day - above average feeds
  if (expected && feedCount > expected.max && feedCount <= expected.max + 2) {
    return { emoji: "🍼", text: "Feed-Heavy Day" };
  }
  
  // 3. 🌙 Extra Sleepy Day - more/longer naps than expected
  if (expectedNaps && napCount >= expectedNaps.max + 1) {
    return { emoji: "🌙", text: "Extra Sleepy Day" };
  }
  
  // 4. ☀️ Smooth Flow - feeds and naps both in expected range
  if (expected && expectedNaps && 
      feedCount >= expected.min && feedCount <= expected.max &&
      napCount >= expectedNaps.min && napCount <= expectedNaps.max) {
    return { emoji: "☀️", text: "Smooth Flow" };
  }
  
  // 5. 🎯 In Sync - perfect alignment with expectations
  if (expected && expectedNaps && 
      (feedCount === expected.max || feedCount === Math.round((expected.min + expected.max) / 2)) && 
      (napCount === expectedNaps.max || napCount === Math.round((expectedNaps.min + expectedNaps.max) / 2))) {
    return { emoji: "🎯", text: "In Sync" };
  }
  
  // 6. 🌤️ Mixed Patterns - some metrics in range, others not
  if (expected && expectedNaps &&
      ((feedCount >= expected.min && feedCount <= expected.max && napCount < expectedNaps.min) ||
       (napCount >= expectedNaps.min && napCount <= expectedNaps.max && feedCount < expected.min))) {
    return { emoji: "🌤️", text: "Mixed Patterns" };
  }
  
  // 7. 🔄 Adjusting Rhythm - slightly off from expected range
  if (expected && expectedNaps &&
      (feedCount === expected.min - 1 || napCount === expectedNaps.min - 1)) {
    return { emoji: "🔄", text: "Adjusting Rhythm" };
  }
  
  // 8. ⚡ High-Energy Day - lots of overall activity
  if (feedCount + napCount + diaperCount >= 12) {
    return { emoji: "⚡", text: "High-Energy Day" };
  }
  
  // 9. 💫 Growth Transition - milestone age periods with pattern changes
  if (babyAgeMonths !== null && [3, 4, 6, 9, 12].includes(babyAgeMonths) && 
      (feedCount !== expected?.max || napCount !== expectedNaps?.max)) {
    return { emoji: "💫", text: "Growth Transition" };
  }
  
  // 10. 🌈 New Discovery - early in day with some activity
  if (currentHour < 12 && (feedCount >= 1 || napCount >= 1) && 
      (feedCount + napCount <= 3)) {
    return { emoji: "🌈", text: "New Discovery" };
  }
  
  // 11. 🌧️ Off Rhythm Day - significantly below expected activity
  if (expected && expectedNaps &&
      (feedCount < expected.min - 2 || napCount < expectedNaps.min - 1)) {
    return { emoji: "🌧️", text: "Off Rhythm Day" };
  }
  
  // Default: Building Rhythm
  return { emoji: "🌿", text: "Building Rhythm" };
};
