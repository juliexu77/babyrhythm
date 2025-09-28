import { Activity } from "@/components/ActivityCard";

export interface PatternInsight {
  type: string;
  message: string;
  confidence: number;
  nextPrediction?: {
    activity: string;
    estimatedTime: string;
    confidence: number;
  };
}

// Day/Night context helpers
export const isDaytimeActivity = (timeStr: string): boolean => {
  const minutes = parseTimeToMinutes(timeStr);
  return minutes >= 6 * 60 && minutes < 18 * 60; // 6am-6pm
};

export const isNightActivity = (timeStr: string): boolean => {
  return !isDaytimeActivity(timeStr);
};

export const getNaps = (activities: Activity[]): Activity[] => {
  return activities.filter(a => a.type === "nap" && isDaytimeActivity(a.time));
};

export const getNighttimeSleep = (activities: Activity[]): Activity[] => {
  return activities.filter(a => a.type === "nap" && isNightActivity(a.time));
};

export const getDaytimeFeeds = (activities: Activity[]): Activity[] => {
  return activities.filter(a => a.type === "feed" && isDaytimeActivity(a.time));
};

export const getNightFeeds = (activities: Activity[]): Activity[] => {
  return activities.filter(a => a.type === "feed" && isNightActivity(a.time));
};

export const analyzePatterns = (activities: Activity[]): PatternInsight[] => {
  const insights: PatternInsight[] = [];
  
  if (activities.length < 2) {
    return [{
      type: "info",
      message: "Keep logging activities to get personalized insights and predictions!",
      confidence: 1.0
    }];
  }

  // Group activities by type and time context
  const daytimeFeeds = getDaytimeFeeds(activities);
  const nightFeeds = getNightFeeds(activities);
  const naps = getNaps(activities);
  const nighttimeSleep = getNighttimeSleep(activities);
  const diaperActivities = activities.filter(a => a.type === "diaper");

  // Analyze daytime feeding patterns
  if (daytimeFeeds.length >= 2) {
    const feedIntervals = calculateIntervals(daytimeFeeds);
    const avgFeedInterval = feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length;
    
    const lastFeed = daytimeFeeds[0];
    const timeSinceLastFeed = getMinutesSince(lastFeed.time);
    
    if (timeSinceLastFeed < avgFeedInterval - 30) {
      insights.push({
        type: "daytime_feed",
        message: `Baby typically feeds every ${Math.round(avgFeedInterval / 60)} hours during the day. Next daytime feed likely in ${Math.round((avgFeedInterval - timeSinceLastFeed) / 60)} hours.`,
        confidence: feedIntervals.length >= 3 ? 0.8 : 0.6,
        nextPrediction: {
          activity: "feed",
          estimatedTime: getTimeFromMinutes(avgFeedInterval - timeSinceLastFeed),
          confidence: feedIntervals.length >= 3 ? 0.8 : 0.6
        }
      });
    }
  }

  // Analyze night feeding patterns separately
  if (nightFeeds.length >= 2) {
    const nightFeedIntervals = calculateIntervals(nightFeeds);
    const avgNightFeedInterval = nightFeedIntervals.reduce((a, b) => a + b, 0) / nightFeedIntervals.length;
    
    const lastNightFeed = nightFeeds[0];
    const timeSinceLastNightFeed = getMinutesSince(lastNightFeed.time);
    
    if (timeSinceLastNightFeed < avgNightFeedInterval - 30 && isNightActivity(new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }))) {
      insights.push({
        type: "night_feed",
        message: `Night feeds typically occur every ${Math.round(avgNightFeedInterval / 60)} hours. Next night feed expected in ${Math.round((avgNightFeedInterval - timeSinceLastNightFeed) / 60)} hours.`,
        confidence: nightFeedIntervals.length >= 3 ? 0.75 : 0.55,
        nextPrediction: {
          activity: "night_feed",
          estimatedTime: getTimeFromMinutes(avgNightFeedInterval - timeSinceLastNightFeed),
          confidence: nightFeedIntervals.length >= 3 ? 0.75 : 0.55
        }
      });
    }
  }

  // Analyze nap patterns (daytime sleep 6am-6pm)
  if (naps.length >= 2) {
    const napIntervals = calculateIntervals(naps);
    const avgNapInterval = napIntervals.reduce((a, b) => a + b, 0) / napIntervals.length;
    
    const lastNap = naps[0];
    const timeSinceLastNap = getMinutesSince(lastNap.time);
    
    if (timeSinceLastNap < avgNapInterval - 30 && isDaytimeActivity(new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }))) {
      insights.push({
        type: "nap",
        message: `Based on nap patterns, next nap expected in about ${Math.round((avgNapInterval - timeSinceLastNap) / 60)} hours.`,
        confidence: napIntervals.length >= 3 ? 0.75 : 0.55,
        nextPrediction: {
          activity: "nap",
          estimatedTime: getTimeFromMinutes(avgNapInterval - timeSinceLastNap),
          confidence: napIntervals.length >= 3 ? 0.75 : 0.55
        }
      });
    }
  }

  // Analyze nighttime sleep patterns separately
  if (nighttimeSleep.length >= 2) {
    const nightSleepIntervals = calculateIntervals(nighttimeSleep);
    const avgNightSleepInterval = nightSleepIntervals.reduce((a, b) => a + b, 0) / nightSleepIntervals.length;
    
    const lastNightSleep = nighttimeSleep[0];
    const timeSinceLastNightSleep = getMinutesSince(lastNightSleep.time);
    
    if (timeSinceLastNightSleep < avgNightSleepInterval - 30 && isNightActivity(new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' }))) {
      insights.push({
        type: "nighttime_sleep",
        message: `Based on nighttime sleep patterns, bedtime expected in about ${Math.round((avgNightSleepInterval - timeSinceLastNightSleep) / 60)} hours.`,
        confidence: nightSleepIntervals.length >= 3 ? 0.8 : 0.6,
        nextPrediction: {
          activity: "bedtime",
          estimatedTime: getTimeFromMinutes(avgNightSleepInterval - timeSinceLastNightSleep),
          confidence: nightSleepIntervals.length >= 3 ? 0.8 : 0.6
        }
      });
    }
  }

  // Analyze daily intake with day/night breakdown
  if (daytimeFeeds.length > 0 || nightFeeds.length > 0) {
    const daytimeIntake = daytimeFeeds.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    const nightIntake = nightFeeds.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    const totalIntake = daytimeIntake + nightIntake;
    const totalFeeds = daytimeFeeds.length + nightFeeds.length;
    
    if (totalIntake > 0) {
      const breakdown = [];
      if (daytimeIntake > 0) breakdown.push(`${daytimeIntake} oz during day (${daytimeFeeds.length} feeds)`);
      if (nightIntake > 0) breakdown.push(`${nightIntake} oz at night (${nightFeeds.length} feeds)`);
      
      insights.push({
        type: "summary",
        message: `Today's total: ${totalIntake} oz across ${totalFeeds} feeds. ${breakdown.join(', ')}.`,
        confidence: 1.0
      });
    }
  }

  return insights;
};

