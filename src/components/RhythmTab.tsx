import { useState, useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { supabase } from "@/integrations/supabase/client";
import { logger, logError } from "@/utils/logger";
import { generateAdaptiveSchedule, type NapCountAnalysis } from "@/utils/adaptiveScheduleGenerator";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import { UnifiedInsightCard } from "@/components/guide/UnifiedInsightCard";
import { TodaysPulse } from "@/components/home/TodaysPulse";
import { GrowthIndicators } from "@/components/home/GrowthIndicators";
import { useHomeTabIntelligence } from "@/hooks/useHomeTabIntelligence";
import { ParentingChat } from "@/components/ParentingChat";
import { useRhythmAnalysis } from "@/hooks/useRhythmAnalysis";
import { RhythmEmptyState, UnlockProgress, RhythmLoadingState } from "@/components/rhythm";

import { isNightSleep, isDaytimeNap } from "@/utils/napClassification";
import { getActivityEventDateString } from "@/utils/activityDate";
import { predictDailySchedule } from "@/utils/simpleSchedulePredictor";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface RhythmTabProps {
  activities: Activity[];
  onGoToSettings?: () => void;
}

interface RhythmInsights {
  heroInsight?: string;
  whatToKnow?: string[];
  whatToDo?: string[];
  whatsNext?: string;
  prepTip?: string;
  baselineContext?: string;
  currentPattern?: string;
  confidenceScore?: number;
  generatedAt?: Date;
}

export const RhythmTab = ({ activities, onGoToSettings }: RhythmTabProps) => {
  // ===== ALL HOOKS FIRST =====
  const { household, loading: householdLoading } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  const [rhythmInsights, setRhythmInsights] = useState<RhythmInsights | null>(null);
  const [rhythmInsightsLoading, setRhythmInsightsLoading] = useState(false);
  const [napCountAnalysis, setNapCountAnalysis] = useState<NapCountAnalysis | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentContext, setAdjustmentContext] = useState<string>("");
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('smartRemindersEnabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [patternMilestones, setPatternMilestones] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('patternMilestones');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ===== DERIVED VALUES =====
  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = household?.baby_birthday ? 
    Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;
  
  const needsBirthdaySetup = !babyAgeInWeeks || babyAgeInWeeks === 0;

  // Use rhythm analysis hook
  const { 
    toneFrequencies, 
    dataTiers, 
    transitionWindow,
    currentTone 
  } = useRhythmAnalysis(
    activities,
    household?.baby_birthday,
    nightSleepStartHour,
    nightSleepEndHour
  );
  
  const { hasTier1Data, hasTier2Data, hasTier3Data, required, remaining, unlockPercent } = dataTiers;
  const hasMinimumData = hasTier1Data && !needsBirthdaySetup;

  // Get user's timezone
  const userTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Map activities for home tab intelligence
  const mappedActivities = useMemo(() => 
    activities.map(a => ({
      ...a,
      loggedAt: a.logged_at,
      time: new Date(a.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    })),
    [activities]
  );
  
  const { todaysPulse } = useHomeTabIntelligence(
    mappedActivities as any,
    null,
    babyName,
    undefined,
    household?.baby_birthday
  );

  // Normalize activities for schedule predictor
  const normalizedActivities = useMemo(() => {
    return activities.map(a => ({
      id: a.id,
      type: a.type,
      timestamp: a.logged_at,
      logged_at: a.logged_at,
      details: a.details ?? {}
    }));
  }, [activities]);

  // Memoized adaptive schedule using prediction engine
  const adaptiveSchedule = useMemo(() => {
    const hasAnyNap = activities.filter(a => a.type === 'nap').length >= 1;
    
    if (!hasTier1Data || !hasAnyNap || !household?.baby_birthday) {
      return null;
    }
    
    try {
      const activitiesForEngine = activities.map(a => ({
        id: a.id,
        type: a.type as any,
        time: a.details?.displayTime || new Date(a.logged_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        loggedAt: a.logged_at,
        timezone: userTimezone,
        details: a.details
      }));
      
      const schedule = generateAdaptiveSchedule(
        activitiesForEngine, 
        household.baby_birthday, 
        hasTier3Data ? napCountAnalysis : null,
        activities.length,
        false,
        nightSleepStartHour,
        nightSleepEndHour,
        userTimezone
      );
      return schedule;
    } catch (error) {
      return null;
    }
  }, [activities, household?.baby_birthday, hasTier1Data, userTimezone, napCountAnalysis, hasTier3Data, nightSleepStartHour, nightSleepEndHour]);

  // Enable smart reminders
  useSmartReminders({ 
    schedule: adaptiveSchedule as any,
    enabled: remindersEnabled && hasTier3Data && !!adaptiveSchedule,
    activities: activities
  });

  // ===== EFFECTS =====

  // Sync reminder state with localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('smartRemindersEnabled');
      if (stored !== null) {
        setRemindersEnabled(stored === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-recalculate schedule when morning wake is logged
  useEffect(() => {
    if (!hasTier3Data || !household) return;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayWakeActivity = activities.find(a => {
      if (a.type === 'nap' && a.details?.endTime && isNightSleep(a, nightSleepStartHour, nightSleepEndHour)) {
        const timeMatch = a.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const period = timeMatch[3].toUpperCase();
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          if (hour >= 4 && hour <= 11) {
            const actDate = new Date(a.logged_at);
            const loggedDate = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
            
            if (loggedDate < todayStart) return true;
            if (actDate >= todayStart) return true;
          }
        }
      }
      return false;
    });
    
    if (todayWakeActivity) {
      const hasRecalculatedToday = sessionStorage.getItem(`schedule-recalc-${todayStart.toDateString()}`);
      if (!hasRecalculatedToday) {
        localStorage.removeItem('napCountAnalysis');
        localStorage.removeItem('napCountAnalysisLastFetch');
        sessionStorage.setItem(`schedule-recalc-${todayStart.toDateString()}`, 'true');
        
        supabase.functions.invoke('clear-schedule-cache', {
          body: { householdId: household.id }
        }).then(({ error }) => {
          if (error) logError('Clear schedule cache', error);
        });
      }
    }
  }, [activities, hasTier3Data, household, nightSleepStartHour, nightSleepEndHour]);

  // Listen for activity logs and trigger context-aware adjustments
  useEffect(() => {
    if (!hasTier3Data) return;
    
    const recentActivity = activities[0];
    if (!recentActivity) return;
    
    const activityTime = new Date(recentActivity.logged_at);
    const now = new Date();
    const timeDiff = now.getTime() - activityTime.getTime();
    if (timeDiff > 5000) return;
    
    setIsAdjusting(true);
    
    if (recentActivity.type === 'nap' && recentActivity.details?.endTime) {
      const endTimeStr = recentActivity.details.endTime;
      const endMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      
      if (endMatch) {
        let endHour = parseInt(endMatch[1]);
        const period = endMatch[3].toUpperCase();
        if (period === 'PM' && endHour !== 12) endHour += 12;
        if (period === 'AM' && endHour === 12) endHour = 0;
        
        const startTime = new Date(recentActivity.logged_at);
        const endMinute = parseInt(endMatch[2]);
        const duration = (endHour * 60 + endMinute - (startTime.getHours() * 60 + startTime.getMinutes()));
        
        if (duration < 30) {
          setAdjustmentContext("Short nap detected — adjusting afternoon nap window.");
        } else if (endHour >= 16) {
          setAdjustmentContext("Late nap means bedtime might shift a bit later tonight.");
        } else if (isNightSleep(recentActivity, nightSleepStartHour, nightSleepEndHour)) {
          if (endHour >= 4 && endHour < 7) {
            setAdjustmentContext("Early wake — adjusting nap times for the day.");
          } else if (endHour >= 8) {
            setAdjustmentContext("Recalculated based on a later start to the day.");
          } else {
            setAdjustmentContext("Adjusting today's rhythm…");
          }
        } else {
          setAdjustmentContext("Adjusting today's rhythm…");
        }
      }
    } else if (recentActivity.type === 'nap' && !recentActivity.details?.endTime) {
      setAdjustmentContext("Nap started — updating rest of day schedule.");
    } else if (recentActivity.type === 'feed') {
      setAdjustmentContext("Feed logged — refining today's timeline.");
    } else {
      setAdjustmentContext("Adjusting today's rhythm…");
    }
    
    setTimeout(() => {
      setIsAdjusting(false);
      setAdjustmentContext("");
    }, 1800);
  }, [activities.length, hasTier3Data, nightSleepStartHour, nightSleepEndHour]);

  // Fetch rhythm insights (only for Tier 3)
  useEffect(() => {
    if (!hasTier3Data || !household) {
      setRhythmInsightsLoading(false);
      return;
    }
    
    const fetchRhythmInsights = async (showLoadingState = false) => {
      if (showLoadingState) setRhythmInsightsLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-guide-sections', {
          body: { timezone: userTimezone }
        });
        
        if (error) {
          logError('Fetch guide sections', error);
          if (showLoadingState) setRhythmInsightsLoading(false);
          return;
        }
        
        if (data) {
          const todayDate = new Date().toDateString();
          const insightData = {
            ...data,
            generatedDate: todayDate,
            generatedAt: new Date().toISOString()
          };
          
          setRhythmInsights({
            whatToKnow: data.what_to_know,
            whatToDo: data.what_to_do,
            whatsNext: data.whats_next,
            prepTip: data.prep_tip,
            baselineContext: data.baseline_context,
            currentPattern: data.current_pattern,
            generatedAt: new Date()
          });
          localStorage.setItem('guideSections', JSON.stringify(insightData));
          localStorage.setItem('guideSectionsLastFetch', new Date().toISOString());
        }
      } catch (err) {
        logError('Fetch guide sections', err);
      } finally {
        if (showLoadingState) setRhythmInsightsLoading(false);
      }
    };

    const cachedGuideSections = localStorage.getItem('guideSections');
    const currentDate = new Date().toDateString();
    
    if (cachedGuideSections) {
      try {
        const parsed = JSON.parse(cachedGuideSections);
        const cachedDate = parsed.generatedDate;
        
        setRhythmInsights({
          whatToKnow: parsed.what_to_know,
          whatToDo: parsed.what_to_do,
          whatsNext: parsed.whats_next,
          prepTip: parsed.prep_tip,
          baselineContext: parsed.baseline_context,
          currentPattern: parsed.current_pattern,
          generatedAt: parsed.generatedAt ? new Date(parsed.generatedAt) : undefined
        });
        setRhythmInsightsLoading(false);
        
        if (cachedDate !== currentDate) {
          localStorage.removeItem('guideSections');
          fetchRhythmInsights(false);
        }
        return;
      } catch (e) {
        localStorage.removeItem('guideSections');
      }
    }
    
    fetchRhythmInsights(true);
  }, [hasTier3Data, household, babyAgeInWeeks, activities.length, userTimezone]);

  // Fetch nap count analysis (only for Tier 2+)
  useEffect(() => {
    if (!hasTier2Data || !household || needsBirthdaySetup) return;
    
    const fetchNapCountAnalysis = async (showLoadingState = false) => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayActivities = normalizedActivities.filter(a => {
          return getActivityEventDateString(a) === todayStr;
        });
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];
        const recentActivities = normalizedActivities.filter(a => {
          const dateStr = getActivityEventDateString(a);
          return dateStr >= fifteenDaysAgoStr && dateStr <= yesterdayStr;
        });
        
        const prediction = predictDailySchedule(
          recentActivities,
          todayActivities,
          household?.baby_birthday,
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        
        setNapCountAnalysis(prediction);
        localStorage.setItem('napCountAnalysis', JSON.stringify(prediction));
        localStorage.setItem('napCountAnalysisLastFetch', new Date().toISOString());
      } catch (err) {
        // Error handled silently
      }
    };

    const lastFetch = localStorage.getItem('napCountAnalysisLastFetch');
    const cachedAnalysis = localStorage.getItem('napCountAnalysis');
    const now = new Date();
    const currentHour = now.getHours();
    
    if (cachedAnalysis) {
      try {
        const parsed = JSON.parse(cachedAnalysis);
        setNapCountAnalysis(parsed);
        
        if (lastFetch) {
          const lastFetchDate = new Date(lastFetch);
          const lastFetchHour = lastFetchDate.getHours();
          const isSameDay = lastFetchDate.toDateString() === now.toDateString();
          
          if (!isSameDay || (currentHour >= 5 && lastFetchHour < 5)) {
            fetchNapCountAnalysis(false);
          }
        }
        return;
      } catch (e) {
        localStorage.removeItem('napCountAnalysis');
      }
    }
    
    fetchNapCountAnalysis(false);
  }, [hasTier2Data, household, activities.length, normalizedActivities, needsBirthdaySetup]);

  // Track pattern milestones
  useEffect(() => {
    if (!currentTone) return;
    
    if (toneFrequencies.tones.length >= 1 && !patternMilestones.has('first_pattern')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('first_pattern');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
    
    if (toneFrequencies.currentStreak >= 3 && !patternMilestones.has('streak_3')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('streak_3');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
    
    if (toneFrequencies.currentStreak >= 7 && !patternMilestones.has('streak_7')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('streak_7');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
  }, [currentTone, toneFrequencies.currentStreak, toneFrequencies.tones.length, patternMilestones]);

  // ===== RENDER =====
  return (
    <div className="flex flex-col h-full bg-background pb-24">
      {householdLoading ? (
        <RhythmLoadingState />
      ) : !household ? (
        <RhythmEmptyState type="no-household" onGoToSettings={onGoToSettings} />
      ) : (
        <>
          {needsBirthdaySetup && (
            <RhythmEmptyState type="needs-birthday" onGoToSettings={onGoToSettings} />
          )}

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="pt-0 space-y-0">
              {!needsBirthdaySetup && (
                <>
                  <TodaysPulse
                    activities={activities}
                    babyName={babyName}
                    babyAge={babyAgeInWeeks}
                    babyBirthday={household?.baby_birthday}
                  />
                  <GrowthIndicators 
                    activities={activities as any} 
                    babyBirthday={household?.baby_birthday}
                  />
                </>
              )}
              
              {!needsBirthdaySetup && hasTier1Data && !hasTier3Data && (
                <UnlockProgress
                  hasTier2Data={hasTier2Data}
                  unlockPercent={unlockPercent}
                  required={required}
                  remaining={remaining}
                />
              )}

              {hasMinimumData && hasTier3Data && (
                <UnifiedInsightCard
                  whatToKnow={rhythmInsights?.whatToKnow}
                  whatToDo={rhythmInsights?.whatToDo}
                  whatsNext={rhythmInsights?.whatsNext}
                  prepTip={rhythmInsights?.prepTip}
                  baselineContext={rhythmInsights?.baselineContext}
                  currentPattern={rhythmInsights?.currentPattern}
                  babyName={babyName}
                  loading={rhythmInsightsLoading || !rhythmInsights}
                  chatComponent={
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="w-full text-center group"
                    >
                      <span className="text-sm text-primary font-medium underline decoration-2 underline-offset-4 inline-flex items-center gap-1 group-hover:opacity-80 transition-opacity">
                        Ask Me Anything →
                      </span>
                    </button>
                  }
                />
              )}
            </div>
          </ScrollArea>

          <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
              <DialogHeader className="p-4 pb-3 border-b">
                <DialogTitle>Parenting Coach</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <ParentingChat
                  activities={activities}
                  babyName={babyName}
                  babyAgeInWeeks={babyAgeInWeeks}
                  babySex={household?.baby_sex || undefined}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
