import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby, Droplet, Moon, Clock, ChevronDown, ChevronUp, Milk, Eye, TrendingUp, Ruler, Plus, Palette, Circle, AlertCircle, Sprout, Activity as ActivityIcon, FileText, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, isToday, differenceInMinutes, differenceInHours } from "date-fns";
import { usePredictionEngine } from "@/hooks/usePredictionEngine";
import { Activity } from "@/components/ActivityCard";
import { useToast } from "@/hooks/use-toast";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { detectNightSleep, getWakeTime } from "@/utils/nightSleepDetection";
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFeedDetails, setShowFeedDetails] = useState(false);
  const [showSleepDetails, setShowSleepDetails] = useState(false);
  const [showGrowthDetails, setShowGrowthDetails] = useState(false);
  const [showToneInsight, setShowToneInsight] = useState(false);
  const [showPredictionInsight, setShowPredictionInsight] = useState(false);
  const [showFeedStatusInsight, setShowFeedStatusInsight] = useState(false);
  const [showSleepStatusInsight, setShowSleepStatusInsight] = useState(false);
  const [showDailyInsight, setShowDailyInsight] = useState(false);
  const { prediction, getIntentCopy, getProgressText } = usePredictionEngine(activities);

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
  const hasSleep = activities.some(a => a.type === 'nap');
  const hasMinimumLogs = (hasFeed && hasSleep) || activities.length >= 5;
  const showEducationalContent = !hasMinimumLogs;

  // Calculate baby's age in months and weeks
  const getBabyAge = () => {
    if (!babyBirthday) return null;
    const birthDate = new Date(babyBirthday);
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

  // Get today's activities only
  const todayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const parsed = parseUTCToLocal(a.loggedAt);
    const result = isToday(parsed);
    return result;
  });

  // Get yesterday's activities for context when today is empty
  const yesterdayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = parseUTCToLocal(a.loggedAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return activityDate.toDateString() === yesterday.toDateString();
  });

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

  // Compute a comparable timestamp for sorting: use nap startTime when provided; otherwise use loggedAt's time
  const getComparableTime = (a: Activity): number => {
    const base = parseUTCToLocal(a.loggedAt!);
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

    // Consider naps from today and yesterday only
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const parseTimeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hStr, mStr] = time.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || '0', 10);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    // Find the most recent completed nap (yesterday or today)
  const recentNaps = activities.filter(a =>
    a.loggedAt && parseUTCToLocal(a.loggedAt) >= yesterdayStart &&
    a.type === 'nap' && a.details?.endTime
  );

    if (recentNaps.length === 0) return null;

  const napsWithEndDate = recentNaps.map(nap => {
    const baseDate = parseUTCToLocal(nap.loggedAt!);
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

const lastFeed = displayActivities
  .filter(a => a.type === 'feed')
  .sort((a, b) => parseUTCToLocal(b.loggedAt!).getTime() - parseUTCToLocal(a.loggedAt!).getTime())[0];

// Get last diaper
const lastDiaper = displayActivities
  .filter(a => a.type === 'diaper')
  .sort((a, b) => parseUTCToLocal(b.loggedAt!).getTime() - parseUTCToLocal(a.loggedAt!).getTime())[0];

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
      
  const napStart = parseUTCToLocal(ongoingNap.loggedAt!);
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
      
      return {
        main: `${babyName || t('baby')} ${t('hasBeenSleepingSince')} ${startTime}`,
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

  // Get daily sentiment based on patterns - refined 12-chip set
  const getDailySentiment = () => {
    // Check if user is in first 24 hours from first activity
    if (activities.length > 0) {
      const firstActivity = [...activities].sort((a, b) => 
        new Date(a.loggedAt!).getTime() - new Date(b.loggedAt!).getTime()
      )[0];
      
      if (firstActivity?.loggedAt) {
        const firstActivityTime = new Date(firstActivity.loggedAt);
        const hoursSinceFirst = differenceInHours(currentTime, firstActivityTime);
        
        // Show "Early Days" for first 24 hours
        if (hoursSinceFirst < 24) {
          return { emoji: "🌤", text: "Early Days" };
        }
        
        // Days 2-4: Use simplified chip set while establishing baseline
        if (hoursSinceFirst >= 24 && hoursSinceFirst < 96) {
          const summary = getDailySummary();
          const hour = currentTime.getHours();
          
          // Show "New Discovery" early in day with some activity
          if (hour < 12 && (summary.feedCount >= 1 || summary.napCount >= 1) && 
              (summary.feedCount + summary.napCount <= 3)) {
            return { emoji: "🌈", text: "New Discovery" };
          }
          
          // Default to "Building Rhythm" for days 2-4
          return { emoji: "🌿", text: "Building Rhythm" };
        }
      }
    }
    
    const summary = getDailySummary();
    const expected = getExpectedFeeds(babyAgeMonths);
    const expectedNaps = getExpectedNaps(babyAgeMonths);
    const hour = currentTime.getHours();
    
    // 1. 🌱 Growth Spurt Week - significantly more feeds than typical
    if (expected && summary.feedCount > expected.max + 2) {
      return { emoji: "🌱", text: "Growth Spurt Week" };
    }
    
    // 2. 🍼 Feed-Heavy Day - above average feeds
    if (expected && summary.feedCount > expected.max && summary.feedCount <= expected.max + 2) {
      return { emoji: "🍼", text: "Feed-Heavy Day" };
    }
    
    // 3. 🌙 Extra Sleepy Day - more/longer naps than expected
    if (expectedNaps && summary.napCount >= expectedNaps.max + 1) {
      return { emoji: "🌙", text: "Extra Sleepy Day" };
    }
    
    // 4. ☀️ Smooth Flow - feeds and naps both in expected range
    if (expected && expectedNaps && 
        summary.feedCount >= expected.min && summary.feedCount <= expected.max &&
        summary.napCount >= expectedNaps.min && summary.napCount <= expectedNaps.max) {
      return { emoji: "☀️", text: "Smooth Flow" };
    }
    
    // 5. 🎯 In Sync - perfect alignment with expectations
    if (expected && expectedNaps && 
        (summary.feedCount === expected.max || summary.feedCount === Math.round((expected.min + expected.max) / 2)) && 
        (summary.napCount === expectedNaps.max || summary.napCount === Math.round((expectedNaps.min + expectedNaps.max) / 2))) {
      return { emoji: "🎯", text: "In Sync" };
    }
    
    // 6. 🌤️ Mixed Patterns - some metrics in range, others not
    if (expected && expectedNaps &&
        ((summary.feedCount >= expected.min && summary.feedCount <= expected.max && summary.napCount < expectedNaps.min) ||
         (summary.napCount >= expectedNaps.min && summary.napCount <= expectedNaps.max && summary.feedCount < expected.min))) {
      return { emoji: "🌤️", text: "Mixed Patterns" };
    }
    
    // 7. 🔄 Adjusting Rhythm - slightly off from expected range
    if (expected && expectedNaps &&
        (summary.feedCount === expected.min - 1 || summary.napCount === expectedNaps.min - 1)) {
      return { emoji: "🔄", text: "Adjusting Rhythm" };
    }
    
    // 8. ⚡ High-Energy Day - lots of overall activity
    if (summary.feedCount + summary.napCount + summary.diaperCount >= 12) {
      return { emoji: "⚡", text: "High-Energy Day" };
    }
    
    // 9. 💫 Growth Transition - milestone age periods with pattern changes
    if (babyAgeMonths !== null && [3, 4, 6, 9, 12].includes(babyAgeMonths) && 
        (summary.feedCount !== expected?.max || summary.napCount !== expectedNaps?.max)) {
      return { emoji: "💫", text: "Growth Transition" };
    }
    
    // 10. 🌈 New Discovery - early in day with some activity
    if (hour < 12 && (summary.feedCount >= 1 || summary.napCount >= 1) && 
        (summary.feedCount + summary.napCount <= 3)) {
      return { emoji: "🌈", text: "New Discovery" };
    }
    
    // 11. 🌧 Off Rhythm Day - significantly below expected
    if (expected && expectedNaps &&
        (summary.feedCount < expected.min - 1 || summary.napCount < expectedNaps.min - 1)) {
      return { emoji: "🌧", text: "Off Rhythm Day" };
    }
    
    // 12. 🌿 Building Rhythm - default/early patterns
    return { emoji: "🌿", text: "Building Rhythm" };
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
        new Date(a.loggedAt!).getTime() - new Date(b.loggedAt!).getTime()
      )[0];
      
      if (firstActivity?.loggedAt) {
        const firstActivityTime = new Date(firstActivity.loggedAt);
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
    const totalNaps = activities.filter(a => a.type === 'nap').length;
    
    // Early state message - insufficient cumulative data (but past first 24 hours)
    if (totalFeeds < 4 || totalNaps < 4) {
      return `Keep logging feeds and sleeps—patterns will emerge soon! Every entry helps us understand ${babyName?.split(' ')[0] || 'your baby'}'s unique rhythm.`;
    }
    
    // Calculate 7-day rolling averages (simplified for now)
    const recentFeeds = activities.filter(a => a.type === 'feed').length / 7;
    const recentNaps = activities.filter(a => a.type === 'nap' && a.details?.endTime).length / 7;
    
    // Sleep insights
    if (summary.napCount > 0 && expectedNaps) {
      const napDurations = displayActivities
        .filter(a => a.type === 'nap' && a.details?.endTime)
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
        .filter(a => a.type === 'nap' && a.details?.startTime)
        .sort((a, b) => new Date(a.loggedAt!).getTime() - new Date(b.loggedAt!).getTime())[0];
      
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
        
        const napStart = parseUTCToLocal(ongoingNap.loggedAt!);
        napStart.setHours(hour24, minutes, 0, 0);
        
        napDuration = differenceInMinutes(currentTime, napStart);
      }
      
      const napHours = Math.floor(napDuration / 60);
      const napMins = napDuration % 60;
      
      return `${babyName} is currently napping and has been asleep for ${napHours > 0 ? `${napHours}h ` : ''}${napMins}m. ${babyName} has had ${summary.napCount} nap${summary.napCount !== 1 ? 's' : ''} today, and babies at ${babyAgeMonths || 0} months typically need ${getExpectedNaps(babyAgeMonths)?.typical || '3-4'} naps per day. Let them rest and they'll wake when ready.`;
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

  // Get latest measurement from all activities
  const getLatestMeasurement = () => {
    const measurements = activities
      .filter(a => a.type === 'measure' && a.loggedAt)
      .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime());
    
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
    // Calculate expected feeds by this time of day (proportional to time elapsed)
    const dayProgress = hour / 24;
    const expectedByNow = Math.floor(expected.min * dayProgress);
    
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
    const dayProgress = hour / 24;
    const expectedByNow = Math.floor(expected.min * dayProgress);
    
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
    const dayProgress = hour / 24;
    const expectedByNow = Math.floor(expected.min * dayProgress);
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
    const dayProgress = hour / 24;
    const expectedByNow = Math.floor(expected.min * dayProgress);
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
      
      const napStart = new Date(ongoingNap.loggedAt!);
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
        .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime());
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
        .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
      
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
        
        const wakeTime = new Date(lastNap.loggedAt!);
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
        loggedAt: a.loggedAt,
        parsed: a.loggedAt ? new Date(a.loggedAt).toISOString() : null,
        minutesAgo: a.loggedAt ? Math.round((Date.now() - new Date(a.loggedAt).getTime())/60000) : null,
        timeStr: a.time
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
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Welcome Message */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              Hi {userName || 'there'} 👋
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Let's discover {babyName ? `${babyName}'s` : 'your baby\'s'} unique rhythm together.
            </p>
          </div>

          {/* Tone Chip */}
          <div className="space-y-3">
            <button 
              onClick={() => setShowToneInsight(!showToneInsight)}
              className="w-full text-left"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
                <span className="text-sm">☀️</span>
                <span className="text-sm font-medium text-accent-foreground">Early Days</span>
              </div>
            </button>
            
            {showToneInsight && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-1 italic">
                We'll learn {babyName ? `${babyName}'s` : 'your baby\'s'} patterns together as you track feeds, sleep, and more.
              </p>
            )}
          </div>

          {/* Start Journey Card */}
          <Card className="p-4">
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">
                Start {babyName ? `${babyName}'s` : 'your baby\'s'} journey
              </h2>
              
              <div className="flex items-start gap-3">
                <Sprout className="w-5 h-5 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  Every feed, nap, and diaper helps BabyRhythm understand {babyName ? `${babyName}'s` : 'your baby\'s'} unique rhythm.
                </p>
              </div>

              <Button
                onClick={() => onAddActivity()}
                variant="default"
                className="w-full"
              >
                Log your first activity
              </Button>
            </div>
          </Card>

          {/* Educational Content for New Users */}
          {showEducationalContent && (
            <div className="space-y-6 pt-4 border-t border-border/40">
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
      {/* 1. Sticky Header - Empty for now */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 border-b border-border/40">
      </div>

      <div className="px-4 pt-4 space-y-6">

        {/* Greeting */}
        <h2 className="text-xl font-semibold text-foreground">
          {getGreetingLine()}
        </h2>

        {/* Tone Card */}
        <div className="space-y-3">
          <button 
            onClick={() => setShowToneInsight(!showToneInsight)}
            className="w-full text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
              <span className="text-sm">{sentiment.emoji}</span>
              <span className="text-sm font-medium text-accent-foreground">{sentiment.text}</span>
            </div>
          </button>
          
          {showToneInsight && (
            <p className="text-sm text-muted-foreground leading-relaxed pl-1 italic">
              {getToneInsight(sentiment)}
            </p>
          )}
        </div>

        {/* 2. Current State */}
        <div className="space-y-4 pb-6 border-b border-border">
          
          <div className="space-y-3.5">
            {/* Last Feed */}
            {lastFeed ? (
              <div className="flex items-center gap-3">
                <Milk className="w-5 h-5 text-primary" />
                <p className="text-sm flex-1 text-muted-foreground">
                  Last feed — <span className="font-medium text-foreground">{lastFeed.time}</span>
                  {lastFeed.details?.quantity && (
                    <span className="ml-1">
                      {lastFeed.details.quantity} {lastFeed.details.unit || 'ml'}
                    </span>
                  )}
                </p>
                <Button
                  onClick={() => {
                    const lastFeed = [...activities]
                      .filter(a => a.type === 'feed')
                      .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
                    onAddActivity('feed', lastFeed);
                  }}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Milk className="w-5 h-5 text-primary" />
                <p className="text-sm flex-1 text-muted-foreground">
                  Last feed — <span className="font-medium text-foreground">not logged yet</span>
                </p>
                <Button
                  onClick={() => onAddActivity('feed')}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Sleep Status */}
            {ongoingNap ? (
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <p className="text-sm flex-1 text-muted-foreground">
                  Sleeping since — <span className="font-medium text-foreground">{ongoingNap.details?.startTime || ongoingNap.time}</span>
                </p>
                <Button
                  onClick={() => {
                    const lastNap = [...activities]
                      .filter(a => a.type === 'nap')
                      .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
                    onAddActivity('nap', lastNap);
                  }}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : awakeTime ? (
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-primary" />
                <p className="text-sm flex-1 text-muted-foreground">
                  Awake for — <span className="font-medium text-foreground">{awakeTime}</span>
                </p>
                <Button
                  onClick={() => {
                    const lastNap = [...activities]
                      .filter(a => a.type === 'nap')
                      .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
                    onAddActivity('nap', lastNap);
                  }}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-primary" />
                <p className="text-sm flex-1 text-muted-foreground">
                  Sleeping since — <span className="font-medium text-foreground">not logged yet</span>
                </p>
                <Button
                  onClick={() => onAddActivity('nap')}
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Last Diaper */}
            <div className="flex items-center gap-3">
              <Droplet className="w-5 h-5 text-primary" />
              <p className="text-sm flex-1 text-muted-foreground">
                Last diaper — <span className="font-medium text-foreground">
                  {lastDiaper ? lastDiaper.time : 'not logged yet'}
                </span>
                {lastDiaper?.details?.diaperType && (
                  <span className="ml-1">
                    {lastDiaper.details.diaperType}
                  </span>
                )}
              </p>
              <Button
                onClick={() => {
                  onAddActivity('diaper', lastDiaper);
                }}
                size="sm"
                className="h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 3. What's Next */}
        {!showingYesterday && (
          <Card 
            className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => setShowPredictionInsight(!showPredictionInsight)}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">
                  What's Next
                </h2>
                <ChevronDown 
                  className={`h-5 w-5 text-muted-foreground transition-transform ${showPredictionInsight ? 'rotate-180' : ''}`}
                />
              </div>
              
              {nextAction ? (
                <>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {nextAction}
                    </p>
                  </div>
                  {!ongoingNap && prediction && addActivity && prediction.confidence === 'high' && (prediction.intent === 'FEED_SOON' || prediction.intent === 'START_WIND_DOWN') && (
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Determine activity type based on prediction intent
                        const activityType = prediction.intent === 'FEED_SOON' ? 'feed' : 'nap';
                        
                        // Round time to nearest 5 minutes
                        const now = new Date();
                        const minutes = now.getMinutes();
                        const roundedMinutes = Math.round(minutes / 5) * 5;
                        const roundedDate = new Date(now);
                        roundedDate.setMinutes(roundedMinutes);
                        roundedDate.setSeconds(0);
                        roundedDate.setMilliseconds(0);
                        
                        const timeStr = roundedDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        // Build activity details with predicted values
                        let details = {};
                        if (activityType === 'feed' && prediction.timing.expectedFeedVolume) {
                          // Round to nearest 5 ml
                          const roundedVolume = Math.round(prediction.timing.expectedFeedVolume / 5) * 5;
                          details = {
                            feedType: 'bottle',
                            quantity: roundedVolume.toString(),
                            unit: 'ml'
                          };
                        }
                        
                        try {
                          await addActivity(activityType, details, roundedDate, timeStr);
                          const description = activityType === 'feed' && prediction.timing.expectedFeedVolume
                            ? `${Math.round(prediction.timing.expectedFeedVolume / 5) * 5} ml at ${timeStr}`
                            : `${timeStr}`;
                          toast({
                            title: activityType === 'feed' ? t('feedLogged') : t('napLogged'),
                            description,
                          });
                        } catch (error) {
                          console.error('Error logging activity:', error);
                          toast({
                            title: t('error'),
                            description: t('failedToLogActivity'),
                            variant: 'destructive',
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                    >
                      {prediction.intent === 'FEED_SOON' ? t('logFeedNow') : t('startNap')}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    Predictive next actions will become available once enough activities have been logged (at least 4 naps and 4 feeds).
                  </p>
                </div>
              )}
              
              {showPredictionInsight && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-1 italic">
                  {prediction 
                    ? getPredictionReasoning()
                    : "As you log more activities, we'll learn your baby's unique patterns and start making predictions about when they might need to feed or sleep next. For now, focus on logging feeds, naps, and other activities—each one helps us understand their rhythm better."
                  }
                </p>
              )}
              
              {/* Wake-up button if sleeping */}
              {ongoingNap && onEndNap && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Wake up button clicked in HomeTab');
                    console.log('onEndNap exists:', !!onEndNap);
                    console.log('ongoingNap:', ongoingNap);
                    onEndNap();
                  }}
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                >
                  {babyName?.split(' ')[0] || 'Baby'} woke up
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* 4. Daily Summary */}
        {displayActivities.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">
                Daily Summary
              </h2>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground transition-transform ${showTimeline ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Summary Stats */}
            <div className="space-y-3">
              <button 
                onClick={() => setShowFeedStatusInsight(!showFeedStatusInsight)}
                className="flex items-center gap-2 text-sm w-full text-left"
              >
                {getFeedStatusIndicator(summary.feedCount, babyAgeMonths) === 'on-track' ? (
                  <Circle className="w-3 h-3 fill-green-500 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
                <span className="font-medium text-foreground">Feeds:</span>
                <span className="text-muted-foreground">{summary.feedCount} total</span>
              </button>
              
              {showFeedStatusInsight && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-6 italic">
                  {getFeedStatusExplanation(summary.feedCount, babyAgeMonths)}
                </p>
              )}
              
              {summary.napCount > 0 && (
                <>
                  <button 
                    onClick={() => setShowSleepStatusInsight(!showSleepStatusInsight)}
                    className="flex items-center gap-2 text-sm w-full text-left"
                  >
                    {getSleepStatusIndicator(summary.napCount, babyAgeMonths) === 'on-track' ? (
                      <Circle className="w-3 h-3 fill-green-500 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-foreground">Sleep:</span>
                    <span className="text-muted-foreground">
                      {summary.napCount} nap{summary.napCount !== 1 ? 's' : ''}
                      {(() => {
                        const naps = displayActivities.filter(a => a.type === 'nap' && a.details?.endTime);
                        if (naps.length === 0) return '';
                        
                        let totalMinutes = 0;
                        naps.forEach(nap => {
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
                          let duration = endMinutes >= startMinutes 
                            ? endMinutes - startMinutes 
                            : (24 * 60) - startMinutes + endMinutes;
                          totalMinutes += duration;
                        });
                        
                        const hours = Math.floor(totalMinutes / 60);
                        const mins = totalMinutes % 60;
                        return ` (${hours}h ${mins}m)`;
                      })()}
                    </span>
                  </button>
                  
                  {showSleepStatusInsight && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-6 italic">
                      {getSleepStatusExplanation(summary.napCount, babyAgeMonths)}
                    </p>
                  )}
                </>
              )}
              
              {latestMeasurement && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Growth:</span>
                  <span className="text-muted-foreground">{latestMeasurement.summary}</span>
                </div>
              )}
            </div>
            
            {/* Daily Contextual Insight */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {getDailyInsight()}
              </p>
            </div>

            {/* Expandable Timeline */}
            {showTimeline && (
              <div className="pt-3 border-t border-border/50 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Today's Timeline
                </p>
                {(() => {
                  // Detect night sleep for the day
                  const nightSleep = detectNightSleep(sortedActivities, nightSleepEndHour);
                  const wakeTime = nightSleep ? getWakeTime(nightSleep) : null;
                  
                  return sortedActivities
                    .map((activity, index) => {
                      const isNightSleep = nightSleep?.id === activity.id;
                      const getActivityIcon = (type: string) => {
                        switch(type) {
                          case 'feed': return <Milk className="h-4 w-4" />;
                          case 'nap': return <Moon className="h-4 w-4" />;
                          case 'diaper': return <Droplet className="h-4 w-4" />;
                          case 'measure': return <Ruler className="h-4 w-4" />;
                          default: return <Clock className="h-4 w-4" />;
                        }
                      };

                      const getActivityGradient = (type: string) => {
                        switch (type) {
                          case "feed": return "bg-gradient-feed";
                          case "diaper": return "bg-gradient-diaper";
                          case "nap": return "bg-gradient-nap";
                          case "measure": return "bg-gradient-primary";
                          default: return "bg-gradient-primary";
                        }
                      };
                      
                      let details = '';
                      if (activity.type === 'feed' && activity.details?.quantity) {
                        details = ` • ${activity.details.quantity}${activity.details.unit || 'ml'}`;
                      } else if (activity.type === 'nap' && activity.details?.endTime) {
                        const parseTime = (timeStr: string) => {
                          const [time, period] = timeStr.split(' ');
                          const [hStr, mStr] = time.split(':');
                          let h = parseInt(hStr, 10);
                          const m = parseInt(mStr || '0', 10);
                          if (period === 'PM' && h !== 12) h += 12;
                          if (period === 'AM' && h === 12) h = 0;
                          return h * 60 + m;
                        };
                        
                        const startMinutes = parseTime(activity.details.startTime || activity.time);
                        const endMinutes = parseTime(activity.details.endTime);
                        let duration = endMinutes >= startMinutes 
                          ? endMinutes - startMinutes 
                          : (24 * 60) - startMinutes + endMinutes;
                        
                        const hours = Math.floor(duration / 60);
                        const mins = duration % 60;
                        details = ` • ${hours}h ${mins}m`;
                      } else if (activity.type === 'diaper' && activity.details?.diaperType) {
                        details = ` • ${activity.details.diaperType}`;
                      }
                      
                      return (
                        <>
                          <button
                            key={index}
                            onClick={() => onEditActivity(activity)}
                            className="relative flex items-center gap-2 py-0.5 w-full text-left hover:bg-accent/50 rounded-md px-1 -mx-1 transition-colors"
                          >
                            {/* Timeline line */}
                            {index < displayActivities.length - 1 && (
                              <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-border"></div>
                            )}
                            
                            {/* Timeline marker with circle */}
                            <div className={`relative z-10 flex-shrink-0 w-5 h-5 rounded-full ${getActivityGradient(activity.type)} flex items-center justify-center text-white`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{activity.time}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {activity.type}{details}
                              </span>
                            </div>
                          </button>
                          
                          {/* Wake-up indicator for night sleep */}
                          {isNightSleep && wakeTime && (
                            <div className="relative flex items-center gap-2 py-0.5 group hover:bg-accent/30 rounded-md px-2 transition-colors">
                              {/* Timeline line */}
                              <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-border group-last:hidden"></div>
                              
                              {/* Timeline marker */}
                              <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sun className="w-3 h-3 text-primary" />
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 flex items-start justify-between min-w-0 gap-2">
                                <p className="text-sm text-foreground font-medium break-words">
                                  {babyName?.split(' ')[0] || 'Baby'} woke up
                                </p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {wakeTime}
                                </span>
                              </div>
                            </div>
                           )}
                        </>
                      );
                    });
                })()}
              </div>
            )}
          </div>
        )}

        {/* Educational Content for New Users */}
        {showEducationalContent && displayActivities.length > 0 && (
          <div className="space-y-6 pt-4 border-t border-border/40">
            {/* Trends Tab Info */}
            {!visitedTabs.has('trends') && (
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
            )}

            {/* Rhythm Tab Info */}
            {!visitedTabs.has('guide') && (
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
            )}

            {/* Log Tab Info */}
            {!visitedTabs.has('log') && (
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
            )}
          </div>
        )}

        {/* Total moments counter */}
        {activities.length > 0 && (
          <div className="text-center pt-8 pb-4 space-y-1">
            <p className="text-sm text-muted-foreground">
              {"You've logged "}
              <span className="font-medium text-foreground">{activities.length}</span>
              {" moments together so far 🌿"}
            </p>
            {showBadge && percentile !== null && (
              <p className="text-xs text-muted-foreground/80">
                {"You're in the top "}
                <span className="font-medium text-primary">{percentile}%</span>
                {" of users"}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
