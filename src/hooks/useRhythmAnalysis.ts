import { useMemo } from "react";
import { getDailySentiment } from "@/utils/sentimentAnalysis";
import { getActivityEventDateString } from "@/utils/activityDate";
import { isDaytimeNap } from "@/utils/napClassification";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface ToneFrequencies {
  frequency: Record<string, number>;
  tones: ReturnType<typeof getDailySentiment>[];
  currentStreak: number;
  streakTone: string;
}

// Helper to get daily tone for rhythm tracking
const getDailyTone = (dayActivities: Activity[], allActivities: Activity[], babyBirthday?: string) => {
  const babyAgeMonths = babyBirthday 
    ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  
  return getDailySentiment(dayActivities, allActivities, babyAgeMonths, 12);
};

export const useRhythmAnalysis = (
  activities: Activity[],
  babyBirthday?: string | null,
  nightSleepStartHour?: number,
  nightSleepEndHour?: number
) => {
  // Calculate tone frequencies for the last 7 days EXCLUDING TODAY
  const toneFrequencies = useMemo((): ToneFrequencies => {
    if (!babyBirthday) return { frequency: {}, tones: [], currentStreak: 0, streakTone: "" };
    
    // Exclude today - use last 7 complete days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i + 1));
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();
    
    const tones = last7Days.map(date => {
      const targetDateStr = date.toISOString().split('T')[0];
      const dayActivities = activities.filter(a => {
        return getActivityEventDateString(a) === targetDateStr;
      });
      return getDailyTone(dayActivities, activities, babyBirthday);
    });
    
    const frequency = tones.reduce((acc, tone) => {
      acc[tone.text] = (acc[tone.text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate current streak (consecutive days with same tone)
    let currentStreak = 0;
    let streakTone = "";
    if (tones.length > 0) {
      const lastTone = tones[tones.length - 1].text;
      for (let i = tones.length - 1; i >= 0; i--) {
        if (tones[i].text === lastTone) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (currentStreak >= 2) {
        streakTone = lastTone;
      }
    }
    
    return { frequency, tones, currentStreak, streakTone };
  }, [activities, babyBirthday]);
  
  // Calculate last month's data for progress comparison
  const lastMonthData = useMemo(() => {
    if (!babyBirthday) return {};
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const lastMonthActivities = activities.filter(a => {
      const activityDateStr = getActivityEventDateString(a);
      return activityDateStr >= sixtyDaysAgoStr && activityDateStr < thirtyDaysAgoStr;
    });
    
    const lastMonthDays = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 60 + i);
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    const lastMonthTones = lastMonthDays.map(date => {
      const targetDateStr = date.toISOString().split('T')[0];
      const dayActivities = lastMonthActivities.filter(a => {
        return getActivityEventDateString(a) === targetDateStr;
      });
      return getDailyTone(dayActivities, activities, babyBirthday);
    });
    
    const frequency = lastMonthTones.reduce((acc, tone) => {
      acc[tone.text] = (acc[tone.text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return frequency;
  }, [activities, babyBirthday]);
  
  // Calculate data tier requirements
  const dataTiers = useMemo(() => {
    const allSleepActivities = activities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour || 19, nightSleepEndHour || 7)
    );
    const daytimeNaps = allSleepActivities;
    const feeds = activities.filter(a => a.type === 'feed');
    const totalActivities = activities.length;
    
    // Tier 1: Age-based predictions (1+ activity)
    const hasTier1Data = totalActivities >= 1;
    
    // Tier 2: Pattern emerging (4+ total activities)
    const hasTier2Data = totalActivities >= 4;
    
    // Tier 3: Personalized AI (10+ total activities AND 4+ daytime naps AND 4+ feeds)
    const hasTier3Data = totalActivities >= 10 && daytimeNaps.length >= 4 && feeds.length >= 4;
    
    // Progress toward unlocking insights
    const required = { activities: 10, feeds: 4, naps: 4 };
    const remaining = {
      activities: Math.max(0, required.activities - totalActivities),
      feeds: Math.max(0, required.feeds - feeds.length),
      naps: Math.max(0, required.naps - daytimeNaps.length),
    };
    const unlockPercent = Math.min(100, Math.round(((required.activities - remaining.activities) / required.activities) * 100));
    
    return {
      hasTier1Data,
      hasTier2Data,
      hasTier3Data,
      required,
      remaining,
      unlockPercent,
      daytimeNapsCount: daytimeNaps.length,
      feedsCount: feeds.length,
      totalActivities
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);
  
  // Calculate transition window based on baby age
  const transitionWindow = useMemo(() => {
    if (!babyBirthday) return null;
    
    const birthDate = new Date(babyBirthday);
    const today = new Date();
    const babyAgeInDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (babyAgeInDays >= 90 && babyAgeInDays <= 120) {
      return { from: 4, to: 3, label: "3-4 month transition" };
    }
    if (babyAgeInDays >= 180 && babyAgeInDays <= 270) {
      return { from: 3, to: 2, label: "6-9 month transition" };
    }
    if (babyAgeInDays >= 456 && babyAgeInDays <= 547) {
      return { from: 2, to: 1, label: "15-18 month transition" };
    }
    return null;
  }, [babyBirthday]);
  
  const currentTone = toneFrequencies.tones[toneFrequencies.tones.length - 1];
  const sortedTones = Object.entries(toneFrequencies.frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  const thisMonthSmoothFlow = toneFrequencies.frequency["Smooth Flow"] || 0;
  const lastMonthSmoothFlow = lastMonthData["Smooth Flow"] || 0;
  const smoothFlowDiff = thisMonthSmoothFlow - lastMonthSmoothFlow;
  
  return {
    toneFrequencies,
    lastMonthData,
    dataTiers,
    transitionWindow,
    currentTone,
    sortedTones,
    smoothFlowDiff
  };
};
