import { useMemo } from 'react';
import { useHousehold } from './useHousehold';

/**
 * Baby age information with multiple formats
 */
export interface BabyAge {
  // Raw values
  birthday: string | null;
  ageInDays: number;
  ageInWeeks: number;
  ageInMonths: number;
  
  // Formatted strings
  ageLabel: string; // e.g., "3 months" or "8 weeks"
  ageShortLabel: string; // e.g., "3mo" or "8wk"
  
  // Age bracket helpers
  isNewborn: boolean; // 0-3 months
  isInfant: boolean; // 4-6 months
  isOlderBaby: boolean; // 7-12 months
  isToddler: boolean; // 12+ months
  
  // Bracket for schedule logic
  ageBracket: '0-3mo' | '4-6mo' | '7-12mo' | '12mo+';
}

/**
 * Calculate baby age from birthday string
 */
export function calculateBabyAge(birthday: string | null | undefined): BabyAge {
  if (!birthday) {
    return {
      birthday: null,
      ageInDays: 0,
      ageInWeeks: 0,
      ageInMonths: 0,
      ageLabel: 'Unknown age',
      ageShortLabel: '?',
      isNewborn: false,
      isInfant: false,
      isOlderBaby: false,
      isToddler: false,
      ageBracket: '0-3mo',
    };
  }

  const birthDate = new Date(birthday);
  const now = new Date();
  const diffTime = now.getTime() - birthDate.getTime();
  
  const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const ageInWeeks = Math.floor(ageInDays / 7);
  const ageInMonths = Math.floor(ageInDays / 30.44); // Average days per month

  // Determine age label
  let ageLabel: string;
  let ageShortLabel: string;
  
  if (ageInWeeks < 4) {
    ageLabel = `${ageInWeeks} week${ageInWeeks !== 1 ? 's' : ''}`;
    ageShortLabel = `${ageInWeeks}wk`;
  } else if (ageInMonths < 24) {
    ageLabel = `${ageInMonths} month${ageInMonths !== 1 ? 's' : ''}`;
    ageShortLabel = `${ageInMonths}mo`;
  } else {
    const years = Math.floor(ageInMonths / 12);
    ageLabel = `${years} year${years !== 1 ? 's' : ''}`;
    ageShortLabel = `${years}yr`;
  }

  // Age bracket flags
  const isNewborn = ageInMonths < 4;
  const isInfant = ageInMonths >= 4 && ageInMonths < 7;
  const isOlderBaby = ageInMonths >= 7 && ageInMonths < 12;
  const isToddler = ageInMonths >= 12;

  // Schedule bracket
  let ageBracket: BabyAge['ageBracket'];
  if (ageInMonths < 4) {
    ageBracket = '0-3mo';
  } else if (ageInMonths < 7) {
    ageBracket = '4-6mo';
  } else if (ageInMonths < 12) {
    ageBracket = '7-12mo';
  } else {
    ageBracket = '12mo+';
  }

  return {
    birthday,
    ageInDays,
    ageInWeeks,
    ageInMonths,
    ageLabel,
    ageShortLabel,
    isNewborn,
    isInfant,
    isOlderBaby,
    isToddler,
    ageBracket,
  };
}

/**
 * Hook to get baby age from household context
 * Memoized for performance
 */
export function useBabyAge(): BabyAge {
  const { household } = useHousehold();
  
  return useMemo(() => {
    return calculateBabyAge(household?.baby_birthday);
  }, [household?.baby_birthday]);
}

/**
 * Get expected nap count based on age
 */
export function getExpectedNapCount(ageInMonths: number): { min: number; max: number; typical: number } {
  if (ageInMonths < 3) {
    return { min: 4, max: 6, typical: 5 };
  } else if (ageInMonths < 4) {
    return { min: 3, max: 5, typical: 4 };
  } else if (ageInMonths < 6) {
    return { min: 3, max: 4, typical: 3 };
  } else if (ageInMonths < 9) {
    return { min: 2, max: 3, typical: 2 };
  } else if (ageInMonths < 15) {
    return { min: 1, max: 2, typical: 2 };
  } else {
    return { min: 1, max: 2, typical: 1 };
  }
}

/**
 * Get expected feed count based on age
 */
export function getExpectedFeedCount(ageInMonths: number): { min: number; max: number; typical: number } {
  if (ageInMonths < 1) {
    return { min: 8, max: 12, typical: 10 };
  } else if (ageInMonths < 3) {
    return { min: 6, max: 10, typical: 8 };
  } else if (ageInMonths < 6) {
    return { min: 5, max: 8, typical: 6 };
  } else if (ageInMonths < 9) {
    return { min: 4, max: 6, typical: 5 };
  } else {
    return { min: 3, max: 5, typical: 4 };
  }
}

/**
 * Get wake window range based on age (in minutes)
 */
export function getWakeWindowRange(ageInMonths: number): { min: number; max: number; typical: number } {
  if (ageInMonths < 2) {
    return { min: 45, max: 75, typical: 60 };
  } else if (ageInMonths < 4) {
    return { min: 60, max: 105, typical: 90 };
  } else if (ageInMonths < 6) {
    return { min: 105, max: 150, typical: 120 };
  } else if (ageInMonths < 9) {
    return { min: 150, max: 210, typical: 180 };
  } else if (ageInMonths < 12) {
    return { min: 180, max: 270, typical: 210 };
  } else {
    return { min: 210, max: 330, typical: 270 };
  }
}
