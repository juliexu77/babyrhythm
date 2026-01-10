/**
 * Shared Activity types used across the application
 * Single source of truth for activity-related interfaces
 */

// Core activity types supported by the app
// Note: 'measure' is used in database but not in UI activity cards
export type ActivityType = 'feed' | 'diaper' | 'nap' | 'note' | 'solids' | 'photo';
export type DatabaseActivityType = ActivityType | 'measure';

// Feed-specific details
export interface FeedDetails {
  feedType?: 'bottle' | 'nursing';
  quantity?: string;
  unit?: 'oz' | 'ml';
  minutesLeft?: string;
  minutesRight?: string;
  isDreamFeed?: boolean;
}

// Diaper-specific details
export interface DiaperDetails {
  diaperType?: 'wet' | 'poopy' | 'both';
  hasLeak?: boolean;
  hasCream?: boolean;
}

// Nap/Sleep-specific details
export interface NapDetails {
  startTime?: string;
  endTime?: string;
  duration?: string;
  isNightSleep?: boolean;
}

// Solids-specific details
export interface SolidsDetails {
  solidDescription?: string;
  allergens?: string[];
}

// Photo-specific details
export interface PhotoDetails {
  photoUrl?: string;
}

// Combined activity details - allows additional properties for JSON compatibility
export interface ActivityDetails extends FeedDetails, DiaperDetails, NapDetails, SolidsDetails, PhotoDetails {
  note?: string;
  displayTime?: string; // Store the original selected time for consistent display
  date_local?: string;  // Local date for timezone-aware storage
  offset_minutes?: number; // Timezone offset when activity was logged
  [key: string]: string | string[] | number | boolean | undefined; // JSON compatibility
}

/**
 * UI Activity - used in components for display
 * Has processed time string for display
 */
export interface Activity {
  id: string;
  type: ActivityType;
  time: string; // Display time (e.g., "2:30 PM")
  loggedAt?: string; // UTC timestamp
  timezone?: string; // IANA timezone name
  details: ActivityDetails;
}

/**
 * Database Activity - matches Supabase schema
 * Uses logged_at for UTC storage
 */
export interface DatabaseActivity {
  id: string;
  household_id: string;
  type: DatabaseActivityType;
  logged_at: string; // UTC timestamp
  timezone?: string; // IANA timezone name
  details: ActivityDetails;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Activity input for creating new activities
 */
export interface CreateActivityInput {
  type: ActivityType;
  time: string; // User-selected time string
  details: ActivityDetails;
}

/**
 * Convert a database activity to a UI activity
 */
export function toUIActivity(dbActivity: DatabaseActivity): Activity {
  const utcDate = new Date(dbActivity.logged_at);
  
  const displayTime = utcDate.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Filter out 'measure' type as it's not used in UI
  const uiType = dbActivity.type === 'measure' ? 'note' : dbActivity.type;
  
  return {
    id: dbActivity.id,
    type: uiType as ActivityType,
    time: displayTime,
    loggedAt: dbActivity.logged_at,
    timezone: dbActivity.timezone,
    details: dbActivity.details
  };
}
