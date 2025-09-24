import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, Palette } from "lucide-react";

interface NextActivityPredictionProps {
  activities: Activity[];
}

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  const getTimeInMinutes = (timeString: string) => {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  const predictNextActivity = () => {
    if (activities.length === 0) {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        reason: "Start your day with a feeding"
      };
    }

    // Get yesterday's activities (mock data for now - in real app would filter by date)
    const yesterdayActivities = activities.slice(); // Using current activities as mock yesterday data
    
    // Get today's activities
    const todayActivities = activities.slice(-2); // Last 2 activities as mock today data
    
    if (yesterdayActivities.length === 0) {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        reason: "No previous data available"
      };
    }

    // Find patterns in yesterday's data
    const feedIntervals: number[] = [];
    const napIntervals: number[] = [];
    
    for (let i = 1; i < yesterdayActivities.length; i++) {
      const current = yesterdayActivities[i];
      const previous = yesterdayActivities[i - 1];
      
      if (current.type === "feed" && previous.type === "feed") {
        const interval = getTimeInMinutes(current.time) - getTimeInMinutes(previous.time);
        if (interval > 0) feedIntervals.push(interval);
      }
      
      if (current.type === "nap" && previous.type === "feed") {
        const interval = getTimeInMinutes(current.time) - getTimeInMinutes(previous.time);
        if (interval > 0) napIntervals.push(interval);
      }
    }

    // Get the last activity from today
    const lastActivity = todayActivities[todayActivities.length - 1];
    if (!lastActivity) {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        reason: "No activities logged today yet"
      };
    }

    const lastActivityTime = getTimeInMinutes(lastActivity.time);
    const currentTime = getTimeInMinutes(getCurrentTime());
    const timeSinceLastActivity = currentTime - lastActivityTime;

    // Predict based on patterns
    if (lastActivity.type === "feed") {
      // Average time between feeds
      const avgFeedInterval = feedIntervals.length > 0 
        ? feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length 
        : 180; // Default 3 hours
      
      // Average time from feed to nap
      const avgFeedToNap = napIntervals.length > 0
        ? napIntervals.reduce((a, b) => a + b, 0) / napIntervals.length
        : 60; // Default 1 hour

      if (timeSinceLastActivity >= avgFeedToNap - 15) {
        return {
          type: "nap",
          suggestedTime: getCurrentTime(),
          reason: `Based on yesterday's pattern, nap usually comes ${Math.round(avgFeedToNap / 60 * 10) / 10}h after feeding`
        };
      } else if (timeSinceLastActivity >= avgFeedInterval - 30) {
        return {
          type: "feed",
          suggestedTime: getCurrentTime(),
          reason: `Next feeding typically due (avg ${Math.round(avgFeedInterval / 60 * 10) / 10}h between feeds)`
        };
      }
    }

    if (lastActivity.type === "nap") {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        reason: "Feeding usually follows after nap time"
      };
    }

    if (lastActivity.type === "diaper") {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        reason: "Consider feeding after diaper change"
      };
    }

    return {
      type: "feed",
      suggestedTime: getCurrentTime(),
      reason: "Default suggestion based on baby's needs"
    };
  };

  const nextActivity = predictNextActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-5 w-5" />;
      case "nap": return <Moon className="h-5 w-5" />;
      case "diaper": return <Palette className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "feed": return "text-pink-600 bg-pink-50";
      case "nap": return "text-blue-600 bg-blue-50";
      case "diaper": return "text-amber-600 bg-amber-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-serif font-medium text-foreground">
          What's Next?
        </h3>
      </div>
      
      <div className={`flex items-center gap-4 p-4 rounded-lg ${getActivityColor(nextActivity.type)}`}>
        <div className="flex-shrink-0">
          {getActivityIcon(nextActivity.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground capitalize mb-1">
            {nextActivity.type}
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            Suggested time: {nextActivity.suggestedTime}
          </p>
          <p className="text-xs text-muted-foreground">
            {nextActivity.reason}
          </p>
        </div>
      </div>
    </div>
  );
};