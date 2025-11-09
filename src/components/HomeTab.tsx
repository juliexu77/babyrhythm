import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SyncIndicator } from "@/components/SyncIndicator";
import { Baby, Droplet, Moon, Clock, Milk, Eye, TrendingUp, Ruler, Plus, Palette, Circle, AlertCircle, Sprout, Activity as ActivityIcon, FileText, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isToday, differenceInMinutes, differenceInHours } from "date-fns";
import { usePredictionEngine } from "@/hooks/usePredictionEngine";
import { useHomeTabIntelligence } from "@/hooks/useHomeTabIntelligence";
import { Activity } from "@/components/ActivityCard";
import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { RightNowStatus } from "@/components/home/RightNowStatus";
import { SmartQuickActions } from "@/components/home/SmartQuickActions";
import { TodaysPulse } from "@/components/home/TodaysPulse";
import { CollectivePulse } from "@/components/home/CollectivePulse";
import { LearningProgress } from "@/components/LearningProgress";
import { RhythmUnlockedModal } from "@/components/RhythmUnlockedModal";
import { ParentingChat } from "@/components/ParentingChat";
import { useToast } from "@/hooks/use-toast";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getDailySentiment as calculateDailySentiment } from "@/utils/sentimentAnalysis";
import { getTodayActivities, getYesterdayActivities } from "@/utils/activityDateFilters";
import { useHousehold } from "@/hooks/useHousehold";
import { TodaysStory } from "@/components/home/TodaysStory";
import { TodaysStoryModal } from "@/components/home/TodaysStoryModal";
import { DailyStoryCircles } from "@/components/home/DailyStoryCircles";
// Convert UTC timestamp string to local Date object
const parseUTCToLocal = (ts: string): Date => {
  // The database returns UTC timestamps - convert to local time
  return new Date(ts);
};

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
}

