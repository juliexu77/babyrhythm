import { useState } from "react";
import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, Palette, ChevronDown, ChevronUp } from "lucide-react";

interface NextActivityPredictionProps {
  activities: Activity[];
}

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    const totalMinutes = Math.round(timeInMinutes + minutes);
    const newTimeInMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(newTimeInMinutes / 60);
    const mins = Math.round(newTimeInMinutes % 60);
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
        type: "feed",
        anticipatedTime: undefined,
        confidence: 'low' as const,
        reason: "Gathering data to make predictions",
        details: {
          description: "Once enough activities are logged, intelligent predictions will appear here based on your baby's patterns.",
          data: [],
          calculation: "Minimum 2 activities of each type needed for pattern analysis"
        }
      };
    }

    // Calculate feed-to-feed intervals
    const feedIntervals: number[] = [];
    for (let i = 0; i < feedActivities.length - 1; i++) {
      const newer = getTimeInMinutes(feedActivities[i].time);
      const older = getTimeInMinutes(feedActivities[i + 1].time);
      let interval = newer - older;
      if (interval < 0) interval = (24 * 60) + interval;
      if (interval > 0 && interval < 12 * 60) {
        feedIntervals.push(interval);
      }
    }

    // Calculate sleep-to-sleep intervals
    const sleepIntervals: number[] = [];
    const sleepTimes: number[] = [];
    for (let i = 0; i < napActivities.length - 1; i++) {
      const newer = getTimeInMinutes(napActivities[i].time);
      const older = getTimeInMinutes(napActivities[i + 1].time);
      let interval = newer - older;
      if (interval < 0) interval = (24 * 60) + interval;
      if (interval > 0 && interval < 12 * 60) {
        sleepIntervals.push(interval);
      }
    }
    napActivities.forEach(nap => {
      sleepTimes.push(getTimeInMinutes(nap.time));
    });

    const lastActivity = activities[0];
    if (!lastActivity) {
      return {
        type: "feed",
        anticipatedTime: undefined,
        confidence: 'low' as const,
        reason: "Start your day with a feeding",
        details: {
          description: "No activities logged today yet. Typically, the day starts with a feeding.",
          data: [],
          calculation: "Based on general feeding patterns"
        }
      };
    }

    const lastActivityTime = getTimeInMinutes(lastActivity.time);
    let timeSinceLastActivity = currentMinutes - lastActivityTime;
    if (timeSinceLastActivity < 0) {
      timeSinceLastActivity = (24 * 60) + timeSinceLastActivity;
    }

    let nextFeedPrediction = null;
    let nextNapPrediction = null;

    // Calculate next feed prediction
    if (canPredictFeeds && feedIntervals.length > 0) {
      const lastFeed = feedActivities[0];
      const avgFeedInterval = feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length;
      const lastFeedTime = getTimeInMinutes(lastFeed.time);
      let timeSinceLastFeed = currentMinutes - lastFeedTime;
      if (timeSinceLastFeed < 0) timeSinceLastFeed += (24 * 60);
      
      if (timeSinceLastFeed >= avgFeedInterval - 60) {
        const anticipatedTime = addMinutesToTime(lastFeed.time, Math.round(avgFeedInterval));
        const hours = Math.round(avgFeedInterval / 60 * 10) / 10;
        nextFeedPrediction = {
          type: "feed",
          anticipatedTime,
          confidence: feedIntervals.length >= 5 ? 'high' : feedIntervals.length >= 3 ? 'medium' : 'low',
          reason: `Usually feeds every ${hours}h`,
          details: {
            description: `Based on ${feedIntervals.length} recent feeding intervals, your baby typically feeds every ${hours} hours.`,
            data: feedIntervals.map((interval, index) => ({
              activity: feedActivities[index],
              value: `${Math.round(interval / 60 * 10) / 10}h`,
              calculation: `Time between feeds`
            })),
            calculation: `Average: ${feedIntervals.map(i => Math.round(i / 60 * 10) / 10).join(' + ')} ÷ ${feedIntervals.length} = ${hours}h`
          }
        };
      }
    }

    // Calculate next nap prediction
    if (canPredictNaps) {
      if (sleepIntervals.length > 0) {
        const lastNap = napActivities[0];
        const avgSleepInterval = sleepIntervals.reduce((a, b) => a + b, 0) / sleepIntervals.length;
        const lastNapTime = getTimeInMinutes(lastNap.time);
        let timeSinceLastNap = currentMinutes - lastNapTime;
        if (timeSinceLastNap < 0) timeSinceLastNap += (24 * 60);
        
        if (timeSinceLastNap >= avgSleepInterval - 60) {
          const anticipatedTime = addMinutesToTime(lastNap.time, Math.round(avgSleepInterval));
          const hours = Math.round(avgSleepInterval / 60 * 10) / 10;
          nextNapPrediction = {
            type: "nap",
            anticipatedTime,
            confidence: sleepIntervals.length >= 5 ? 'high' : sleepIntervals.length >= 3 ? 'medium' : 'low',
            reason: `Usually naps every ${hours}h`,
            details: {
              description: `Based on ${sleepIntervals.length} recent sleep intervals, your baby typically naps every ${hours} hours.`,
              data: sleepIntervals.map((interval, index) => ({
                activity: napActivities[index],
                value: `${Math.round(interval / 60 * 10) / 10}h`,
                calculation: `Time between naps`
              })),
              calculation: `Average: ${sleepIntervals.map(i => Math.round(i / 60 * 10) / 10).join(' + ')} ÷ ${sleepIntervals.length} = ${hours}h`
            }
          };
        }
      }
      
      // Time-of-day nap prediction
      if (!nextNapPrediction && sleepTimes.length > 0) {
        const lastNap = napActivities[0];
        const lastNapTime = getTimeInMinutes(lastNap.time);
        let timeSinceLastNap = currentMinutes - lastNapTime;
        if (timeSinceLastNap < 0) timeSinceLastNap += (24 * 60);
        
        if (timeSinceLastNap >= 120) {
          const currentHour = Math.floor(currentMinutes / 60);
          const isTypicalNapTime = sleepTimes.some(sleepTime => {
            const sleepHour = Math.floor(sleepTime / 60);
            return Math.abs(currentHour - sleepHour) <= 1;
          });
          
          if (isTypicalNapTime) {
            const candidateTimes = sleepTimes.filter(sleepTime => {
              const sleepHour = Math.floor(sleepTime / 60);
              return Math.abs(currentHour - sleepHour) <= 1;
            });
            const typicalMinutes = Math.round(candidateTimes.reduce((a, b) => a + b, 0) / candidateTimes.length);
            const delta = ((typicalMinutes - currentMinutes) % (24 * 60) + (24 * 60)) % (24 * 60);
            const safeDelta = delta === 0 ? 30 : Math.round(delta);
            const anticipatedTime = addMinutesToTime(currentTime, safeDelta);
            nextNapPrediction = {
              type: "nap",
              anticipatedTime,
              confidence: 'medium' as const,
              reason: "Typical sleep time approaching",
              details: {
                description: "Based on historical nap times, this is typically when your baby sleeps.",
                data: candidateTimes.map((time, index) => {
                  const h = Math.floor(time / 60);
                  const m = time % 60;
                  const timeStr = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                  return {
                    activity: napActivities[index],
                    value: timeStr,
                    calculation: "Historical nap time"
                  };
                }),
                calculation: "Pattern matches current time window"
              }
            };
          }
        }
      }
    }

    // Return earliest prediction
    if (nextFeedPrediction && nextNapPrediction) {
      const feedTime = getTimeInMinutes(nextFeedPrediction.anticipatedTime);
      const napTime = getTimeInMinutes(nextNapPrediction.anticipatedTime);
      
      const adjustedFeedTime = feedTime < currentMinutes ? feedTime + (24 * 60) : feedTime;
      const adjustedNapTime = napTime < currentMinutes ? napTime + (24 * 60) : napTime;
      
      return adjustedFeedTime <= adjustedNapTime ? nextFeedPrediction : nextNapPrediction;
    }

    if (nextFeedPrediction) return nextFeedPrediction;
    if (nextNapPrediction) return nextNapPrediction;

    // Fallback predictions
    if (lastActivity.type === "nap") {
      return {
        type: "feed",
        anticipatedTime: undefined,
        confidence: 'medium' as const,
        reason: "Feeding typically follows sleep",
        details: {
          description: "Your baby just woke up from a nap. Feeding usually comes next in a healthy routine.",
          data: [{ activity: lastActivity, value: lastActivity.time, calculation: "Last activity was sleep" }],
          calculation: "Based on typical sleep-feed cycles"
        }
      };
    }

    return {
      type: "nap",
      anticipatedTime: undefined,
      confidence: 'medium' as const,
      reason: "Consider sleep time after feeding",
      details: {
        description: "After a feeding, babies often need some time to settle before their next sleep period.",
        data: [{ activity: lastActivity, value: lastActivity.time, calculation: "Last activity was feeding" }],
        calculation: "Based on typical feed-sleep cycles"
      }
    };
  };

  const nextActivity = predictNextActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return Baby;
      case "nap": return Moon;
      case "diaper": return Palette;
      default: return Clock;
    }
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-blue-600';
      case 'low': return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const IconComponent = getActivityIcon(nextActivity.type);

  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-sans font-medium text-foreground dark:font-bold">
            Next Predicted Action
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-accent rounded-md transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-accent/50">
            <IconComponent className={`h-4 w-4 ${getConfidenceColor(nextActivity.confidence)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground capitalize">
                {nextActivity.type}
              </h4>
              {nextActivity.anticipatedTime && (
                <span className="text-sm text-muted-foreground">
                  around {nextActivity.anticipatedTime}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {nextActivity.reason}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="pt-3 border-t border-border">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {nextActivity.details.description}
              </p>
              
               {nextActivity.details.data.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recent Data
                  </h5>
                  <div className="space-y-1">
                    {nextActivity.details.data.slice(0, 3).map((dataPoint, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">
                          Time between {nextActivity.type}s
                        </span>
                        <span className="font-medium">
                          {dataPoint.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};