export const answerQuestion = (question: string, activities: Activity[]): string => {
  const q = question.toLowerCase();
  
  // Total intake questions with day/night breakdown
  if (q.includes("total") && (q.includes("drink") || q.includes("intake") || q.includes("milk"))) {
    const daytimeFeeds = getDaytimeFeeds(activities);
    const nightFeeds = getNightFeeds(activities);
    
    const daytimeIntake = daytimeFeeds.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    const nightIntake = nightFeeds.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    const totalIntake = daytimeIntake + nightIntake;
    const totalFeeds = daytimeFeeds.length + nightFeeds.length;
    
    if (totalIntake > 0) {
      let breakdown = `${totalIntake} oz across ${totalFeeds} feeds`;
      if (daytimeIntake > 0 && nightIntake > 0) {
        breakdown += ` (${daytimeIntake} oz during day, ${nightIntake} oz at night)`;
      }
      return `Today baby has consumed ${breakdown}.`;
    }
    return "No feeding data recorded yet today.";
  }

  // Last wake up questions - check both naps and nighttime sleep
  if (q.includes("last") && (q.includes("wake") || q.includes("awake"))) {
    const allSleepActivities = [...getNaps(activities), ...getNighttimeSleep(activities)];
    if (allSleepActivities.length > 0) {
      const lastSleep = allSleepActivities[0];
      const endTime = lastSleep.details.endTime;
      const sleepType = isDaytimeActivity(lastSleep.time) ? "nap" : "nighttime sleep";
      if (endTime) {
        return `Baby last woke up at ${endTime} from ${sleepType}.`;
      }
      return `Last ${sleepType} started at ${lastSleep.time}, but end time wasn't recorded.`;
    }
    return "No sleep data recorded yet today.";
  }

  // When is next feed/nap
  if (q.includes("next") && (q.includes("feed") || q.includes("nap"))) {
    const insights = analyzePatterns(activities);
    const relevantInsight = insights.find(i => 
      (q.includes("feed") && i.type === "feed") || 
      (q.includes("nap") && i.type === "nap")
    );
    
    if (relevantInsight?.nextPrediction) {
      return relevantInsight.message;
    }
    
    return "Not enough data yet to predict timing. Keep logging activities for better predictions!";
  }

  // Diaper count
  if (q.includes("diaper") && (q.includes("many") || q.includes("count") || q.includes("total"))) {
    const diapers = activities.filter(a => a.type === "diaper");
    return `${diapers.length} diaper changes recorded today.`;
  }

  // Sleep duration with nap/nighttime breakdown
  if (q.includes("sleep") || q.includes("nap")) {
    const naps = getNaps(activities);
    const nightSleep = getNighttimeSleep(activities);
    
    let napTime = 0;
    let nightTime = 0;
    
    naps.forEach(nap => {
      if (nap.details.startTime && nap.details.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        const end = parseTimeToMinutes(nap.details.endTime);
        napTime += end - start;
      }
    });
    
    nightSleep.forEach(sleep => {
      if (sleep.details.startTime && sleep.details.endTime) {
        const start = parseTimeToMinutes(sleep.details.startTime);
        let end = parseTimeToMinutes(sleep.details.endTime);
        if (end < start) end += 24 * 60; // Handle overnight sleep
        nightTime += end - start;
      }
    });
    
    const totalSleep = napTime + nightTime;
    const totalSleepPeriods = naps.length + nightSleep.length;
    
    if (totalSleep > 0) {
      let breakdown = `${Math.round(totalSleep / 60)} hours ${totalSleep % 60} minutes total`;
      if (napTime > 0 && nightTime > 0) {
        breakdown += ` (${Math.round(napTime / 60)}h ${napTime % 60}m naps, ${Math.round(nightTime / 60)}h ${nightTime % 60}m night sleep)`;
      } else if (napTime > 0) {
        breakdown += ` from ${naps.length} naps`;
      } else {
        breakdown += ` from nighttime sleep`;
      }
      return `Sleep today: ${breakdown}.`;
    }
    return "No complete sleep data recorded yet today.";
  }

  return "I can help you with questions about feeding totals, sleep patterns, diaper changes, and predictions for next activities. Try asking 'How much did baby drink today?' or 'When is the next nap?'";
};

// Helper functions
const calculateIntervals = (activities: Activity[]): number[] => {
  const intervals: number[] = [];
  
  for (let i = 0; i < activities.length - 1; i++) {
    const current = parseTimeToMinutes(activities[i].time);
    const next = parseTimeToMinutes(activities[i + 1].time);
    intervals.push(Math.abs(current - next));
  }
  
  return intervals;
};

const parseTimeToMinutes = (timeStr: string): number => {
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  
  let hour24 = hours;
  if (period === "PM" && hours !== 12) hour24 += 12;
  if (period === "AM" && hours === 12) hour24 = 0;
  
  return hour24 * 60 + minutes;
};

const getMinutesSince = (timeStr: string): number => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const activityMinutes = parseTimeToMinutes(timeStr);
  
  return currentMinutes - activityMinutes;
};

const getTimeFromMinutes = (minutes: number): string => {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60000);
  
  const hours = futureTime.getHours();
  const mins = futureTime.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHour}:${mins.toString().padStart(2, "0")} ${period}`;
};