export const HomeTab = ({ activities, babyName, userName, babyBirthday, onAddActivity, onEditActivity, onEndNap, ongoingNap: passedOngoingNap, userRole, showBadge, percentile, addActivity }: HomeTabProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { nightSleepEndHour } = useNightSleepWindow();
  const { household } = useHousehold();
  
  // Use household baby_birthday as authoritative source (same as GuideTab)
  const effectiveBabyBirthday = household?.baby_birthday || babyBirthday;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFeedDetails, setShowFeedDetails] = useState(false);
  const [showSleepDetails, setShowSleepDetails] = useState(false);
  const [showGrowthDetails, setShowGrowthDetails] = useState(false);
  const [showToneInsight, setShowToneInsight] = useState(false);
  const [showPredictionInsight, setShowPredictionInsight] = useState(false);
  const [showFeedStatusInsight, setShowFeedStatusInsight] = useState(false);
  const [showSleepStatusInsight, setShowSleepStatusInsight] = useState(false);
  const [showDailyInsight, setShowDailyInsight] = useState(false);
  const [showRhythmUnlocked, setShowRhythmUnlocked] = useState(false);
  const [showTodaysStory, setShowTodaysStory] = useState(false);
  const [selectedStoryDate, setSelectedStoryDate] = useState<string | null>(null);
  const [selectedStoryActivities, setSelectedStoryActivities] = useState<Activity[]>([]);
  const { prediction, getIntentCopy, getProgressText } = usePredictionEngine(activities);
  
  // New home tab intelligence hook
  const { 
    currentActivity, 
    nextPrediction, 
    smartSuggestions, 
    todaysPulse 
  } = useHomeTabIntelligence(activities, passedOngoingNap, babyName, (type) => onAddActivity(type), effectiveBabyBirthday);

  // Track visited tabs for progressive disclosure
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('babyrhythm_visited_tabs');
      return stored ? new Set(JSON.parse(stored)) : new Set(['home']);
    } catch {
      return new Set(['home']);
    }
  });

  // Track tab visits from parent via click events
  useEffect(() => {
    const handleTabClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-tab]');
      if (button) {
        const tab = button.getAttribute('data-tab');
        if (tab) {
          setVisitedTabs(prev => {
            const newSet = new Set(prev).add(tab);
            localStorage.setItem('babyrhythm_visited_tabs', JSON.stringify([...newSet]));
            return newSet;
          });
        }
      }
    };

    document.addEventListener('click', handleTabClick);
    return () => document.removeEventListener('click', handleTabClick);
  }, []);

  const hasVisitedAllTabs = visitedTabs.has('home') && visitedTabs.has('trends') && 
                             visitedTabs.has('guide') && visitedTabs.has('log');
  
  // Show educational content until user has logged at least one feed AND one sleep, OR 5+ total activities
  const hasFeed = activities.some(a => a.type === 'feed');
  const hasSleep = activities.some(a => a.type === 'nap' && !a.details?.isNightSleep);
  const hasMinimumLogs = (hasFeed && hasSleep) || activities.length >= 5;
  const showEducationalContent = !hasMinimumLogs;

  // Check if rhythm is unlocked
  const napsCount = activities.filter(a => a.type === 'nap' && !a.details?.isNightSleep).length;
  const feedsCount = activities.filter(a => a.type === 'feed').length;
  const isRhythmUnlocked = napsCount >= 4 && feedsCount >= 4;

  // Calculate baby's age in months and weeks
  const getBabyAge = () => {
    if (!effectiveBabyBirthday) return null;
    const birthDate = new Date(effectiveBabyBirthday);
    const today = new Date();
    const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    const months = Math.max(0, totalMonths);
    
    // Calculate remaining weeks
    const monthsDate = new Date(birthDate);
    monthsDate.setMonth(monthsDate.getMonth() + totalMonths);
    const daysDiff = Math.floor((today.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysDiff / 7);
    
    return { months, weeks };
  };

  const babyAge = getBabyAge();
  const babyAgeMonths = babyAge?.months || null;
  
  // Calculate baby age in weeks for chat
  const getBabyAgeInWeeks = () => {
    if (!effectiveBabyBirthday) return undefined;
    const birthDate = new Date(effectiveBabyBirthday);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };
  
  const babyAgeInWeeks = getBabyAgeInWeeks();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  // Get the greeting line including user name
  const getGreetingLine = () => {
    const greeting = getGreeting();
    return userName ? `${greeting}, ${userName}` : greeting;
  };

  // Get today's and yesterday's activities using shared utility
  const todayActivities = getTodayActivities(activities);
  const yesterdayActivities = getYesterdayActivities(activities);

  // Use yesterday's data as context if nothing logged today
  const displayActivities = todayActivities.length > 0 ? todayActivities : yesterdayActivities;
  const showingYesterday = todayActivities.length === 0 && yesterdayActivities.length > 0;
  
  // Debug: detailed activity breakdown
  if (typeof window !== 'undefined') {
    console.groupCollapsed('HomeTab - Today vs Yesterday filter');
    console.log('All activities count:', activities.length);
    console.log('Today count:', todayActivities.length);
    console.log('Yesterday count:', yesterdayActivities.length);
    console.log('Showing yesterday fallback?', showingYesterday);
    console.log('Today\'s dates:', todayActivities.map(a => ({ 
      id: a.id?.slice(0,8), 
      type: a.type, 
      loggedAt: a.loggedAt,
      parsed: parseUTCToLocal(a.loggedAt!).toLocaleString()
    })));
    if (showingYesterday) {
      console.log('Yesterday\'s dates:', yesterdayActivities.map(a => ({ 
        id: a.id?.slice(0,8), 
        type: a.type, 
        loggedAt: a.loggedAt,
        parsed: parseUTCToLocal(a.loggedAt!).toLocaleString()
      })));
    }
    console.groupEnd();
  }
  
  // Helper: parse a UI time string like "7:05 AM" (handles "7:05 AM - 8:15 AM")
  const parseUI12hToMinutes = (timeStr?: string | null): number | null => {
    if (!timeStr) return null;
    const first = timeStr.includes(' - ') ? timeStr.split(' - ')[0] : timeStr;
    const m = first.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const period = m[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  };

  // Compute a comparable timestamp for sorting: use activity time on today's date
  const getComparableTime = (a: Activity): number => {
    const today = new Date();
    const base = new Date(today.toDateString()); // Start with today at midnight
    let minutes: number | null = null;
    if (a.type === 'nap' && a.details?.startTime) {
      minutes = parseUI12hToMinutes(a.details.startTime);
    } else if (a.details?.displayTime) {
      minutes = parseUI12hToMinutes(a.details.displayTime);
    } else if (a.time) {
      minutes = parseUI12hToMinutes(a.time);
    }
    if (minutes !== null) {
      base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    }
    return base.getTime();
  };
  
  // Precompute sorted activities for timeline and debug
  const sortedActivities = [...displayActivities].sort((a, b) => getComparableTime(a) - getComparableTime(b));
  if (typeof window !== 'undefined') {
    try {
      console.groupCollapsed('HomeTab timeline order');
      sortedActivities.forEach((a, idx) => {
        const cmp = getComparableTime(a);
        console.log(`#${idx + 1}`, {
          id: a.id,
          type: a.type,
          time: a.time,
          startTime: a.details?.startTime,
          endTime: a.details?.endTime,
          displayTime: a.details?.displayTime,
          loggedAt: a.loggedAt,
          comparableLocal: new Date(cmp).toLocaleString(),
          comparableMs: cmp,
        });
      });
      console.groupEnd();
    } catch {}
  }
  
// Use the ongoingNap passed from parent (Index.tsx) for consistency
const ongoingNap = passedOngoingNap;

  // Calculate awake time
  const getAwakeTime = () => {
    if (ongoingNap) return null;

    const parseTimeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hStr, mStr] = time.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || '0', 10);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    // Find the most recent completed nap from displayActivities (today or yesterday)
    // Include night sleep as valid last sleep to compute awake time correctly
    const recentNaps = displayActivities.filter(a =>
      a.type === 'nap' && a.details?.endTime
    );

    if (recentNaps.length === 0) return null;

    const napsWithEndDate = recentNaps.map(nap => {
      // Use the actual logged date from the activity
      const loggedDate = nap.loggedAt ? parseUTCToLocal(nap.loggedAt) : new Date();
      const baseDate = new Date(loggedDate.toDateString());
      const endMinutes = parseTimeToMinutes(nap.details!.endTime!);
      const startMinutes = nap.details?.startTime ? parseTimeToMinutes(nap.details.startTime) : null;

      const endDate = new Date(baseDate);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      endDate.setHours(endHours, endMins, 0, 0);

      // If we have startTime and end < start, it ended after midnight (next day)
      if (startMinutes !== null && endMinutes < startMinutes) {
        endDate.setDate(endDate.getDate() + 1);
      }

      return { nap, endDate };
    });

    const last = napsWithEndDate.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];

    const awakeMinutes = differenceInMinutes(currentTime, last.endDate);
    if (awakeMinutes < 0) return null;
    const awakeHours = Math.floor(awakeMinutes / 60);
    const remainingMinutes = awakeMinutes % 60;

    return awakeHours > 0 ? `${awakeHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

const feedsToday = displayActivities.filter(a => a.type === 'feed');
const lastFeed = feedsToday
  .sort((a, b) => getComparableTime(b) - getComparableTime(a))[0];

// Debug last feed selection
if (typeof window !== 'undefined') {
  console.log('🍼 Last Feed Debug:', {
    totalFeeds: feedsToday.length,
    allFeeds: feedsToday.map(f => ({
      id: f.id?.slice(0, 8),
      time: f.time,
      loggedAt: f.loggedAt,
      parsedUTC: parseUTCToLocal(f.loggedAt!).toLocaleString(),
      utcMs: parseUTCToLocal(f.loggedAt!).getTime()
    })),
    selected: lastFeed ? {
      id: lastFeed.id?.slice(0, 8),
      time: lastFeed.time,
      loggedAt: lastFeed.loggedAt,
      parsedUTC: parseUTCToLocal(lastFeed.loggedAt!).toLocaleString()
    } : 'none'
  });
}

// Get last diaper - using actual activity time
const lastDiaper = displayActivities
  .filter(a => a.type === 'diaper')
  .sort((a, b) => getComparableTime(b) - getComparableTime(a))[0];

  // Get sleep status message with duration
  const getSleepStatus = () => {
    if (ongoingNap) {
      const startTime = ongoingNap.details?.startTime || ongoingNap.time;
      
      // Calculate sleep duration
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const today = new Date();
      const napStart = new Date(today.toDateString());
      napStart.setHours(hour24, minutes, 0, 0);
      
      const sleepMinutes = differenceInMinutes(currentTime, napStart);
      const sleepHours = Math.floor(sleepMinutes / 60);
      const remainingMinutes = sleepMinutes % 60;
      
      const durationText = sleepHours > 0 
        ? `${sleepHours}h ${remainingMinutes}m` 
        : `${remainingMinutes}m`;
      
      const qualityText = sleepHours >= 2 
        ? t('strongRestorativeNap')
        : sleepHours >= 1 
          ? t('restingDeeply')
          : t('settlingIn');
      
      const isNightSleep = ongoingNap.details?.isNightSleep;
      const sleepVerb = isNightSleep ? 'sleeping' : 'napping';
      const sleepingSince = isNightSleep ? 'has been sleeping since' : 'has been napping since';
      
      return {
        main: `${babyName || t('baby')} ${sleepingSince} ${startTime}`,
        sub: `${babyName?.split(' ')[0] || t('baby')} ${t('hasBeenRestingFor')} ${durationText} — ${qualityText}.`
      };
    }
    
    // If showing yesterday's data, adapt the message
    if (showingYesterday) {
      return {
        main: `${t('startingNewDay')} ${babyName || t('baby')}`,
        sub: t('yesterdayRhythm')
      };
    }
    
    const awakeTime = getAwakeTime();
    if (awakeTime) {
      return {
        main: `${babyName || t('baby')} ${t('hasBeenAwakeFor')} ${awakeTime}`,
        sub: null
      };
    }
    
    return {
      main: `${babyName || t('baby')} ${t('readyToStartDay')}`,
      sub: null
    };
  };

  // Get daily sentiment using shared logic
  const getDailySentiment = () => {
    return calculateDailySentiment(
      todayActivities,
      activities,
      babyAgeMonths,
      currentTime.getHours()
    );
  };

  // Get developmental phase description
  const getDevelopmentalPhase = () => {
    if (!babyAge) return null;
    
    const { months, weeks } = babyAge;
    
    if (months < 3) return t('inSleepyNewbornPhase');
    if (months < 6) return t('discoveringWorld');
    if (months < 9) return t('curiousExploratoryPhase');
    if (months < 12) return t('becomingMobile');
    if (months < 18) return t('learningToCommunicate');
    return t('growingIntoOwnPerson');
  };


  // Get contextual daily insight - one line per day
  const getDailyInsight = () => {
    const summary = getDailySummary();
    const expected = getExpectedFeeds(babyAgeMonths);
    const expectedNaps = getExpectedNaps(babyAgeMonths);
    
    // Check if user is in early days (first 24 hours)
    let isEarlyDays = false;
    if (activities.length > 0) {
      const firstActivity = [...activities].sort((a, b) => 
        getComparableTime(a) - getComparableTime(b)
      )[0];
      
      if (firstActivity) {
        const firstActivityTime = new Date(new Date().toDateString() + ' ' + firstActivity.time);
        const hoursSinceFirst = differenceInHours(currentTime, firstActivityTime);
        isEarlyDays = hoursSinceFirst < 24;
      }
    }
    
    // Early Days message - first 24 hours
    if (isEarlyDays) {
      return `Every log helps us learn ${babyName?.split(' ')[0] || 'your baby'}'s natural rhythm. You're building the foundation for personalized insights.`;
    }
    
    // Check cumulative activity counts (all time, not just today)
    const totalFeeds = activities.filter(a => a.type === 'feed').length;
    const totalNaps = activities.filter(a => a.type === 'nap' && !a.details?.isNightSleep).length;
    
    // Early state message - insufficient cumulative data (but past first 24 hours)
    if (totalFeeds < 4 || totalNaps < 4) {
      return `Keep logging feeds and sleeps—patterns will emerge soon! Every entry helps us understand ${babyName?.split(' ')[0] || 'your baby'}'s unique rhythm.`;
    }
    
    // Calculate 7-day rolling averages (simplified for now)
    const recentFeeds = activities.filter(a => a.type === 'feed').length / 7;
    const recentNaps = activities.filter(a => a.type === 'nap' && !a.details?.isNightSleep && a.details?.endTime).length / 7;
    
    // Sleep insights
    if (summary.napCount > 0 && expectedNaps) {
      const napDurations = displayActivities
        .filter(a => a.type === 'nap' && !a.details?.isNightSleep && a.details?.endTime)
        .map(nap => {
          const parseTime = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            const [hStr, mStr] = time.split(':');
            let h = parseInt(hStr, 10);
            const m = parseInt(mStr || '0', 10);
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
          };
          const startMinutes = parseTime(nap.details.startTime || nap.time);
          const endMinutes = parseTime(nap.details.endTime!);
          return endMinutes >= startMinutes 
            ? endMinutes - startMinutes 
            : (24 * 60) - startMinutes + endMinutes;
        });
      
      const avgNapDuration = napDurations.reduce((a, b) => a + b, 0) / napDurations.length;
      
      // 1. Nap consolidation
      if (avgNapDuration > 90 && babyAgeMonths !== null && babyAgeMonths >= 3) {
        return `Naps have been lengthening lately — a sign ${babyName?.split(' ')[0] || 'he'}'s settling into a two-nap rhythm.`;
      }
      
      // 2. Short nap phase
      if (avgNapDuration < 45) {
        return `Shorter naps today — common when babies are practicing new skills or adjusting wake windows.`;
      }
      
      // 3. Earlier wake trend (would need historical data, simplified)
      const firstNap = displayActivities
        .filter(a => a.type === 'nap' && !a.details?.isNightSleep && a.details?.startTime)
        .sort((a, b) => getComparableTime(a) - getComparableTime(b))[0];
      
      if (firstNap) {
        const startTime = firstNap.details?.startTime || firstNap.time;
        const hour = parseInt(startTime.split(':')[0]);
        if (hour < 7 || (startTime.includes('AM') && hour === 6)) {
          return `${babyName?.split(' ')[0] || 'He'}'s been waking a little earlier the past few days — often just a temporary shift.`;
        }
      }
      
      // 4. Overtired day
      const awakeMinutes = awakeTime ? parseInt(awakeTime.split('h')[0] || '0') * 60 + parseInt(awakeTime.split('m')[0] || '0') : 0;
      const expectedWindow = babyAgeMonths !== null && babyAgeMonths < 3 ? 90 : 
                            babyAgeMonths !== null && babyAgeMonths < 6 ? 120 : 
                            babyAgeMonths !== null && babyAgeMonths < 9 ? 150 : 180;
      if (awakeMinutes > expectedWindow + 30) {
        return `Sleep windows stretched a bit long — watch for early sleepy cues tonight.`;
      }
    }
    
    // Feed insights
    if (expected) {
      // 5. Growth week
      if (summary.feedCount > expected.max + 2) {
        return `Feed volume is trending higher — typical during a growth transition at this age.`;
      }
      
      // 6. On steady rhythm
      if (summary.feedCount >= expected.min && summary.feedCount <= expected.max) {
        return `Feeds are spacing beautifully today — right on rhythm for this stage.`;
      }
      
      // 7. Light intake day
      if (summary.feedCount < expected.min && summary.feedCount >= expected.min - 2) {
        return `Fewer feeds so far, but total intake still looks healthy.`;
      }
    }
    
    // Combined rhythm
    if (expected && expectedNaps) {
      // 8. Balanced day
      if (summary.feedCount >= expected.min && summary.feedCount <= expected.max &&
          summary.napCount >= expectedNaps.min && summary.napCount <= expectedNaps.max) {
        return `Today's flow looks balanced — naps and feeds finding their natural rhythm.`;
      }
      
      // 9. Active day
      if (summary.feedCount + summary.napCount > (expected.max + expectedNaps.max)) {
        return `A more active rhythm today — expect a sleepier evening ahead.`;
      }
      
      // 10. Reset in progress
      if ((summary.feedCount < expected.min - 1 || summary.napCount < expectedNaps.min - 1)) {
        return `The day's been a little off-pattern — often how babies find their next rhythm.`;
      }
    }
    
    // Developmental transitions
    if (babyAgeMonths !== null) {
      // 11. Emerging independence
      if (babyAgeMonths >= 4 && summary.napCount >= 2 && summary.feedCount >= 4) {
        return `${babyName?.split(' ')[0] || 'He'}'s showing signs of self-regulation — longer naps and steady feeds are helping ${babyName?.split(' ')[0].toLowerCase() || 'him'} adjust.`;
      }
      
      // 12. Growth transition
      if ([3, 4, 6, 9, 12].includes(babyAgeMonths)) {
        return `Patterns are shifting — short-term changes that often mean new milestones are near.`;
      }
    }
    
    // Default
    return `Today's rhythm is unfolding naturally — every day helps you understand ${babyName?.split(' ')[0] || 'baby'} better.`;
  };

  // Get detailed insight for the current sentiment
  const getToneInsight = (sentiment: { emoji: string; text: string }) => {
    const summary = getDailySummary();
    const expected = getExpectedFeeds(babyAgeMonths);
    const expectedNaps = getExpectedNaps(babyAgeMonths);

    switch (sentiment.text) {
      case "Growth Spurt Week":
        return `${babyName || 'Baby'} is showing signs of a growth spurt with ${summary.feedCount} feeds today, which is above the typical range. Growth spurts often mean increased hunger and may affect sleep patterns. This is completely normal and usually lasts a few days.`;
      
      case "Feed-Heavy Day":
        return `Today has ${summary.feedCount} feeds, slightly above average. This could indicate increased hunger, a developmental leap, or simply a hungrier day. Keep offering feeds on demand.`;
      
      case "Extra Sleepy Day":
        return `${babyName || 'Baby'} has had ${summary.napCount} naps today, more than usual. Extra sleep can indicate a growth spurt, fighting off illness, or catching up on rest. Monitor for other symptoms if concerned.`;
      
      case "Smooth Flow":
        return `Everything is flowing naturally today with ${summary.feedCount} feeds and ${summary.napCount} naps, all within expected ranges for ${babyName}'s age. This balanced rhythm suggests ${babyName?.split(' ')[0] || 'baby'} is well-regulated.`;
      
      case "In Sync":
        return `${babyName || 'Baby'} is perfectly aligned with developmental expectations today. This harmonious pattern suggests a well-established routine and good sleep-wake balance.`;
      
      case "Mixed Patterns":
        return `Today shows some variations from typical patterns. This is normal and often reflects ${babyName}'s changing needs as they grow and develop. Every day is different.`;
      
      case "Adjusting Rhythm":
        return `${babyName}'s patterns are shifting slightly from the usual range. This often happens during transitions like sleep regressions, developmental leaps, or routine changes.`;
      
      case "High-Energy Day":
        return `With ${summary.feedCount + summary.napCount + summary.diaperCount} total activities logged, this has been an active day! High-energy days are normal and show ${babyName} is engaged and thriving.`;
      
      case "Growth Transition":
        return `At ${babyAgeMonths} months, ${babyName} is in a key developmental window. Patterns may shift as new milestones emerge. These transitions are part of healthy growth.`;
      
      case "New Discovery":
        return `The day is just beginning with ${summary.feedCount + summary.napCount} activities so far. Every day brings new moments to discover ${babyName}'s evolving rhythm.`;
      
      case "Off Rhythm Day":
        return `Today's patterns are notably different from usual. This can happen due to schedule changes, environment shifts, or developmental adjustments. Tomorrow often brings back familiar rhythms.`;
      
      case "Building Rhythm":
      default:
        return `${babyName} is establishing their unique daily patterns. With ${summary.feedCount} feeds and ${summary.napCount} naps logged, you're learning their natural rhythm together.`;
    }
  };

  // Get detailed reasoning for the prediction
  const getPredictionReasoning = () => {
    if (!prediction) return "We're analyzing your baby's patterns to provide predictions.";

    const summary = getDailySummary();
    const awakeMinutes = awakeTime ? parseInt(awakeTime.split('h')[0]) * 60 + parseInt(awakeTime.split('h')[1]?.split('m')[0] || '0') : 0;
    
    if (prediction.intent === 'LET_SLEEP_CONTINUE') {
      // Baby is currently sleeping - calculate duration using proper local time handling
      let napDuration = 0;
      if (ongoingNap?.details?.startTime) {
        const startTime = ongoingNap.details.startTime;
        const [time, period] = startTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        const today = new Date();
        const napStart = new Date(today.toDateString());
        napStart.setHours(hour24, minutes, 0, 0);
        
        napDuration = differenceInMinutes(currentTime, napStart);
      }
      
      const napHours = Math.floor(napDuration / 60);
      const napMins = napDuration % 60;
      
      const isNightSleep = ongoingNap.details?.isNightSleep;
      const sleepType = isNightSleep ? 'sleeping' : 'napping';
      const sleepNoun = isNightSleep ? 'sleep' : 'nap';
      
      return `${babyName} is currently ${sleepType} and has been asleep for ${napHours > 0 ? `${napHours}h ` : ''}${napMins}m. ${babyName} has had ${summary.napCount} ${sleepNoun}${summary.napCount !== 1 ? 's' : ''} today, and babies at ${babyAgeMonths || 0} months typically need ${getExpectedNaps(babyAgeMonths)?.typical || '3-4'} naps per day. Let them rest and they'll wake when ready.`;
    } else if (prediction.intent === 'START_WIND_DOWN') {
      // Nap is coming soon
      const expectedWindow = babyAgeMonths !== null && babyAgeMonths < 3 ? 90 : 
                           babyAgeMonths !== null && babyAgeMonths < 6 ? 120 : 
                           babyAgeMonths !== null && babyAgeMonths < 9 ? 150 : 180;
      
      // Only show wake window if we have valid data
      const wakeWindowText = awakeTime ? ` and current wake window of ${awakeTime}` : '';
      
      return `Based on ${babyName}'s age (${babyAgeMonths || 0} months)${wakeWindowText}, we predict a nap is coming soon. Typical wake windows for this age are around ${Math.floor(expectedWindow / 60)}h ${expectedWindow % 60}m. ${babyName} has had ${summary.napCount} nap${summary.napCount !== 1 ? 's' : ''} today, and babies at this age typically need ${getExpectedNaps(babyAgeMonths)?.typical || '3-4'} naps per day.`;
    } else if (prediction.intent === 'FEED_SOON') {
      const lastFeedTime = lastFeed ? lastFeed.time : 'earlier';
      const avgFeedAmount = lastFeed?.details?.quantity ? `around ${lastFeed.details.quantity}${lastFeed.details.unit || 'ml'}` : 'their usual amount';
      
      return `Based on recent feeding patterns, ${babyName} typically feeds every 2-3 hours. The last feed was at ${lastFeedTime}. Today has had ${summary.feedCount} feed${summary.feedCount !== 1 ? 's' : ''}, and babies at ${babyAgeMonths || 0} months typically need ${getExpectedFeeds(babyAgeMonths)?.typical || '6-8'} feeds per day. We predict a feed of ${avgFeedAmount}.`;
    }
    
    return `This prediction is based on ${babyName}'s established patterns from ${activities.length} logged moments, considering age-appropriate wake windows and feeding intervals.`;
  };

  // Calculate percentiles using WHO growth standards
  const calculatePercentile = (value: number, ageInMonths: number, measurementType: 'weight' | 'length' | 'headCirc'): number => {
    // WHO Growth Standards - selected percentile values (3rd, 15th, 50th, 85th, 97th)
    // Assuming male for now (could be enhanced with baby sex)
    const lengthTable: { [month: number]: number[] } = {
      0: [46.1, 48.0, 49.9, 51.8, 53.7], 1: [50.8, 52.8, 54.7, 56.7, 58.6],
      2: [54.4, 56.4, 58.4, 60.4, 62.4], 3: [57.3, 59.4, 61.4, 63.5, 65.5],
      4: [59.7, 61.8, 63.9, 66.0, 68.0], 5: [61.7, 63.8, 65.9, 68.0, 70.1],
      6: [63.3, 65.5, 67.6, 69.8, 71.9], 9: [67.7, 70.1, 72.0, 74.2, 76.5],
      12: [71.0, 73.4, 75.7, 78.1, 80.5], 18: [76.0, 78.7, 81.3, 83.9, 86.5],
      24: [79.9, 82.8, 85.6, 88.4, 91.2]
    };
    const weightTable: { [month: number]: number[] } = {
      0: [2.5, 2.9, 3.3, 3.9, 4.4], 1: [3.4, 3.9, 4.5, 5.1, 5.8],
      2: [4.3, 4.9, 5.6, 6.3, 7.1], 3: [5.0, 5.7, 6.4, 7.2, 8.0],
      4: [5.6, 6.2, 7.0, 7.8, 8.7], 5: [6.0, 6.7, 7.5, 8.4, 9.3],
      6: [6.4, 7.1, 7.9, 8.8, 9.8], 9: [7.1, 8.0, 8.9, 9.9, 10.9],
      12: [7.7, 8.6, 9.6, 10.8, 11.9], 18: [8.8, 9.8, 10.9, 12.2, 13.5],
      24: [9.7, 10.8, 12.2, 13.6, 15.3]
    };
    const headCircTable: { [month: number]: number[] } = {
      0: [32.1, 33.2, 34.5, 35.7, 36.9], 1: [35.1, 36.3, 37.6, 38.9, 40.1],
      2: [36.9, 38.1, 39.5, 40.8, 42.2], 3: [38.1, 39.4, 40.8, 42.2, 43.6],
      4: [39.0, 40.4, 41.8, 43.3, 44.7], 5: [39.7, 41.1, 42.6, 44.1, 45.6],
      6: [40.3, 41.7, 43.3, 44.8, 46.4], 9: [41.6, 43.1, 44.7, 46.3, 47.9],
      12: [42.6, 44.1, 45.8, 47.5, 49.2], 18: [44.1, 45.8, 47.5, 49.2, 50.9],
      24: [45.2, 46.9, 48.7, 50.5, 52.3]
    };

    const table = measurementType === 'weight' ? weightTable : measurementType === 'length' ? lengthTable : headCircTable;
    const availableMonths = Object.keys(table).map(Number).sort((a, b) => a - b);
    let closestMonth = availableMonths.reduce((prev, curr) => 
      Math.abs(curr - ageInMonths) < Math.abs(prev - ageInMonths) ? curr : prev
    );

    const percentileValues = table[closestMonth];
    if (!percentileValues) return 50;

    if (value <= percentileValues[0]) return 3;
    if (value <= percentileValues[1]) return Math.round(3 + ((value - percentileValues[0]) / (percentileValues[1] - percentileValues[0])) * 12);
    if (value <= percentileValues[2]) return Math.round(15 + ((value - percentileValues[1]) / (percentileValues[2] - percentileValues[1])) * 35);
    if (value <= percentileValues[3]) return Math.round(50 + ((value - percentileValues[2]) / (percentileValues[3] - percentileValues[2])) * 35);
    if (value <= percentileValues[4]) return Math.round(85 + ((value - percentileValues[3]) / (percentileValues[4] - percentileValues[3])) * 12);
    return 97;
  };

  // Get latest measurement from all activities - using activity time
  const getLatestMeasurement = () => {
    const measurements = activities
      .filter(a => a.type === 'measure')
      .sort((a, b) => getComparableTime(b) - getComparableTime(a));
    
    if (measurements.length === 0) return null;
    
    const latest = measurements[0];
    const details = latest.details || {};
    const weightLbs = parseFloat(details.weightLbs || '0');
    const weightOz = parseFloat(details.weightOz || '0');
    const weightKg = (weightLbs * 0.453592) + (weightOz * 0.0283495);
    const heightInches = parseFloat(details.heightInches || '0');
    const heightCm = heightInches * 2.54;
    const headCirc = parseFloat(details.headCircumference || '0');
    
    const result: any = { date: latest.loggedAt };
    
    if (weightKg > 0 && babyAgeMonths !== null) {
      result.weight = {
        display: `${weightLbs}lb ${weightOz}oz`,
        percentile: calculatePercentile(weightKg, babyAgeMonths, 'weight')
      };
    }
    if (heightCm > 0 && babyAgeMonths !== null) {
      result.length = {
        display: `${heightInches}"`,
        percentile: calculatePercentile(heightCm, babyAgeMonths, 'length')
      };
    }
    if (headCirc > 0 && babyAgeMonths !== null) {
      result.headCirc = {
        display: `${headCirc}"`,
        percentile: calculatePercentile(headCirc, babyAgeMonths, 'headCirc')
      };
    }
    
    // Generate contextual summary
    if (result.weight || result.length) {
      const avgPercentile = [
        result.weight?.percentile,
        result.length?.percentile
      ].filter(p => p !== undefined).reduce((a, b) => a! + b!, 0)! / 
        [result.weight?.percentile, result.length?.percentile].filter(p => p !== undefined).length;
      
      let summary = '';
      if (avgPercentile >= 85) {
        summary = 'Growing strong — tracking above average';
      } else if (avgPercentile >= 50) {
        summary = 'Gaining steadily — right on track for his age';
      } else if (avgPercentile >= 25) {
        summary = 'Growing at his own pace — steady and healthy';
      } else {
        summary = 'Following his own growth curve — consistent progress';
      }
      
      result.summary = summary;
    }
    
    return Object.keys(result).length > 1 ? result : null;
  };

  // Activity summary data
  const getDailySummary = () => {
    const feedCount = displayActivities.filter(a => a.type === 'feed').length;
    const napCount = displayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
    const diaperCount = displayActivities.filter(a => a.type === 'diaper').length;
    const measureCount = displayActivities.filter(a => a.type === 'measure').length;

    return { feedCount, napCount, diaperCount, measureCount };
  };

  // Get age-appropriate expectations
  const getExpectedFeeds = (months: number | null) => {
    if (months === null) return null;
    if (months < 1) return { min: 8, max: 12, typical: "8-12" };
    if (months < 3) return { min: 6, max: 8, typical: "6-8" };
    if (months < 6) return { min: 5, max: 7, typical: "5-7" };
    if (months < 9) return { min: 4, max: 6, typical: "4-6" };
    if (months < 12) return { min: 3, max: 5, typical: "3-5" };
    return { min: 3, max: 4, typical: "3-4" };
  };

  const getExpectedNaps = (months: number | null) => {
    if (months === null) return null;
    if (months < 3) return { min: 4, max: 6, typical: "4-6" };
    if (months < 6) return { min: 3, max: 4, typical: "3-4" };
    if (months < 9) return { min: 2, max: 3, typical: "2-3" };
    if (months < 12) return { min: 2, max: 3, typical: "2-3" };
    if (months < 18) return { min: 1, max: 2, typical: "1-2" };
    return { min: 1, max: 2, typical: "1-2" };
  };

  const getFeedComparison = (count: number, months: number | null) => {
    const expected = getExpectedFeeds(months);
    if (!expected) return t('feedsConsistent');
    
    if (count >= expected.min && count <= expected.max) {
      return t('rightOnRhythm').replace('{months}', String(months));
    } else if (count < expected.min && count === 0) {
      return t('gettingStartedToday');
    } else if (count < expected.min) {
      return t('lightFeedingDay').replace('{months}', String(months));
    } else {
      return t('extraFeedsToday');
    }
  };

  const getNapComparison = (count: number, months: number | null) => {
    const expected = getExpectedNaps(months);
    if (!expected) return t('everyNapProgress');
    
    if (count >= expected.min && count <= expected.max) {
      return t('solidNapRhythm').replace('{baby}', babyName?.split(' ')[0] || t('baby'));
    } else if (count < expected.min && count === 0) {
      return t('earlyInDay');
    } else if (count < expected.min) {
      return t('moreRestComing');
    } else {
      return t('extraRestToday');
    }
  };

  // Get status indicator for feeds (time-aware)
  const getFeedStatusIndicator = (count: number, months: number | null) => {
    const expected = getExpectedFeeds(months);
    if (!expected) return 'on-track';
    
    const hour = currentTime.getHours();
    
    // Calculate progress based on WAKING hours only (not full 24 hours)
    // Assume typical waking hours: 7am-7pm = 12 hours
    const wakeHour = 7;
    const sleepHour = 19;
    const totalWakingHours = sleepHour - wakeHour; // 12 hours
    
    // If before wake time or after sleep time, use total day
    if (hour < wakeHour) {
      return 'on-track'; // Too early to judge
    }
    
    // Calculate how many waking hours have passed
    const wakingHoursPassed = Math.max(0, hour - wakeHour);
    const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
    
    // Use midpoint of expected range for calculation
    const typicalFeeds = Math.round((expected.min + expected.max) / 2);
    const expectedByNow = Math.round(typicalFeeds * dayProgress);
    
    // Early in the day (before 10am), be lenient
    if (hour < 10) {
      return count >= 1 ? 'on-track' : 'on-track'; // Having any feed in morning is fine
    }
    
    // Mid to late day: compare to proportional expectations
    if (count >= expectedByNow) {
      return 'on-track';
    } else if (count < expectedByNow && count >= expectedByNow - 1) {
      return 'on-track'; // Within 1 of expected is still ok
    } else {
      return 'attention'; // More than 1 behind
    }
  };

  // Get status indicator for sleep (time-aware)
  const getSleepStatusIndicator = (count: number, months: number | null) => {
    const expected = getExpectedNaps(months);
    if (!expected) return 'on-track';
    
    const hour = currentTime.getHours();
    
    // Calculate progress based on waking hours
    const wakeHour = 7;
    const sleepHour = 19;
    const totalWakingHours = sleepHour - wakeHour;
    
    if (hour < wakeHour) {
      return 'on-track';
    }
    
    const wakingHoursPassed = Math.max(0, hour - wakeHour);
    const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
    const typicalNaps = Math.round((expected.min + expected.max) / 2);
    const expectedByNow = Math.round(typicalNaps * dayProgress);
    
    // Early in the day (before 10am), be lenient
    if (hour < 10) {
      return 'on-track'; // No pressure for naps early
    }
    
    // Mid to late day: compare to proportional expectations
    if (count >= expectedByNow) {
      return 'on-track';
    } else if (count < expectedByNow && count >= expectedByNow - 1) {
      return 'on-track'; // Within 1 of expected is still ok
    } else {
      return 'attention'; // More than 1 behind
    }
  };

  // Get detailed explanation for feed status
  const getFeedStatusExplanation = (count: number, months: number | null) => {
    const expected = getExpectedFeeds(months);
    if (!expected) return "We're learning your baby's feeding patterns.";
    
    const hour = currentTime.getHours();
    
    // Calculate progress based on waking hours
    const wakeHour = 7;
    const sleepHour = 19;
    const totalWakingHours = sleepHour - wakeHour;
    const wakingHoursPassed = Math.max(0, hour - wakeHour);
    const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
    
    const typicalFeeds = Math.round((expected.min + expected.max) / 2);
    const expectedByNow = Math.round(typicalFeeds * dayProgress);
    const status = getFeedStatusIndicator(count, months);
    
    if (status === 'on-track') {
      if (hour < 10) {
        return `${count} feed${count !== 1 ? 's' : ''} so far this morning is on track. Babies typically need ${expected.typical} feeds throughout the entire day.`;
      }
      return `${count} feed${count !== 1 ? 's' : ''} is great progress. Based on the time of day, we'd expect around ${expectedByNow} feeds by now, and you're right on track for ${expected.typical} total feeds today.`;
    } else {
      return `${count} feed${count !== 1 ? 's' : ''} by this time might be slightly behind. Based on typical patterns for ${months}-month-olds (${expected.typical} per day), we'd expect around ${expectedByNow} by now. Consider offering a feed if baby shows hunger cues.`;
    }
  };

  // Get detailed explanation for sleep status
  const getSleepStatusExplanation = (count: number, months: number | null) => {
    const expected = getExpectedNaps(months);
    if (!expected) return "We're learning your baby's sleep patterns.";
    
    const hour = currentTime.getHours();
    
    // Calculate progress based on waking hours
    const wakeHour = 7;
    const sleepHour = 19;
    const totalWakingHours = sleepHour - wakeHour;
    const wakingHoursPassed = Math.max(0, hour - wakeHour);
    const dayProgress = Math.min(1, wakingHoursPassed / totalWakingHours);
    
    const typicalNaps = Math.round((expected.min + expected.max) / 2);
    const expectedByNow = Math.round(typicalNaps * dayProgress);
    const status = getSleepStatusIndicator(count, months);
    
    if (status === 'on-track') {
      if (hour < 10) {
        return `${count} nap${count !== 1 ? 's' : ''} so far is perfectly fine for the morning. Babies typically need ${expected.typical} naps throughout the entire day.`;
      }
      return `${count} nap${count !== 1 ? 's' : ''} is great progress. Based on the time of day, we'd expect around ${expectedByNow} naps by now, and you're right on track for ${expected.typical} total naps today.`;
    } else {
      return `${count} nap${count !== 1 ? 's' : ''} by this time might be slightly behind. Based on typical patterns for ${months}-month-olds (${expected.typical} per day), we'd expect around ${expectedByNow} by now. Watch for sleepy cues.`;
    }
  };

  // Get status indicator for growth
  const getGrowthStatusIndicator = (measurement: any) => {
    return '🌱'; // Growth sprout emoji
  };
  
  
  // Legacy helper for backward compatibility
  const getNextPredictedAction_LEGACY = () => {
    const expectedNaps = getExpectedNaps(babyAgeMonths);
    
    if (ongoingNap) {
      // Baby is sleeping - predict wake time and next feed
      const startTime = ongoingNap.details?.startTime || ongoingNap.time;
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const today = new Date();
      const napStart = new Date(today.toDateString());
      napStart.setHours(hour24, minutes, 0, 0);
      
      // Calculate average nap duration based on age
      let expectedNapDuration = 90; // default 90 minutes
      if (babyAgeMonths !== null) {
        if (babyAgeMonths < 3) expectedNapDuration = 120; // 2 hours for newborns
        else if (babyAgeMonths < 6) expectedNapDuration = 90; // 1.5 hours
        else if (babyAgeMonths < 12) expectedNapDuration = 75; // 1h 15m
        else expectedNapDuration = 60; // 1 hour for older babies
      }
      
      const currentDuration = differenceInMinutes(currentTime, napStart);
      const expectedWakeTime = new Date(napStart.getTime() + expectedNapDuration * 60000);
      const expectedFeedTime = new Date(expectedWakeTime.getTime() + 10 * 60000); // 10 min after wake
      
      const wakeTimeStr = expectedWakeTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const feedTimeStr = expectedFeedTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Get last feed to estimate amount
      const recentFeeds = todayActivities
        .filter(a => a.type === 'feed' && a.details?.quantity)
        .sort((a, b) => getComparableTime(b) - getComparableTime(a));
      const avgAmount = recentFeeds.length > 0 
        ? Math.round(recentFeeds.slice(0, 3).reduce((sum, f) => sum + (parseFloat(f.details.quantity!) || 0), 0) / Math.min(3, recentFeeds.length))
        : 180;
      
      // If nap is longer than expected, adjust message
      if (currentDuration > expectedNapDuration + 20) {
        return `${babyName?.split(' ')[0] || 'Baby'} has been asleep ${Math.floor(currentDuration / 60)}h ${currentDuration % 60}m — might be ready to wake soon.`;
      }
      
      return `May wake around ${wakeTimeStr} — consider offering feed around ${feedTimeStr} (typically ${avgAmount} ml).`;
    } else {
      // Baby is awake - predict next nap
      const awakeMinutes = awakeTime ? parseInt(awakeTime) : 0;
      let expectedAwakeWindow = 120; // default 2 hours
      
      if (babyAgeMonths !== null) {
        if (babyAgeMonths < 3) expectedAwakeWindow = 90; // 1.5 hours
        else if (babyAgeMonths < 6) expectedAwakeWindow = 120; // 2 hours
        else if (babyAgeMonths < 9) expectedAwakeWindow = 150; // 2.5 hours
        else expectedAwakeWindow = 180; // 3 hours
      }
      
      const lastNap = todayActivities
        .filter(a => a.type === 'nap' && a.details?.endTime)
        .sort((a, b) => getComparableTime(b) - getComparableTime(a))[0];
      
      if (lastNap && lastNap.details?.endTime) {
        const [time, period] = lastNap.details.endTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        // Parse start time to check for day rollover
        const startTime = lastNap.details.startTime || lastNap.time;
        const [startTimePart, startPeriod] = startTime.split(' ');
        const [startHours, startMinutes] = startTimePart.split(':').map(Number);
        let startHour24 = startHours;
        if (startPeriod === 'PM' && startHours !== 12) startHour24 += 12;
        if (startPeriod === 'AM' && startHours === 12) startHour24 = 0;
        
        const today = new Date();
        const wakeTime = new Date(today.toDateString());
        wakeTime.setHours(hour24, minutes, 0, 0);
        
        // If end time is before start time, it crossed midnight
        const endMinutes = hour24 * 60 + minutes;
        const startMinutesOfDay = startHour24 * 60 + startMinutes;
        if (endMinutes < startMinutesOfDay) {
          wakeTime.setDate(wakeTime.getDate() + 1);
        }
        
        const expectedNapTime = new Date(wakeTime.getTime() + expectedAwakeWindow * 60000);
        const napTimeStr = expectedNapTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        
        const minutesUntilNap = differenceInMinutes(expectedNapTime, currentTime);
        
        if (minutesUntilNap < 15 && minutesUntilNap > 0) {
          return `Next nap expected around ${napTimeStr} — watch for sleepy cues soon.`;
        } else if (awakeMinutes > expectedAwakeWindow + 30) {
          return `Awake for ${awakeTime} — consider starting wind-down routine.`;
        } else {
          return `Next nap expected around ${napTimeStr} — watch for sleepy cues.`;
        }
      }
      
      return `Watch for sleepy cues — typical wake window is ${Math.floor(expectedAwakeWindow / 60)}h ${expectedAwakeWindow % 60}m.`;
    }
  };

  // Use unified prediction engine
  const nextAction = prediction ? getIntentCopy(prediction, babyName) : null;
  if (typeof window !== 'undefined') {
    const feedSamples = activities
      .filter(a => a.type === 'feed')
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        time: a.time,
        loggedAt: a.loggedAt
      }));

    console.info('HomeTab - Prediction snapshot', {
      hasPrediction: !!prediction,
      intent: prediction?.intent,
      confidence: prediction?.confidence,
      rationale: prediction?.rationale,
      timing: prediction?.timing ? {
        nextFeedAt: prediction?.timing?.nextFeedAt,
        nextNapWindowStart: prediction?.timing?.nextNapWindowStart,
        nextWakeAt: prediction?.timing?.nextWakeAt,
        expectedFeedVolume: prediction?.timing?.expectedFeedVolume
      } : null,
      reasons: prediction?.reasons,
      dayProgress: prediction?.dayProgress,
      feedSamples
    });
  }

  const summary = getDailySummary();
  const latestMeasurement = getLatestMeasurement();
  if (typeof window !== 'undefined') {
    console.info('HomeTab - measurement count', { showingYesterday, measureCount: summary.measureCount, latestMeasurement });
  }
  const awakeTime = getAwakeTime();
  const sleepStatus = getSleepStatus();
  const sentiment = getDailySentiment();
  const developmentalPhase = getDevelopmentalPhase();

  // Empty state for new users with no activities
  if (activities.length === 0) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6 animate-fade-in">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Welcome Message */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              Hi {userName || 'there'} 👋
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Let's discover {babyName ? `${babyName}'s` : 'your baby\'s'} unique rhythm together.
            </p>
          </div>

          {/* Tone Chip removed in favor of inline messaging */}

          {/* Empty State Card with Ghost Predictions */}
          <Card className="p-6 bg-card/50 border border-border/40">
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-foreground">
                As you log, I'll start building {babyName ? `${babyName}'s` : 'your baby\'s'} rhythm
              </h3>
              
              
              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preview of what's coming:
                </p>
                
                {/* Ghost Cards */}
                <div className="space-y-2.5 opacity-40 pointer-events-none">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Next nap likely around 2:45 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                    <Baby className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Feed around 3 oz expected</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border/20">
                <Button
                  onClick={() => onAddActivity()}
                  variant="default"
                  className="w-full"
                  size="lg"
                >
                  Log your first activity
                </Button>
              </div>
              
              {/* Secondary CTA */}
              <div className="text-center">
                <button
                  onClick={() => {
                    const helperTab = document.querySelector('[data-tab="guide"]') as HTMLElement;
                    helperTab?.click();
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ask me anything →
                </button>
              </div>
            </div>
          </Card>

          {/* Educational Content for New Users */}
          {showEducationalContent && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              {/* Trends Tab Info */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      After a few days of tracking, you'll see {babyName ? `${babyName}'s` : 'your baby\'s'} sleep, feeding, and mood patterns emerge on the Trends section.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const trendsTab = document.querySelector('[data-tab="trends"]') as HTMLElement;
                    trendsTab?.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View Trends
                </Button>
              </div>

              {/* Rhythm Tab Info */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <ActivityIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Rhythm shows your baby's daily patterns and helps you understand their unique schedule.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const guideTab = document.querySelector('[data-tab="guide"]') as HTMLElement;
                    guideTab?.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View Rhythm
                </Button>
              </div>

              {/* Log Tab Info */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Export and share your data with partners or pediatricians anytime from your Log.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const logTab = document.querySelector('[data-tab="log"]') as HTMLElement;
                    logTab?.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View Log
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="pt-3 space-y-3">

        {/* Daily Story Circles - right under Home header */}
        <DailyStoryCircles
          activities={activities}
          babyName={babyName}
          onSelectDay={(date, dayActivities) => {
            setSelectedStoryDate(date);
            setSelectedStoryActivities(dayActivities);
            setShowTodaysStory(true);
          }}
        />

        {/* Greeting */}
        <h2 className="text-lg font-semibold text-foreground px-4">
          {getGreetingLine()}
        </h2>

        {/* Today's Story Modal */}
        <TodaysStoryModal
          isOpen={showTodaysStory}
          onClose={() => {
            setShowTodaysStory(false);
            setSelectedStoryDate(null);
            setSelectedStoryActivities([]);
          }}
          activities={selectedStoryDate ? selectedStoryActivities : activities}
          babyName={babyName}
          targetDate={selectedStoryDate || undefined}
        />

        {/* Learning Progress Chip */}
        {!isRhythmUnlocked && activities.length > 0 && (
          <div className="px-4">
            <LearningProgress 
              activities={activities}
              babyName={babyName}
              onRhythmUnlocked={() => setShowRhythmUnlocked(true)}
            />
          </div>
        )}

        {/* Rhythm Unlocked Modal */}
        <RhythmUnlockedModal 
          isOpen={showRhythmUnlocked}
          onClose={() => setShowRhythmUnlocked(false)}
          babyName={babyName}
          totalLogs={activities.length}
        />

        {/* Zone 1: Right Now Status */}
        <RightNowStatus
          currentActivity={currentActivity}
          nextPrediction={nextPrediction}
          onWokeEarly={onEndNap}
          onStillAsleep={() => {
            const sleepType = ongoingNap?.details?.isNightSleep ? 'sleeping' : 'napping';
            toast({
              title: `Still ${sleepType}`,
              description: `${ongoingNap?.details?.isNightSleep ? 'Sleep' : 'Nap'} timer continues`,
            });
          }}
          onStartNap={() => {
            // Start a new nap with current time
            const now = new Date();
            addActivity?.('nap', {
              startTime: now.toTimeString().slice(0, 5),
              isNightSleep: false,
            }, now, now.toTimeString().slice(0, 5));
            toast({
              title: "Nap started",
              description: "Timer is now running",
            });
          }}
          onEndFeed={() => {
            // End the current feed
            const lastFeed = activities
              .filter(a => a.type === 'feed')
              .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
            
            if (lastFeed) {
              const now = new Date();
              const updatedFeed = {
                ...lastFeed,
                details: {
                  ...lastFeed.details,
                  endTime: now.toTimeString().slice(0, 5),
                }
              };
              onEditActivity(updatedFeed);
              toast({
                title: "Feed ended",
                description: "Duration recorded",
              });
            }
          }}
          babyName={babyName || 'Baby'}
          babyAge={babyAge ? babyAge.months * 4 + Math.floor(babyAge.weeks) : undefined}
          activities={activities}
          suggestions={smartSuggestions}
        />

        {/* Zone 2: Smart Quick Actions */}
          <SmartQuickActions
            suggestions={smartSuggestions}
            onOpenAddActivity={(type, prefillActivity) => onAddActivity(type, prefillActivity)}
            activities={activities}
            chatComponent={
              <ParentingChat
                activities={activities.map(a => ({
                  id: a.id,
                  type: a.type,
                  logged_at: a.loggedAt || "",
                  details: a.details
                }))}
                babyName={babyName}
                babyAgeInWeeks={babyAgeInWeeks}
                babySex={household?.baby_sex || undefined}
                userName={userName}
                predictionIntent={prediction?.intent}
                predictionConfidence={prediction?.confidence}
              />
            }
          />

        {/* Zone 3: Today's Pulse (at the bottom) */}
        {todaysPulse && todaysPulse.deviations && todaysPulse.deviations.length > 0 && (
          <TodaysPulse
            deviations={todaysPulse.deviations}
            biggestDeviation={todaysPulse.biggestDeviation}
            onAdjustSchedule={() => {
              // Navigate to Rhythm tab
              const rhythmTab = document.querySelector('[data-tab="guide"]') as HTMLElement;
              rhythmTab?.click();
            }}
            babyName={babyName || 'Baby'}
            babyAge={babyAgeInWeeks}
            activities={activities}
          />
        )}

        {/* Zone 4: Collective Pulse */}
        <CollectivePulse babyBirthday={effectiveBabyBirthday} />

      </div>
    </div>
  );
};
