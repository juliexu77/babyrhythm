/**
 * Clear all app-related session storage caches
 */
export const clearAppCache = () => {
  try {
    // Clear all session storage items that start with specific prefixes
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (
        key.startsWith('status-tip-') ||
        key.startsWith('guide-') ||
        key.startsWith('insight-')
      ) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear localStorage caches as well
    const localStorageCaches = [
      'rhythmInsights',
      'rhythmInsightsLastFetch',
      'aiPrediction',
      'aiPredictionLastFetch',
      'homeInsights',
      'homeInsightsLastFetch'
    ];
    
    localStorageCaches.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared localStorage: ${key}`);
    });
    
    console.log('✅ App cache cleared - refresh to see changes');
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
