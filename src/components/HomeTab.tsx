import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby, Droplet, Moon, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isToday, differenceInMinutes, differenceInHours } from "date-fns";
import { usePredictionEngine } from "@/hooks/usePredictionEngine";
import { Activity } from "@/components/ActivityCard";
import { DailyRecap } from "@/components/DailyRecap";

interface HomeTabProps {
  activities: Activity[];
  babyName?: string;
  userName?: string;
  babyBirthday?: string;
  onAddActivity: () => void;
  onEndNap?: () => void;
  ongoingNap?: Activity | null;
  userRole?: string;
  dailyRecapEnabled?: boolean;
}

export const HomeTab = ({ activities, babyName, userName, babyBirthday, onAddActivity, onEndNap, ongoingNap: passedOngoingNap, userRole, dailyRecapEnabled = true }: HomeTabProps) => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimeline, setShowTimeline] = useState(false);
  const [showGrowthDetails, setShowGrowthDetails] = useState(false);
  const [dailyRecapDismissed, setDailyRecapDismissed] = useState(false);
  const { prediction, getIntentCopy, getProgressText } = usePredictionEngine(activities);

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

  // Reset daily recap dismissal at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setDailyRecapDismissed(false);
      }
    };
    
    const timer = setInterval(checkMidnight, 60000); // Check every minute
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
  const todayActivities = activities.filter(a => 
    a.loggedAt && isToday(new Date(a.loggedAt))
  );

  // Get yesterday's activities for context when today is empty
  const yesterdayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return activityDate.toDateString() === yesterday.toDateString();
  });

  // Use yesterday's data as context if nothing logged today
  const displayActivities = todayActivities.length > 0 ? todayActivities : yesterdayActivities;
  const showingYesterday = todayActivities.length === 0 && yesterdayActivities.length > 0;
  // Debug: surface counts to verify measurement visibility
  if (typeof window !== 'undefined') {
    console.info('HomeTab - summary debug', {
      todayCount: todayActivities.length,
      yesterdayCount: yesterdayActivities.length,
      showingYesterday,
      typesToday: todayActivities.map(a => a.type),
      typesYesterday: yesterdayActivities.map(a => a.type),
    });
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
      a.loggedAt && new Date(a.loggedAt) >= yesterdayStart &&
      a.type === 'nap' && a.details?.endTime
    );

    if (recentNaps.length === 0) return null;

    const napsWithEndDate = recentNaps.map(nap => {
      const baseDate = new Date(nap.loggedAt!);
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

  // Get last feed
  const lastFeed = displayActivities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];

  // Get last diaper
  const lastDiaper = displayActivities
    .filter(a => a.type === 'diaper')
    .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];

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
      
      const napStart = new Date(ongoingNap.loggedAt!);
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
      return t('workingOnFirstNap');
    } else if (count < expected.min) {
      return t('shorterNapDay');
    } else {
      return t('extraRestfulDay');
    }
  };

  // Use unified prediction engine
  const nextAction = prediction ? getIntentCopy(prediction, babyName) : null;
  
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
        
        const wakeTime = new Date(lastNap.loggedAt!);
        wakeTime.setHours(hour24, minutes, 0, 0);
        
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

  const summary = getDailySummary();
  const latestMeasurement = getLatestMeasurement();
  if (typeof window !== 'undefined') {
    console.info('HomeTab - measurement count', { showingYesterday, measureCount: summary.measureCount, latestMeasurement });
  }
  const awakeTime = getAwakeTime();
  const sleepStatus = getSleepStatus();
  const sentiment = getDailySentiment();
  const developmentalPhase = getDevelopmentalPhase();

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      {/* Greeting Section */}
      <div className="space-y-2">
        <h1 className="text-[22px] font-bold text-foreground dark:text-white">
          {getGreetingLine()}
        </h1>
        
        {developmentalPhase && babyName && (
          <p className="text-[15px] text-muted-foreground">
            {babyName} is {developmentalPhase}
          </p>
        )}
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20">
          <span className="text-sm">{sentiment.emoji}</span>
          <span className="text-sm font-medium text-accent-foreground">{sentiment.text}</span>
        </div>
      </div>

      {/* Daily Recap - Parent View (5 PM to Midnight) */}
      {dailyRecapEnabled && !dailyRecapDismissed && (
        <DailyRecap
          activities={activities}
          babyName={babyName}
          userRole={userRole}
          onDismiss={() => setDailyRecapDismissed(true)}
        />
      )}

      {/* What's Next - Predictive Card (High Priority) */}
      {(nextAction && !showingYesterday) || ongoingNap ? (
        <Card className="p-4 space-y-3 bg-card/50 backdrop-blur border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">What's next</h2>
          </div>
          {nextAction && (
            <p className="text-base text-foreground leading-relaxed">
              {nextAction}
            </p>
          )}
          
          {/* Wake-up button if sleeping */}
          {ongoingNap && onEndNap && (
            <Button
              onClick={() => {
                console.log('Wake up button clicked in HomeTab');
                console.log('onEndNap exists:', !!onEndNap);
                console.log('ongoingNap:', ongoingNap);
                onEndNap();
              }}
              className="w-full mt-2"
              size="sm"
            >
              {babyName?.split(' ')[0] || 'Baby'} woke up
            </Button>
          )}
        </Card>
      ) : null}

      {/* Today's Flow - Rhythm Summary */}
      <Card className="p-4 space-y-4 bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            🌿 {showingYesterday ? "Yesterday's Flow" : "Today's Flow"}
          </h2>
          {showingYesterday && (
            <span className="text-xs text-muted-foreground italic">
              showing recent context
            </span>
          )}
        </div>
        
        {/* Current Activity Status */}
        <div className="space-y-2.5 pb-3 border-b border-border/50">
          {/* Last Feed */}
          {lastFeed && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Baby className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Last feed: <span className="font-medium">{lastFeed.time}</span>
                  {lastFeed.details?.quantity && (
                    <span className="text-muted-foreground ml-1">
                      • {lastFeed.details.quantity} {lastFeed.details.unit || 'ml'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Last Diaper */}
          {lastDiaper && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Droplet className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Last diaper: <span className="font-medium">{lastDiaper.time}</span>
                  {lastDiaper.details?.diaperType && (
                    <span className="text-muted-foreground ml-1">
                      • {lastDiaper.details.diaperType}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Awake Window */}
          {!ongoingNap && awakeTime && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Awake window: <span className="font-medium">{awakeTime}</span>
                </p>
              </div>
            </div>
          )}

          {/* Currently Sleeping Status */}
          {ongoingNap && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  {t('sleepingSince')} <span className="font-medium">{ongoingNap.details?.startTime || ongoingNap.time}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* First-Time Welcome or Subtle Add Prompt */}
        {!showingYesterday && todayActivities.length === 0 && activities.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-base text-foreground font-medium">
                Welcome{userName ? `, ${userName}` : ''}. {babyName ? `${babyName}'s` : "Your baby's"} rhythm begins today.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Try logging a feeding or nap to start building your flow.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onAddActivity}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <Baby className="w-4 h-4 mr-2" />
                Add a Feeding
              </Button>
              <Button
                onClick={onAddActivity}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <Moon className="w-4 h-4 mr-2" />
                Add a Nap
              </Button>
            </div>
          </div>
        ) : !showingYesterday && todayActivities.length === 0 ? (
          <button
            onClick={onAddActivity}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg"
          >
            {t('tapGreenToLog')}
          </button>
        ) : null}

        {/* Daily Progress & Comparisons */}
        {displayActivities.length > 0 && (
        <div className="space-y-2.5 pt-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🌤️</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{t('feedsLabel')}</span> {summary.feedCount} {t('logged')} {showingYesterday ? t('yesterday') : t('today')}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prediction ? getProgressText(prediction, 'feeds') : getFeedComparison(summary.feedCount, babyAgeMonths)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">🌈</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{t('sleepLabel')}</span> {summary.napCount} {summary.napCount !== 1 ? t('napsCompleted') : t('napCompleted')}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prediction ? getProgressText(prediction, 'naps') : getNapComparison(summary.napCount, babyAgeMonths)}
              </p>
            </div>
          </div>
          
          {latestMeasurement && (
            <button
              onClick={() => setShowGrowthDetails(!showGrowthDetails)}
              className="flex items-start gap-2 w-full text-left hover:opacity-80 transition-opacity"
            >
              <span className="text-lg">🌱</span>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">Growth</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {latestMeasurement.summary || 'Tracked recently'}
                </p>
                {showGrowthDetails && (
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Measured {format(new Date(latestMeasurement.date), 'MMM d')}
                    </div>
                    {latestMeasurement.weight && (
                      <div className="text-xs text-muted-foreground">
                        Weight: {latestMeasurement.weight.display} ({latestMeasurement.weight.percentile}th percentile)
                      </div>
                    )}
                    {latestMeasurement.length && (
                      <div className="text-xs text-muted-foreground">
                        Length: {latestMeasurement.length.display} ({latestMeasurement.length.percentile}th percentile)
                      </div>
                    )}
                    {latestMeasurement.headCirc && (
                      <div className="text-xs text-muted-foreground">
                        Head: {latestMeasurement.headCirc.display} ({latestMeasurement.headCirc.percentile}th percentile)
                      </div>
                    )}
                  </div>
                )}
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${showGrowthDetails ? 'rotate-180' : ''}`}
              />
            </button>
          )}

          <div className="flex items-start gap-2">
            <span className="text-lg">💫</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{t('overallLabel')}</span> {t('calmAndSteady')}
              </p>
            </div>
          </div>
        </div>
        )}
      </Card>

      {/* Emotional Reassurance */}
      {displayActivities.length > 0 && (
        <div className="flex items-start gap-2 px-2">
          <span className="text-lg">💚</span>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            {t('youreDoingGreat')}{userName ? `, ${userName}` : ''}. {t('smallRhythmsAddingUp')}
          </p>
        </div>
      )}

    </div>
  );
};
