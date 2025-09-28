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

    // Calculate both next feed and next nap predictions, then pick the earliest
    console.log("=== PREDICTION DEBUG ===");
    console.log("Current time:", currentTime, "Minutes:", currentMinutes);
    console.log("Feed activities:", feedActivities.length, "Nap activities:", napActivities.length);
    console.log("Can predict feeds:", canPredictFeeds, "Can predict naps:", canPredictNaps);
    console.log("Last activity:", lastActivity);
    
    let nextFeedPrediction = null;
    let nextNapPrediction = null;

    // Calculate next feed prediction based on feed-to-feed patterns
    if (canPredictFeeds && feedIntervals.length > 0) {
      const lastFeed = feedActivities[0]; // Most recent feed
      const avgFeedInterval = feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length;
      const lastFeedTime = getTimeInMinutes(lastFeed.time);
      let timeSinceLastFeed = currentMinutes - lastFeedTime;
      if (timeSinceLastFeed < 0) timeSinceLastFeed += (24 * 60);
      
      // Only predict if we're approaching the next feed time (within 1 hour early)
      console.log("Feed check - Time since last feed:", timeSinceLastFeed, "minutes, Avg interval:", avgFeedInterval);
      if (timeSinceLastFeed >= avgFeedInterval - 60) {
        const anticipatedTime = addMinutesToTime(lastFeed.time, avgFeedInterval);
        console.log("Creating feed prediction for:", anticipatedTime);
        nextFeedPrediction = {
          type: "feed",
          anticipatedTime,
          reason: `Next feeding due based on feed pattern (avg ${Math.round(avgFeedInterval / 60 * 10) / 10}h)`
        };
      }
    }

    // Calculate next nap prediction based on sleep patterns
    if (canPredictNaps) {
      // Method 1: Sleep-to-sleep interval prediction
      if (sleepIntervals.length > 0) {
        const lastNap = napActivities[0]; // Most recent nap
        const avgSleepInterval = sleepIntervals.reduce((a, b) => a + b, 0) / sleepIntervals.length;
        const lastNapTime = getTimeInMinutes(lastNap.time);
        let timeSinceLastNap = currentMinutes - lastNapTime;
        if (timeSinceLastNap < 0) timeSinceLastNap += (24 * 60);
        
        // Only predict if we're approaching the next nap time (within 1 hour early)
        console.log("Nap check - Time since last nap:", timeSinceLastNap, "minutes, Avg interval:", avgSleepInterval);
        if (timeSinceLastNap >= avgSleepInterval - 60) {
          const anticipatedTime = addMinutesToTime(lastNap.time, avgSleepInterval);
          console.log("Creating nap prediction for:", anticipatedTime);
          nextNapPrediction = {
            type: "nap",
            anticipatedTime,
            reason: `Next nap due based on sleep pattern (avg ${Math.round(avgSleepInterval / 60 * 10) / 10}h)`
          };
        }
      }
      
      // Method 2: Time-of-day nap prediction (if no interval prediction and it's typical nap time)
      // BUT only if it's been at least 2 hours since the last nap (prevents suggesting nap right after one)
      if (!nextNapPrediction && sleepTimes.length > 0) {
        const lastNap = napActivities[0];
        const lastNapTime = getTimeInMinutes(lastNap.time);
        let timeSinceLastNap = currentMinutes - lastNapTime;
        if (timeSinceLastNap < 0) timeSinceLastNap += (24 * 60);
        
        console.log("Time-of-day nap check - Time since last nap:", timeSinceLastNap, "minutes");
        
        // Only suggest time-of-day nap if it's been at least 2 hours (120 minutes) since last nap
        if (timeSinceLastNap >= 120) {
          const currentHour = Math.floor(currentMinutes / 60);
          const isTypicalNapTime = sleepTimes.some(sleepTime => {
            const sleepHour = Math.floor(sleepTime / 60);
            return Math.abs(currentHour - sleepHour) <= 1; // Within 1 hour
          });
          
          if (isTypicalNapTime) {
            console.log("Creating time-of-day nap prediction");
            nextNapPrediction = {
              type: "nap",
              anticipatedTime: currentTime,
              reason: "Typical nap time based on historical patterns"
            };
          }
        } else {
          console.log("Skipping time-of-day nap - too soon after last nap");
        }
      }
    }

    console.log("Final predictions - Feed:", nextFeedPrediction, "Nap:", nextNapPrediction);
    if (nextFeedPrediction && nextNapPrediction) {
      const feedTime = getTimeInMinutes(nextFeedPrediction.anticipatedTime);
      const napTime = getTimeInMinutes(nextNapPrediction.anticipatedTime);
      
      // Adjust for next-day times (if anticipated time is earlier in day than current time)
      const adjustedFeedTime = feedTime < currentMinutes ? feedTime + (24 * 60) : feedTime;
      const adjustedNapTime = napTime < currentMinutes ? napTime + (24 * 60) : napTime;
      
      if (adjustedFeedTime <= adjustedNapTime) {
        return {
          type: nextFeedPrediction.type,
          suggestedTime: nextFeedPrediction.anticipatedTime,
          anticipatedTime: nextFeedPrediction.anticipatedTime,
          reason: nextFeedPrediction.reason
        };
      } else {
        return {
          type: nextNapPrediction.type,
          suggestedTime: nextNapPrediction.anticipatedTime,
          anticipatedTime: nextNapPrediction.anticipatedTime,
          reason: nextNapPrediction.reason
        };
      }
    }

    // Return single prediction if only one is available
    if (nextFeedPrediction) {
      return {
        type: nextFeedPrediction.type,
        suggestedTime: nextFeedPrediction.anticipatedTime,
        anticipatedTime: nextFeedPrediction.anticipatedTime,
        reason: nextFeedPrediction.reason
      };
    }

    if (nextNapPrediction) {
      return {
        type: nextNapPrediction.type,
        suggestedTime: nextNapPrediction.anticipatedTime,
        anticipatedTime: nextNapPrediction.anticipatedTime,
        reason: nextNapPrediction.reason
      };
    }

    // Fallback based on last activity when no patterns are established
    if (lastActivity.type === "nap") {
      return {
        type: "feed",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Feeding typically follows after sleep"
      };
    }

    if (lastActivity.type === "feed") {
      return {
        type: "nap",
        suggestedTime: currentTime,
        anticipatedTime: currentTime,
        reason: "Consider nap time after feeding"
      };
    }

    // Final fallback
    return {
      type: "feed",
      suggestedTime: currentTime,
      anticipatedTime: currentTime,
      reason: "Next activity likely to be feeding"
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