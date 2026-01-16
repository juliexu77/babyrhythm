// Shared types for activity forms

export interface ActivityFormRef {
  getValues: () => ActivityFormData;
  validate: () => boolean;
  reset: () => void;
}

export interface BaseFormData {
  time: string;
  selectedDate: Date;
}

export interface FeedFormData extends BaseFormData {
  type: 'feed';
  feedType: 'bottle' | 'nursing';
  quantity: string;
  unit: 'oz' | 'ml';
  minutesLeft: string;
  minutesRight: string;
  isDreamFeed: boolean;
  note: string;
}

export interface DiaperFormData extends BaseFormData {
  type: 'diaper';
  diaperType: 'wet' | 'poopy' | 'both';
  hasLeak: boolean;
  hasCream: boolean;
  note: string;
}

export interface NapFormData extends BaseFormData {
  type: 'nap';
  startTime: string;
  endTime: string;
  hasEndTime: boolean;
  selectedEndDate: Date;
}

export interface NoteFormData extends BaseFormData {
  type: 'note';
  note: string;
  photo: File | null;
  photoUrl: string | null;
}

export interface SolidsFormData extends BaseFormData {
  type: 'solids';
  description: string;
  allergens: string[];
}

export interface PhotoFormData extends BaseFormData {
  type: 'photo';
  note: string;
  photo: File | null;
  photoUrl: string | null;
}

export type ActivityFormData = 
  | FeedFormData 
  | DiaperFormData 
  | NapFormData 
  | NoteFormData 
  | SolidsFormData 
  | PhotoFormData;

export interface EditingData {
  time: string;
  loggedAt?: string;
  details: Record<string, any>;
}

// Helper to get current time
export const getCurrentTime = (date: Date = new Date()) => {
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
};

// Parse time to minutes helper
export const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};
