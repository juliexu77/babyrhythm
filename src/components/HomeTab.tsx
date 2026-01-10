import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { Activity } from "@/types/activity";
import { rawStorage, StorageKeys } from "@/hooks/useLocalStorage";

// Hooks
import { usePredictionEngine } from "@/hooks/usePredictionEngine";
import { useHomeTabIntelligence } from "@/hooks/useHomeTabIntelligence";
import { useMissedActivityDetection } from "@/hooks/useMissedActivityDetection";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { useHousehold } from "@/hooks/useHousehold";
import { useHomeTabState } from "@/hooks/useHomeTabState";

// Components
import { QuickLogBar } from "@/components/home/QuickLogBar";
import { DailyStatsBar } from "@/components/home/DailyStatsBar";
import { WeeklyRhythm } from "@/components/guide/WeeklyRhythm";
import { RightNowStatus } from "@/components/home/RightNowStatus";
import { StatusCarousel } from "@/components/home/StatusCarousel";
import { MissedActivityPrompt } from "@/components/MissedActivityPrompt";
import { LearningProgress } from "@/components/LearningProgress";
import { RhythmUnlockedModal } from "@/components/RhythmUnlockedModal";
import { TodaysStoryModal } from "@/components/home/TodaysStoryModal";
import { TomorrowPreview } from "@/components/home/TomorrowPreview";
import { FirstActivityCelebration } from "@/components/FirstActivityCelebration";
import { PrefillDayModal } from "@/components/PrefillDayModal";
import { OnboardingTutorial } from "@/components/onboarding/OnboardingTutorial";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";

// Utils
import { logError } from "@/utils/logger";

interface HomeTabProps {
  activities: Activity[];
  babyName?: string;
  userName?: string;
  babyBirthday?: string;
  onAddActivity: (type?: 'feed' | 'nap' | 'diaper', prefillActivity?: Activity) => void;
  onEditActivity: (activity: Activity) => void;
  onEndNap?: () => void;
  ongoingNap?: Activity | null;
  userRole?: string;
  showBadge?: boolean;
  percentile?: number | null;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
  travelDayDates?: string[];
}

