import { useState } from "react";
import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BabyCarePredictionEngine } from "@/utils/predictionEngine";
import { useHousehold } from "@/hooks/useHousehold";

interface NextActivityPredictionProps {
  activities: Activity[];
}

// Keep the original time utility functions for UI compatibility
const getCurrentTime = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const getTimeInMinutes = (timeString: string): number => {
  const startTime = timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
  const [time, period] = startTime.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = (hours % 12) * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes = minutes;
  return totalMinutes;
};

const addMinutesToTime = (timeString: string, minutes: number): string => {
  const timeInMinutes = getTimeInMinutes(timeString);
  let totalMinutes = timeInMinutes + minutes;
  
  while (totalMinutes < 0) {
    totalMinutes += (24 * 60);
  }
  totalMinutes = totalMinutes % (24 * 60);
  
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const { household } = useHousehold();
  
  // Use the new prediction engine but adapt to old UI format
  const predictNextActivity = () => {
    console.log('🚀 NextActivityPrediction called with activities:', activities.length);
    console.log('📊 Sample activities:', activities.slice(0, 2).map(a => ({
      type: a.type,
      time: a.time,
      loggedAt: a.loggedAt,
      details: a.details
    })));
    
    const engine = new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined);
    const prediction = engine.getNextAction();
    
    console.log('🔮 Prediction result:', {
      action: prediction.next_action,
      confidence: prediction.confidence,
      rationale: {
        feedMinutes: prediction.rationale.t_since_last_feed_min,
        awakeMinutes: prediction.rationale.t_awake_now_min,
        daySleep: prediction.rationale.cumulative_day_sleep_min,
        scores: prediction.rationale.scores
      }
    });
    
    const currentTime = getCurrentTime();
    
    // Convert the new prediction format to the old UI format
    let type: "feed" | "nap";
    let anticipatedTime: string | undefined;
    let confidence: "high" | "medium" | "low";
    let reason: string;
    let details: any;

    // Map new actions to old types
    if (prediction.next_action === "FEED_NOW") {
      type = "feed";
      anticipatedTime = addMinutesToTime(currentTime, prediction.reevaluate_in_minutes);
      const hours = Math.floor((prediction.rationale.t_since_last_feed_min || 0) / 60);
      const mins = (prediction.rationale.t_since_last_feed_min || 0) % 60;
      reason = `${t('lastFed')} ${hours}h ${mins}m ${t('ago')}`;
    } else if (prediction.next_action === "START_WIND_DOWN") {
      type = "nap";
      anticipatedTime = addMinutesToTime(currentTime, prediction.reevaluate_in_minutes);
      const totalMins = prediction.rationale.t_awake_now_min || 0;
      const awakeHours = Math.floor(totalMins / 60);
      const awakeMins = Math.round(totalMins % 60);
      reason = `${t('wakeWindow')} (~${awakeHours}h ${awakeMins}m ${t('awake')})`;
    } else if (prediction.next_action === "LET_SLEEP_CONTINUE") {
      type = "nap";
      anticipatedTime = undefined;
      reason = t('currentlySleeping');
    } else {
      // INDEPENDENT_TIME or HOLD - default to feed
      type = "feed";
      anticipatedTime = addMinutesToTime(currentTime, prediction.reevaluate_in_minutes * 2);
      reason = t('continueCurrentActivity');
    }

    // Map confidence scores
    if (prediction.confidence >= 0.8) confidence = "high";
    else if (prediction.confidence >= 0.6) confidence = "medium";
    else confidence = "low";

    // Create details object for expanded view
    const rationale = prediction.rationale;
    details = {
      description: `Based on recent patterns and current state`,
      data: [
        {
          activity: { type: "analysis", time: currentTime },
          value: `Feed pressure: ${Math.round(rationale.scores.feed * 100)}%`,
          calculation: "Based on time since last feed and patterns"
        },
        {
          activity: { type: "analysis", time: currentTime },
          value: `Sleep pressure: ${Math.round(rationale.scores.sleep * 100)}%`,
          calculation: "Based on wake windows and sleep needs"
        },
        {
          activity: { type: "analysis", time: currentTime },
          value: `Day sleep: ${Math.round(rationale.cumulative_day_sleep_min / 60 * 10) / 10}h`,
          calculation: `Target: ${Math.round(rationale.day_sleep_target_min / 60 * 10) / 10}h`
        }
      ],
      calculation: `${prediction.next_action} with ${Math.round(prediction.confidence * 100)}% confidence`
    };

    return { type, anticipatedTime, confidence, reason, details };
  };

  const prediction = predictNextActivity();

  const getIcon = (type: string) => {
    switch (type) {
      case "feed":
        return <Baby className="h-5 w-5" style={{ color: "hsl(var(--feed-color))" }} />;
      case "nap":
        return <Moon className="h-5 w-5" style={{ color: "hsl(var(--nap-color))" }} />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPredictionText = () => {
    if (prediction.anticipatedTime) {
      const prefix = prediction.type === "feed" ? t('feedingAround') : t('napAround');
      return `${prefix} ${prediction.anticipatedTime}`;
    }
    
    // For sleeping babies, show what's likely next after they wake up
    if (prediction.reason === t('currentlySleeping')) {
      const engine = new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined);
      const currentPrediction = engine.getNextAction();
      
      if (currentPrediction.next_action === 'LET_SLEEP_CONTINUE') {
        // Determine what's likely next based on rationale
        const feedScore = currentPrediction.rationale.scores.feed;
        const sleepScore = currentPrediction.rationale.scores.sleep;
        
        if (feedScore > sleepScore) {
          return t('likelyFeedingWhenWakesUp');
        } else {
          return t('mayNeedAnotherNap');
        }
      }
    }
    
    return prediction.type === "feed" ? t('considerFeeding') : t('watchForSleepyCues');
  };

  return (
    <div className="next-action-card bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-lg text-foreground">{t('nextPredictedAction')}</h3>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            {getIcon(prediction.type)}
            <span className="font-medium text-foreground">{getPredictionText()}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{prediction.reason}</p>
          
        </div>
      )}
    </div>
  );
};