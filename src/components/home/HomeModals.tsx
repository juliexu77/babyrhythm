import { format } from "date-fns";
import { Activity } from "@/types/activity";
import { rawStorage, StorageKeys } from "@/hooks/useLocalStorage";

import { RhythmUnlockedModal } from "@/components/RhythmUnlockedModal";
import { TodaysStoryModal } from "@/components/home/TodaysStoryModal";
import { FirstActivityCelebration } from "@/components/FirstActivityCelebration";
import { PrefillDayModal } from "@/components/PrefillDayModal";
import { OnboardingTutorial } from "@/components/onboarding/OnboardingTutorial";
import { getAvailableStoryDates } from "./homeTabHandlers";

interface HomeModalsProps {
  // Today's Story
  showTodaysStory: boolean;
  setShowTodaysStory: (show: boolean) => void;
  selectedStoryDate: string | null;
  setSelectedStoryDate: (date: string | null) => void;
  activities: Activity[];
  babyName?: string;
  
  // Rhythm Unlocked
  showRhythmUnlocked: boolean;
  setShowRhythmUnlocked: (show: boolean) => void;
  
  // First Activity
  showFirstActivityCelebration: boolean;
  setShowFirstActivityCelebration: (show: boolean) => void;
  firstActivityType: 'feed' | 'nap' | 'diaper';
  
  // Prefill
  showPrefillModal: boolean;
  setShowPrefillModal: (show: boolean) => void;
  babyAgeMonths: number | null;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
  
  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

export const HomeModals = ({
  showTodaysStory,
  setShowTodaysStory,
  selectedStoryDate,
  setSelectedStoryDate,
  activities,
  babyName,
  showRhythmUnlocked,
  setShowRhythmUnlocked,
  showFirstActivityCelebration,
  setShowFirstActivityCelebration,
  firstActivityType,
  showPrefillModal,
  setShowPrefillModal,
  babyAgeMonths,
  addActivity,
  showOnboarding,
  setShowOnboarding
}: HomeModalsProps) => {
  return (
    <>
      <TodaysStoryModal
        isOpen={showTodaysStory}
        onClose={() => {
          setShowTodaysStory(false);
          setSelectedStoryDate(null);
        }}
        activities={activities}
        babyName={babyName}
        targetDate={selectedStoryDate || format(new Date(), 'yyyy-MM-dd')}
        availableDates={getAvailableStoryDates()}
        onNavigate={(newDate) => {
          setSelectedStoryDate(newDate);
        }}
        allActivities={activities}
      />

      <RhythmUnlockedModal 
        isOpen={showRhythmUnlocked}
        onClose={() => setShowRhythmUnlocked(false)}
        babyName={babyName}
        totalLogs={activities.length}
      />

      <FirstActivityCelebration
        open={showFirstActivityCelebration}
        onClose={() => setShowFirstActivityCelebration(false)}
        babyName={babyName}
        activityType={firstActivityType}
      />

      <PrefillDayModal
        isOpen={showPrefillModal}
        onClose={() => setShowPrefillModal(false)}
        babyAgeMonths={babyAgeMonths}
        onPrefill={(prefillActivities) => {
          prefillActivities.forEach(activity => {
            addActivity?.(activity.type, activity.details, new Date(), activity.time);
          });
        }}
      />

      <OnboardingTutorial
        isOpen={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          rawStorage.set(StorageKeys.ONBOARDING_COMPLETED as any, 'true');
        }}
        babyName={babyName}
      />
    </>
  );
};
