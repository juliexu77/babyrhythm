import { useState, useEffect, useCallback } from 'react';

/**
 * Typed localStorage keys - single source of truth for all storage keys
 * Add new keys here to maintain consistency across the app
 */
export const StorageKeys = {
  // Activity & Data
  TEMP_ACTIVITIES: 'temp_activities',
  PENDING_ACTIVITIES: 'pendingActivities',
  LAST_ACTIVITY_LOGGED: 'lastActivityLogged',
  
  // User Preferences
  THEME: 'theme',
  FEED_UNIT: 'feedUnit',
  DEFAULT_FEED_AMOUNT: 'defaultFeedAmount',
  LANGUAGE: 'app_language',
  
  // Onboarding & Tutorial
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
  TUTORIAL_STEP: 'tutorialStep',
  HAS_SEEN_TUTORIAL: 'hasSeenTutorial',
  FIRST_ACTIVITY_CELEBRATION_SHOWN: 'firstActivityCelebrationShown',
  
  // Feature Flags & State
  DUSK_MODE_ENABLED: 'duskModeEnabled',
  DUSK_MODE_AUTO: 'duskModeAuto',
  HAS_SEEN_RHYTHM_UNLOCK: 'hasSeenRhythmUnlock',
  MISSED_ACTIVITY_DISMISSED: 'missedActivityDismissed',
  
  // Cache & Sync
  LAST_SYNC_TIME: 'lastSyncTime',
  OFFLINE_QUEUE: 'offlineQueue',
  SCHEDULE_CACHE: 'scheduleCache',
  
  // Baby Profile (for non-authenticated use)
  TEMP_BABY_NAME: 'tempBabyName',
  TEMP_BABY_BIRTHDAY: 'tempBabyBirthday',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

/**
 * Type-safe localStorage hook with automatic JSON serialization
 * 
 * @param key - Storage key from StorageKeys
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage(StorageKeys.THEME, 'light');
 * const [activities, setActivities] = useLocalStorage<Activity[]>(StorageKeys.TEMP_ACTIVITIES, []);
 */
export function useLocalStorage<T>(
  key: StorageKey,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use provided default
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          
          // Dispatch custom event for cross-tab sync
          window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
          }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch {
          setStoredValue(event.newValue as unknown as T);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Direct localStorage access utilities for non-hook contexts
 * Use these sparingly - prefer useLocalStorage hook in components
 */
export const storage = {
  get<T>(key: StorageKey, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  },

  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  },

  has(key: StorageKey): boolean {
    return localStorage.getItem(key) !== null;
  },
};
