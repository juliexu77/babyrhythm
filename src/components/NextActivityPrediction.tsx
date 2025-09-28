import { useState } from "react";
import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, Palette, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NextActivityPredictionProps {
  activities: Activity[];
}

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
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
    const feedActivities = activities.filter(a => a.type === "feed");
    const napActivities = activities.filter(a => a.type === "nap");
    
    const canPredictFeeds = feedActivities.length >= 2;
    const canPredictNaps = napActivities.length >= 2;
    
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

    // Calculate feed-to-feed intervals (activities are already sorted newest first)
    const feedIntervals: number[] = [];
    for (let i = 0; i < feedActivities.length - 1; i++) {
      const newer = getTimeInMinutes(feedActivities[i].time);
      const older = getTimeInMinutes(feedActivities[i + 1].time);
      // Handle day rollover by using the smaller of the two possible intervals
      let interval = newer - older;
      if (interval < 0) interval = (24 * 60) + interval; // Wrap around day
      if (interval > 0 && interval < 12 * 60) { // Reasonable interval (less than 12 hours)
        feedIntervals.push(interval);
      }
    }

    // Calculate sleep-to-sleep intervals and analyze time-of-day patterns
    const sleepIntervals: number[] = [];
    const sleepTimes: number[] = [];
    for (let i = 0; i < napActivities.length - 1; i++) {
      const newer = getTimeInMinutes(napActivities[i].time);
      const older = getTimeInMinutes(napActivities[i + 1].time);
      // Handle day rollover
      let interval = newer - older;
      if (interval < 0) interval = (24 * 60) + interval;
      if (interval > 0 && interval < 12 * 60) { // Reasonable interval
        sleepIntervals.push(interval);
      }
    }
    // Collect all nap times for time-of-day pattern analysis
    napActivities.forEach(nap => {
      sleepTimes.push(getTimeInMinutes(nap.time));
    });

    // Get the last activity
    const lastActivity = activities[0]; // Most recent
    if (!lastActivity) {
      return {
        type: "feed",
        suggestedTime: getCurrentTime(),
        anticipatedTime: getCurrentTime(),
        reason: "No activities logged today yet"
      };
    }

    const lastActivityTime = getTimeInMinutes(lastActivity.time);
    let timeSinceLastActivity = currentMinutes - lastActivityTime;
    // Handle day rollover (if current time is earlier in day than last activity)
    if (timeSinceLastActivity < 0) {
      timeSinceLastActivity = (24 * 60) + timeSinceLastActivity;
    }

    // Predict next feed based on feed-to-feed patterns
    if (lastActivity.type === "feed" && canPredictFeeds) {
      const avgFeedInterval = feedIntervals.length > 0 
        ? feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length 
        : 180; // Default 3 hours
      
      if (timeSinceLastActivity >= avgFeedInterval - 30) {
        const anticipatedTime = addMinutesToTime(lastActivity.time, avgFeedInterval);
        return {
          type: "feed",
          suggestedTime: currentTime,
          anticipatedTime,
          reason: `Next feeding due based on feed-to-feed pattern (avg ${Math.round(avgFeedInterval / 60 * 10) / 10}h)`
        };
      }
    }

    // If last activity was a nap, typically suggest feeding next
    if (lastActivity.type === "nap" && canPredictFeeds) {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Feeding typically follows after sleep"
      };
    }

    // Predict next sleep based on sleep-to-sleep patterns and time-of-day
    if (lastActivity.type === "nap" && canPredictNaps) {
      const avgSleepInterval = sleepIntervals.length > 0
        ? sleepIntervals.reduce((a, b) => a + b, 0) / sleepIntervals.length
        : 180; // Default 3 hours

      // Consider time-of-day patterns for sleep
      const currentHour = Math.floor(currentMinutes / 60);
      const isNapTime = sleepTimes.some(sleepTime => {
        const sleepHour = Math.floor(sleepTime / 60);
        return Math.abs(currentHour - sleepHour) <= 1; // Within 1 hour of historical nap times
      });

      if (timeSinceLastActivity >= avgSleepInterval - 30 || isNapTime) {
        const anticipatedTime = addMinutesToTime(lastActivity.time, avgSleepInterval);
        const timeReason = isNapTime ? "typical nap time" : "sleep-to-sleep pattern";
        return {
          type: "nap",
          suggestedTime: currentTime,
          anticipatedTime,
          reason: `Next nap due based on ${timeReason} (avg ${Math.round(avgSleepInterval / 60 * 10) / 10}h)`
        };
      }
    }

    // Fallback to feed prediction if we have feed data
    if (canPredictFeeds) {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Next activity likely to be feeding"
      };
    }

    return {
      type: "feed",
      suggestedTime: currentTime,
      anticipatedTime: currentTime,
      reason: "Default suggestion - keep logging for better predictions"
    };
  };

const nextActivity = predictNextActivity();
const [open, setOpen] = useState(false);

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
  <div className="bg-card rounded-xl p-4 shadow-card border border-border">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-base font-serif font-medium text-foreground">
          Next Predicted Action
        </h3>
      </div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-1 hover:bg-accent rounded-md transition-colors"
        aria-label={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
    
    {isCollapsed ? (
      // Collapsed state - single line
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {nextActivity.type === "insufficient_data" ? <Clock className="h-4 w-4" /> : getActivityIcon(nextActivity.type)}
          <span className="font-medium capitalize">
            {nextActivity.type === "insufficient_data" ? "Gathering Data" : nextActivity.type}
          </span>
          {nextActivity.type !== "insufficient_data" && (
            <span className="text-muted-foreground">
              at {nextActivity.suggestedTime}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    ) : (
      // Expanded state - full card
      <div
        className={`flex items-center gap-3 p-3 rounded-lg ${getActivityColor(nextActivity.type)} cursor-pointer`}
        onClick={() => setOpen(true)}
        role="button"
        aria-label="See why this prediction was made"
      >
        <div className="flex-shrink-0">
          {nextActivity.type === "insufficient_data" ? <Clock className="h-4 w-4" /> : getActivityIcon(nextActivity.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground capitalize mb-0.5">
            {nextActivity.type === "insufficient_data" ? "Gathering Data" : nextActivity.type}
          </h4>
          {nextActivity.type !== "insufficient_data" && (
            <>
              <p className="text-sm text-muted-foreground mb-0.5">
                Suggested time: {nextActivity.suggestedTime}
              </p>
              {nextActivity.anticipatedTime && nextActivity.anticipatedTime !== nextActivity.suggestedTime && (
                <p className="text-sm text-muted-foreground mb-1">
                  Anticipated: {nextActivity.anticipatedTime}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {nextActivity.reason}
          </p>
        </div>
        <Info className="h-4 w-4 opacity-70" />
      </div>
    )}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why this prediction?</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>{nextActivity.reason}</p>
          <p>
            We analyze recent feeds and naps to estimate average intervals and suggest the most likely next action and time. The more data you log, the more accurate it gets.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
};