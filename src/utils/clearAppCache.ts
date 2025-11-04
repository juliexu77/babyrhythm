/**
 * Clear all app-related session storage caches
 */
export const clearAppCache = () => {
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
    
    // Clear any React Query cache keys
    const allLocalStorageKeys = Object.keys(localStorage);
    allLocalStorageKeys.forEach(key => {
      if (key.includes('REACT_QUERY') || key.includes('supabase') || key.includes('cache')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared localStorage: ${key}`);
      }
    });
    
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
