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

export const analyzePatterns = (activities: Activity[]): PatternInsight[] => {
  const insights: PatternInsight[] = [];
  
  if (activities.length < 2) {
    return [{
      type: "info",
      message: "Keep logging activities to get personalized insights and predictions!",
      confidence: 1.0
    }];
  }

  // Group activities by type
  const feedActivities = activities.filter(a => a.type === "feed");
  const napActivities = activities.filter(a => a.type === "nap");
  const diaperActivities = activities.filter(a => a.type === "diaper");

  // Analyze feed patterns
  if (feedActivities.length >= 2) {
    const feedIntervals = calculateIntervals(feedActivities);
    const avgFeedInterval = feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length;
    
    const lastFeed = feedActivities[0];
    const timeSinceLastFeed = getMinutesSince(lastFeed);
    
    if (timeSinceLastFeed < avgFeedInterval - 30) {
      insights.push({
        type: "feed",
        message: `Baby typically feeds every ${Math.round(avgFeedInterval / 60)} hours. Next feed likely in ${Math.round((avgFeedInterval - timeSinceLastFeed) / 60)} hours.`,
        confidence: feedIntervals.length >= 3 ? 0.8 : 0.6,
        nextPrediction: {
          activity: "feed",
          estimatedTime: getTimeFromMinutes(avgFeedInterval - timeSinceLastFeed),
          confidence: feedIntervals.length >= 3 ? 0.8 : 0.6
        }
      });
    }
  }

  // Analyze nap patterns
  if (napActivities.length >= 2) {
    const napIntervals = calculateIntervals(napActivities);
    const avgNapInterval = napIntervals.reduce((a, b) => a + b, 0) / napIntervals.length;
    
    const lastNap = napActivities[0];
    const timeSinceLastNap = getMinutesSince(lastNap);
    
    if (timeSinceLastNap < avgNapInterval - 30) {
      insights.push({
        type: "nap",
        message: `Based on sleep patterns, next nap expected in about ${Math.round((avgNapInterval - timeSinceLastNap) / 60)} hours.`,
        confidence: napIntervals.length >= 3 ? 0.75 : 0.55,
        nextPrediction: {
          activity: "nap",
          estimatedTime: getTimeFromMinutes(avgNapInterval - timeSinceLastNap),
          confidence: napIntervals.length >= 3 ? 0.75 : 0.55
        }
      });
    }
  }

  // Analyze total daily intake
  if (feedActivities.length > 0) {
    const totalIntake = feedActivities.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    if (totalIntake > 0) {
      insights.push({
        type: "summary",
        message: `Today's total intake: ${totalIntake} oz across ${feedActivities.length} feeds.`,
        confidence: 1.0
      });
    }
  }

  return insights;
};

export const answerQuestion = (question: string, activities: Activity[]): string => {
  const q = question.toLowerCase();
  
  // Total intake questions
  if (q.includes("total") && (q.includes("drink") || q.includes("intake") || q.includes("milk"))) {
    const feedActivities = activities.filter(a => a.type === "feed");
    const totalIntake = feedActivities.reduce((sum, feed) => {
      const qty = parseFloat(feed.details.quantity || "0");
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
    
    if (totalIntake > 0) {
      return `Today baby has consumed ${totalIntake} oz across ${feedActivities.length} feeds.`;
    }
    return "No feeding data recorded yet today.";
  }

  // Last wake up questions
  if (q.includes("last") && (q.includes("wake") || q.includes("awake"))) {
    const napActivities = activities.filter(a => a.type === "nap");
    if (napActivities.length > 0) {
      const lastNap = napActivities[0];
      const endTime = lastNap.details.endTime;
      if (endTime) {
        return `Baby last woke up at ${endTime}.`;
      }
      return `Last nap started at ${lastNap.time}, but end time wasn't recorded.`;
    }
    return "No nap data recorded yet today.";
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

  // Sleep duration
  if (q.includes("sleep") || q.includes("nap")) {
    const naps = activities.filter(a => a.type === "nap");
    let totalSleep = 0;
    
    naps.forEach(nap => {
      if (nap.details.startTime && nap.details.endTime) {
        const start = parseTimeToMinutes(nap.details.startTime);
        const end = parseTimeToMinutes(nap.details.endTime);
        totalSleep += end - start;
      }
    });
    
    if (totalSleep > 0) {
      return `Total sleep today: ${Math.round(totalSleep / 60)} hours ${totalSleep % 60} minutes across ${naps.length} naps.`;
    }
    return "No complete nap data recorded yet today.";
  }

  return "I can help you with questions about feeding totals, sleep patterns, diaper changes, and predictions for next activities. Try asking 'How much did baby drink today?' or 'When is the next nap?'";
};

// Helper functions - now date-aware using loggedAt timestamps
const calculateIntervals = (activities: Activity[]): number[] => {
  const intervals: number[] = [];
  
  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i].loggedAt;
    const next = activities[i + 1].loggedAt;
    
    // Skip if either activity doesn't have loggedAt timestamp
    if (!current || !next) continue;
    
    const currentDate = new Date(current);
    const nextDate = new Date(next);
    const diffMinutes = Math.abs(Math.floor((currentDate.getTime() - nextDate.getTime()) / 60000));
    
    intervals.push(diffMinutes);
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

const getMinutesSince = (activity: Activity): number => {
  // Use loggedAt timestamp for accurate date-aware calculation
  if (!activity.loggedAt) {
    // Fallback to time-only calculation if loggedAt not available
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const activityMinutes = parseTimeToMinutes(activity.time);
    return currentMinutes - activityMinutes;
  }
  
  const now = new Date();
  const activityDate = new Date(activity.loggedAt);
  return Math.floor((now.getTime() - activityDate.getTime()) / 60000);
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