export const HomeTab = ({ 
  activities, 
  babyName, 
  userName, 
  babyBirthday, 
  onAddActivity, 
  onEditActivity, 
  onEndNap, 
  ongoingNap: passedOngoingNap, 
  userRole, 
  showBadge, 
  percentile, 
  addActivity, 
  travelDayDates = [] 
}: HomeTabProps) => {
  const { t } = useLanguage();
  const { nightSleepEndHour, nightSleepStartHour } = useNightSleepWindow();
  const { household } = useHousehold();
  
  // Use household baby_birthday as authoritative source
  const effectiveBabyBirthday = household?.baby_birthday || babyBirthday;

  // Centralized state management
  const {
    currentTime,
    babyAgeMonths,
    babyAgeInWeeks,
    isRhythmUnlocked,
    showEducationalContent,
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
    isQuickLogging,
    setIsQuickLogging,
  } = useHomeTabState({
    activities,
    babyBirthday: effectiveBabyBirthday,
    nightSleepStartHour,
    nightSleepEndHour,
  });

  // Intelligence hooks
  const { prediction, getIntentCopy } = usePredictionEngine(activities);
  const { 
    currentActivity, 
    nextPrediction, 
    smartSuggestions
  } = useHomeTabIntelligence(activities, passedOngoingNap, babyName, (type) => onAddActivity(type), effectiveBabyBirthday);

  // Missed activity detection
  const missedActivitySuggestion = useMissedActivityDetection(
    activities, 
    babyName,
    nightSleepStartHour,
    nightSleepEndHour,
    household?.id
  );

  // Use passed ongoing nap for consistency
  const ongoingNap = passedOngoingNap;

  // Empty state for new users
  if (activities.length === 0) {
    return (
      <HomeEmptyState
        userName={userName}
        babyName={babyName}
        showEducationalContent={showEducationalContent}
        onAddActivity={() => onAddActivity()}
        onShowPrefillModal={() => setShowPrefillModal(true)}
      />
    );
  }

  return (
    <div className="pb-24">
      {/* Strava-style layout: full-width cards with tiny gaps */}
      <div className="flex flex-col gap-[2px] bg-border/30">

        {/* Missed Activity Prompt */}
        {missedActivitySuggestion && (
          <div className="bg-card">
            <MissedActivityPrompt
              suggestion={missedActivitySuggestion}
              onAccept={async () => {
                const { activityType, subType, suggestedTime } = missedActivitySuggestion;
                
                const acceptKey = `accepted-${household?.id || 'household'}-${activityType}-${subType || 'default'}-${format(new Date(), 'yyyy-MM-dd-HH:mm')}` as const;
                rawStorage.set(acceptKey as any, Date.now().toString());
                
                if (subType === 'morning-wake') {
                  if (ongoingNap && addActivity) {
                    try {
                      const { supabase } = await import('@/integrations/supabase/client');
                      
                      const { error } = await supabase
                        .from('activities')
                        .update({ details: { ...ongoingNap.details, endTime: suggestedTime } })
                        .eq('id', ongoingNap.id);
                      
                      if (error) throw error;
                      window.dispatchEvent(new CustomEvent('refetch-activities'));
                    } catch (error) {
                      logError('End sleep', error);
                    }
                  }
                } else {
                  if (activityType === 'nap') {
                    await addActivity?.('nap', { startTime: suggestedTime }, new Date(), suggestedTime);
                  } else {
                    await addActivity?.(activityType, {}, new Date(), suggestedTime);
                  }
                }
              }}
              onEdit={() => {
                const { activityType, subType } = missedActivitySuggestion;
                
                if (subType === 'morning-wake' && ongoingNap) {
                  onEditActivity(ongoingNap);
                } else {
                  onAddActivity?.(activityType);
                }
              }}
              onDismiss={() => {
                const { activityType, subType } = missedActivitySuggestion;
                const dismissalKey = `missed-${household?.id || 'household'}-${activityType}-${subType || 'default'}-${format(new Date(), 'yyyy-MM-dd')}` as const;
                rawStorage.set(dismissalKey as any, 'true');
                window.dispatchEvent(new CustomEvent('refetch-activities'));
              }}
            />
          </div>
        )}

        {/* Status Carousel */}
        <div className="bg-card">
          <StatusCarousel>
            <RightNowStatus
              currentActivity={currentActivity}
              nextPrediction={nextPrediction}
              onWokeEarly={() => onEndNap?.()}
              onStillAsleep={() => {}}
              onStartNap={() => onAddActivity('nap')}
              onEndFeed={() => {}}
              babyName={babyName || 'Baby'}
              babyAge={babyAgeMonths}
              activities={activities}
              suggestions={smartSuggestions}
              onAddFeed={() => onAddActivity('feed')}
              onLogPrediction={(type) => onAddActivity(type)}
              nightSleepStartHour={nightSleepStartHour}
              nightSleepEndHour={nightSleepEndHour}
            />
            <DailyStatsBar activities={activities} />
          </StatusCarousel>
        </div>

        {/* Quick Log Bar */}
        <div className="bg-card">
          <QuickLogBar
            onLogActivity={async (type, time) => {
              setIsQuickLogging(true);
              try {
                if (type === 'nap') {
                  await addActivity?.('nap', { startTime: time }, new Date(), time);
                } else if (type === 'feed') {
                  const recentFeed = activities
                    .filter(a => a.type === 'feed' && a.details?.quantity)
                    .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
                  
                  const feedDetails: any = {};
                  if (recentFeed?.details?.quantity) {
                    feedDetails.quantity = recentFeed.details.quantity;
                    if (recentFeed.details.unit) feedDetails.unit = recentFeed.details.unit;
                    if (recentFeed.details.feedType) feedDetails.feedType = recentFeed.details.feedType;
                  }
                  
                  await addActivity?.('feed', feedDetails, new Date(), time);
                } else if (type === 'diaper') {
                  await addActivity?.('diaper', {}, new Date(), time);
                }
              } catch (error) {
                console.error('Could not log activity:', error);
              } finally {
                setIsQuickLogging(false);
              }
            }}
            isLoading={isQuickLogging}
          />
        </div>

        {/* Weekly Rhythm */}
        {activities.length > 0 && (
          <div className="bg-card">
            <WeeklyRhythm 
              activities={activities}
              babyName={babyName || 'Baby'}
              travelDayDates={travelDayDates}
            />
          </div>
        )}

        {/* Learning Progress */}
        {!isRhythmUnlocked && activities.length > 0 && (
          <div className="bg-card px-4 py-3">
            <LearningProgress 
              activities={activities}
              babyName={babyName}
              onRhythmUnlocked={() => setShowRhythmUnlocked(true)}
            />
          </div>
        )}

        {/* Tomorrow Preview */}
        <div className="bg-card">
          <TomorrowPreview
            activities={activities}
            babyName={babyName}
            onClick={() => {
              setSelectedStoryDate(null);
              setShowTodaysStory(true);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <TodaysStoryModal
        isOpen={showTodaysStory}
        onClose={() => {
          setShowTodaysStory(false);
          setSelectedStoryDate(null);
        }}
        activities={activities}
        babyName={babyName}
        targetDate={selectedStoryDate || format(new Date(), 'yyyy-MM-dd')}
        availableDates={(() => {
          const dates: string[] = [];
          const today = new Date();
          for (let i = 4; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(format(date, 'yyyy-MM-dd'));
          }
          return dates;
        })()}
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
    </div>
  );
};
