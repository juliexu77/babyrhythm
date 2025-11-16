import { supabase } from "@/integrations/supabase/client";

/**
 * Clear all app-related session storage caches and database cache
 */
export const clearAppCache = async (householdId?: string) => {
  try {
    console.log('🧹 Starting cache clear...');
    
    // Clear ALL session storage
    sessionStorage.clear();
    console.log('✅ Cleared all sessionStorage');
    
    // Clear localStorage caches
    const localStorageCaches = [
      'rhythmInsights',
      'rhythmInsightsLastFetch',
      'aiPrediction',
      'aiPredictionLastFetch',
      'homeInsights',
      'homeInsightsLastFetch',
      'guideData',
      'guideDataTimestamp',
      'scheduleData',
      'scheduleTimestamp'
    ];
    
    localStorageCaches.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared localStorage: ${key}`);
    });
    
    // Clear ALL localStorage keys (including React Query, Supabase, and user profile caches)
    const allLocalStorageKeys = Object.keys(localStorage);
    allLocalStorageKeys.forEach(key => {
      if (key.includes('REACT_QUERY') || 
          key.includes('supabase') || 
          key.includes('cache') ||
          key.includes('user-profile') ||
          key.includes('household') ||
          key.includes('auth')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared localStorage: ${key}`);
      }
    });
    
    // Clear database cache if household ID provided
    if (householdId) {
      console.log('🗑️ Clearing database schedule cache...');
      const { error } = await supabase.functions.invoke('clear-schedule-cache', {
        body: { householdId }
      });
      
      if (error) {
        console.error('❌ Failed to clear database cache:', error);
      } else {
        console.log('✅ Database schedule cache cleared');
      }
    }
    
    console.log('✅ App cache cleared successfully - data will refresh');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear app cache:', error);
    return false;
  }
};

/**
 * Clear specific cache by prefix
 */
export const clearCacheByPrefix = (prefix: string) => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    });
    console.log(`✅ Cache cleared for prefix: ${prefix}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear cache for prefix ${prefix}:`, error);
    return false;
  }
};
