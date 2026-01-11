import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity } from "@/types/activity";
import { rawStorage } from "@/hooks/useLocalStorage";

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
import { TomorrowPreview } from "@/components/home/TomorrowPreview";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { HomeModals } from "@/components/home/HomeModals";

// Handlers
import { 
  handleMissedActivityAccept, 
  handleMissedActivityDismiss,
  handleQuickLog 
} from "@/components/home/homeTabHandlers";

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
  
  const effectiveBabyBirthday = household?.baby_birthday || babyBirthday;

  // Centralized state management
  const {
    babyAgeMonths,
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
      <div className="flex flex-col gap-[2px] bg-border/30">

        {/* Missed Activity Prompt */}
        {missedActivitySuggestion && (
          <div className="bg-card">
            <MissedActivityPrompt
              suggestion={missedActivitySuggestion}
              onAccept={() => handleMissedActivityAccept({
                suggestion: missedActivitySuggestion,
                householdId: household?.id,
                ongoingNap,
                addActivity
              })}
              onEdit={() => {
                const { activityType, subType } = missedActivitySuggestion;
                if (subType === 'morning-wake' && ongoingNap) {
                  onEditActivity(ongoingNap);
                } else {
                  onAddActivity?.(activityType);
                }
              }}
              onDismiss={() => handleMissedActivityDismiss(missedActivitySuggestion, household?.id)}
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
                await handleQuickLog({ type, time, activities, addActivity });
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
      <HomeModals
        showTodaysStory={showTodaysStory}
        setShowTodaysStory={setShowTodaysStory}
        selectedStoryDate={selectedStoryDate}
        setSelectedStoryDate={setSelectedStoryDate}
        activities={activities}
        babyName={babyName}
        showRhythmUnlocked={showRhythmUnlocked}
        setShowRhythmUnlocked={setShowRhythmUnlocked}
        showFirstActivityCelebration={showFirstActivityCelebration}
        setShowFirstActivityCelebration={setShowFirstActivityCelebration}
        firstActivityType={firstActivityType}
        showPrefillModal={showPrefillModal}
        setShowPrefillModal={setShowPrefillModal}
        babyAgeMonths={babyAgeMonths}
        addActivity={addActivity}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
      />
    </div>
  );
};
