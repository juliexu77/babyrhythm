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

  const addMinutesToTime = (timeString: string, minutes: number) => {
    const timeInMinutes = getTimeInMinutes(timeString);
    const newTimeInMinutes = (timeInMinutes + minutes) % (24 * 60);
    const hours = Math.floor(newTimeInMinutes / 60);
    const mins = newTimeInMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const predictNextActivity = () => {
    const currentTime = getCurrentTime();
    const currentMinutes = getTimeInMinutes(currentTime);
    
    // Check if we have minimum required data for predictions
    const feedCount = activities.filter(a => a.type === "feed").length;
    const napCount = activities.filter(a => a.type === "nap").length;
    
    // Check if we have enough data for any predictions
    const canPredictFeeds = feedCount >= 2;
    const canPredictNaps = napCount >= 3;
    
    if (!canPredictFeeds && !canPredictNaps) {
      return {
        type: "insufficient_data",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Once enough activities are logged, predictions will appear here."
      };
    }
    
    if (activities.length === 0) {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
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
        anticipatedTime: getCurrentTime(),
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
        anticipatedTime: getCurrentTime(),
        reason: "No activities logged today yet"
      };
    }

    const lastActivityTime = getTimeInMinutes(lastActivity.time);
    const currentTimeMinutes = getTimeInMinutes(getCurrentTime());
    const timeSinceLastActivity = currentTimeMinutes - lastActivityTime;

    // Predict based on patterns and available data
    if (lastActivity.type === "feed") {
      // Average time between feeds (only if we can predict feeds)
      if (canPredictFeeds) {
        const avgFeedInterval = feedIntervals.length > 0 
          ? feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length 
          : 180; // Default 3 hours
        
        if (timeSinceLastActivity >= avgFeedInterval - 30) {
          const anticipatedTime = addMinutesToTime(lastActivity.time, avgFeedInterval);
          const anticipatedMinutes = getTimeInMinutes(anticipatedTime);
          
          // Only suggest if anticipated time is in the future
          if (anticipatedMinutes > currentMinutes) {
            return {
              type: "feed",
              suggestedTime: currentTime,
              anticipatedTime,
              reason: `Next feeding typically due (avg ${Math.round(avgFeedInterval / 60 * 10) / 10}h between feeds)`
            };
          }
        }
      }
      
      // Average time from feed to nap (only if we can predict naps)
      if (canPredictNaps) {
        const avgFeedToNap = napIntervals.length > 0
          ? napIntervals.reduce((a, b) => a + b, 0) / napIntervals.length
          : 60; // Default 1 hour

        if (timeSinceLastActivity >= avgFeedToNap - 15) {
          const anticipatedTime = addMinutesToTime(lastActivity.time, avgFeedToNap);
          const anticipatedMinutes = getTimeInMinutes(anticipatedTime);
          
          // Only suggest if anticipated time is in the future
          if (anticipatedMinutes > currentMinutes) {
            return {
              type: "nap",
              suggestedTime: currentTime,
              anticipatedTime,
              reason: `Based on yesterday's pattern, nap usually comes ${Math.round(avgFeedToNap / 60 * 10) / 10}h after feeding`
            };
          }
        }
      }
    }

    if (lastActivity.type === "nap") {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Feeding usually follows after nap time"
      };
    }

    if (lastActivity.type === "diaper") {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Consider feeding after diaper change"
      };
    }

    return {
      type: "feed",
      suggestedTime: currentTime,
      anticipatedTime: currentTime,
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
      case "insufficient_data": return "text-muted-foreground bg-muted/30";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-serif font-medium text-foreground">
          Next Action
        </h3>
      </div>
      
      <div className={`flex items-center gap-4 p-4 rounded-lg ${getActivityColor(nextActivity.type)}`}>
        <div className="flex-shrink-0">
          {nextActivity.type === "insufficient_data" ? <Clock className="h-5 w-5" /> : getActivityIcon(nextActivity.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground capitalize mb-1">
            {nextActivity.type === "insufficient_data" ? "Gathering Data" : nextActivity.type}
          </h4>
          {nextActivity.type !== "insufficient_data" && (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Suggested time: {nextActivity.suggestedTime}
              </p>
              {nextActivity.anticipatedTime && nextActivity.anticipatedTime !== nextActivity.suggestedTime && (
                <p className="text-sm text-muted-foreground mb-2">
                  Anticipated: {nextActivity.anticipatedTime}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {nextActivity.reason}
          </p>
        </div>
      </div>
    </div>
  );
};