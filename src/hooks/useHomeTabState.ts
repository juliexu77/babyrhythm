/**
 * State management hook for HomeTab.
 * Extracts all useState/useEffect logic for cleaner component.
 */

import { useState, useEffect, useMemo } from "react";
import { Activity } from "@/types/activity";
import { calculateBabyAge } from "@/hooks/useBabyAge";
import { detectTransitionWindow } from "@/utils/ageBasedExpectations";
import { useHousehold } from "@/hooks/useHousehold";
import { isDaytimeNap } from "@/utils/napClassification";

interface UseHomeTabStateProps {
  activities: Activity[];
  babyBirthday?: string;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
}

export const useHomeTabState = ({
  activities,
  babyBirthday,
  nightSleepStartHour,
  nightSleepEndHour,
}: UseHomeTabStateProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRhythmUnlocked, setShowRhythmUnlocked] = useState(false);
  const [showTodaysStory, setShowTodaysStory] = useState(false);
  const [selectedStoryDate, setSelectedStoryDate] = useState<string | null>(null);
  const [showFirstActivityCelebration, setShowFirstActivityCelebration] = useState(false);
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [firstActivityType, setFirstActivityType] = useState<'feed' | 'nap' | 'diaper'>('feed');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showAlternateSchedule, setShowAlternateSchedule] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isQuickLogging, setIsQuickLogging] = useState(false);

  // Get household context for baby birthday
  const { household } = useHousehold();
  const effectiveBirthday = household?.baby_birthday || babyBirthday;

  // Calculate baby age from birthday
  const babyAge = useMemo(() => calculateBabyAge(effectiveBirthday), [effectiveBirthday]);
  const babyAgeMonths = babyAge.ageInMonths || null;
  const babyAgeInWeeks = babyAge.ageInWeeks || undefined;
  const babyAgeInDays = babyAge.ageInDays || null;

  // Transition window detection
  const transitionWindow = useMemo(() => 
    detectTransitionWindow(babyAgeInDays), 
    [babyAgeInDays]
  );

  // Activity counts
  const napsCount = useMemo(() => 
    activities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)).length,
    [activities, nightSleepStartHour, nightSleepEndHour]
  );
  
  const feedsCount = useMemo(() => 
    activities.filter(a => a.type === 'feed').length,
    [activities]
  );

  const isRhythmUnlocked = napsCount >= 1;

  // Check if user has minimum logs (1 feed + 1 daytime nap)
  const hasFeed = activities.some(a => a.type === 'feed');
  const hasSleep = activities.some(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
  const hasMinimumLogs = hasFeed && hasSleep;
  const showEducationalContent = !hasMinimumLogs;

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // First activity celebration
  useEffect(() => {
    const hasShownCelebration = localStorage.getItem('first_activity_celebrated') === 'true';
    
    if (!hasShownCelebration && activities.length === 1) {
      const firstActivity = activities[0];
      setFirstActivityType(firstActivity.type as 'feed' | 'nap' | 'diaper');
      setShowFirstActivityCelebration(true);
      localStorage.setItem('first_activity_celebrated', 'true');
    }
  }, [activities.length]);

  // Onboarding for new users
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('onboarding_completed') === 'true';
    
    if (activities.length > 0) {
      if (!hasSeenOnboarding) {
        localStorage.setItem('onboarding_completed', 'true');
      }
      setShowOnboarding(false);
      return;
    }
    
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [activities.length]);

  // Pulse Rhythm tab after first nap
  useEffect(() => {
    if (napsCount === 1) {
      const rhythmTab = document.querySelector('[data-tab="rhythm"]') as HTMLElement;
      if (rhythmTab && !rhythmTab.classList.contains('animate-pulse')) {
        rhythmTab.classList.add('animate-pulse');
        setTimeout(() => {
          rhythmTab.classList.remove('animate-pulse');
        }, 3000);
      }
    }
  }, [napsCount]);

  return {
    // Time
    currentTime,
    
    // Baby age
    babyAge,
    babyAgeMonths,
    babyAgeInWeeks,
    babyAgeInDays,
    
    // Transition
    transitionWindow,
    
    // Activity counts
    napsCount,
    feedsCount,
    isRhythmUnlocked,
    
    // Educational state
    hasMinimumLogs,
    showEducationalContent,
    
    // Modal states
    showRhythmUnlocked,
    setShowRhythmUnlocked,
    showTodaysStory,
    setShowTodaysStory,
    selectedStoryDate,
    setSelectedStoryDate,
    showFirstActivityCelebration,
    setShowFirstActivityCelebration,
    showPrefillModal,
    setShowPrefillModal,
    firstActivityType,
    showOnboarding,
    setShowOnboarding,
    
    // Schedule state
    scheduleOpen,
    setScheduleOpen,
    showAlternateSchedule,
    setShowAlternateSchedule,
    
    // Quick log state
    isQuickLogging,
    setIsQuickLogging,
  };
};
