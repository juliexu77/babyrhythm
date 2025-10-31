import { useState } from "react";
import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BabyCarePredictionEngine } from "@/utils/predictionEngine";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NextActivityPredictionProps {
  activities: Activity[];
  ongoingNap?: Activity | null;
  onMarkWakeUp?: () => void;
  babyName?: string;
  onLogPredictedActivity?: (type: 'feed' | 'nap') => void;
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

export const NextActivityPrediction = ({ activities, ongoingNap, onMarkWakeUp, babyName, onLogPredictedActivity }: NextActivityPredictionProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const { household } = useHousehold();
  
  // Use the new prediction engine but adapt to old UI format
  const predictNextActivity = () => {
    // Check minimum data requirements first
    const naps = activities.filter(a => a.type === 'nap');
    const feeds = activities.filter(a => a.type === 'feed');
    
    if (activities.length === 0 || naps.length < 4 || feeds.length < 4) {
      return null;
    }
    
    const engine = new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined);
    const prediction = engine.getNextAction();
    
    console.log('🔮 Prediction result:', {
      action: prediction.intent,
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
    let reason: string;
    let details: any;

    // Map new actions to old types
    if (prediction.intent === "FEED_SOON") {
      type = "feed";
      // Use actual predicted feed time if available
      if (prediction.timing.nextFeedAt) {
        const feedTime = prediction.timing.nextFeedAt;
        const hours = feedTime.getHours();
        const minutes = feedTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        anticipatedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      const hours = Math.floor((prediction.rationale.t_since_last_feed_min || 0) / 60);
      const mins = (prediction.rationale.t_since_last_feed_min || 0) % 60;
      reason = `${t('lastFed')} ${hours}h ${mins}m ${t('ago')}`;
    } else if (prediction.intent === "START_WIND_DOWN") {
      type = "nap";
      // Use actual predicted nap window time if available
      if (prediction.timing.nextNapWindowStart) {
        const napTime = prediction.timing.nextNapWindowStart;
        const hours = napTime.getHours();
        const minutes = napTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        anticipatedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      const totalMins = prediction.rationale.t_awake_now_min || 0;
      const awakeHours = Math.floor(totalMins / 60);
      const awakeMins = Math.round(totalMins % 60);
      reason = `${t('wakeWindow')} (~${awakeHours}h ${awakeMins}m ${t('awake')})`;
    } else if (prediction.intent === "LET_SLEEP_CONTINUE") {
      type = "nap";
      // When sleeping, show predicted wake time if available
      if (prediction.timing.nextWakeAt) {
        const wakeTime = prediction.timing.nextWakeAt;
        const hours = wakeTime.getHours();
        const minutes = wakeTime.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        anticipatedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
        reason = `${t('currentlySleeping')} — may wake around ${anticipatedTime}`;
      } else {
        anticipatedTime = undefined;
        reason = t('currentlySleeping');
      }
    } else {
      // INDEPENDENT_TIME or HOLD - default to feed
      type = "feed";
      anticipatedTime = addMinutesToTime(currentTime, prediction.reevaluate_in_minutes * 2);
      reason = t('continueCurrentActivity');
    }

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
      calculation: `${prediction.intent} with ${prediction.confidence} confidence`
    };

    return { type, anticipatedTime, confidence: prediction.confidence, reason, details };
  };

  const prediction = predictNextActivity();
  
  // Check if we have minimal data for placeholder vs empty state
  const hasAnyData = activities && activities.length > 0;
  const hasMinimalData = activities && (
    activities.filter(a => a.type === 'feed').length >= 1 ||
    activities.filter(a => a.type === 'nap').length >= 1
  );
  
  // Empty state - no data yet
  if (!hasAnyData) {
    return (
      <Card className="bg-card border border-border/40 p-6 rounded-2xl">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-primary/10 rounded-full">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              AI predictions will appear here
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              <span className="font-medium">Example:</span> "Next feed likely around 1:15 PM"
              <br />
              <span className="text-xs opacity-80 mt-2 block">
                Our AI learns your baby's unique patterns and predicts their next need with increasing accuracy.
              </span>
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              🤖 AI-powered predictions personalized to your baby's rhythm
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Placeholder state - minimal data, show generalized prediction
  if (!prediction && hasMinimalData && babyName) {
    const avgNapInterval = 150; // 2.5 hours default
    const now = new Date();
    const predictedTime = new Date(now.getTime() + avgNapInterval * 60 * 1000);
    const timeStr = predictedTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    return (
      <Card className="bg-card border border-border/40 p-4 rounded-2xl animate-in fade-in duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Moon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {t('nextActivity')}
              </h3>
            </div>
            
            <div className="space-y-2">
              <p className="text-base text-foreground font-medium leading-relaxed">
                Most babies this age nap about every 2½ hours. Next nap around {timeStr}.
              </p>
              
              {isExpanded && (
                <div className="pt-3 mt-3 border-t border-border/40">
                  <p className="text-sm text-muted-foreground">
                    Our AI refines predictions as it learns your baby's unique patterns.
                  </p>
                  <div className="mt-2 flex items-start gap-2">
                    <span className="text-xs text-muted-foreground/80">
                      🤖 AI-powered prediction
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // No prediction and not enough data
  if (!prediction) {
    return null;
  }
  
  const engine = new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined);
  const fullPrediction = engine.getNextAction();
  const hasActionablePrediction = (
    fullPrediction.intent === "FEED_SOON" || fullPrediction.intent === "START_WIND_DOWN"
  ) && (fullPrediction.confidence === "high" || fullPrediction.confidence === "medium");

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
      
      if (currentPrediction.intent === 'LET_SLEEP_CONTINUE') {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-base text-foreground">What's Next</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-3">
        {/* Prediction text with icon - always visible */}
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm">{getPredictionText()}</span>
        </div>

        {/* Wake up button */}
        {ongoingNap && onMarkWakeUp && (
          <Button
            onClick={onMarkWakeUp}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {(babyName || 'Baby') + ' woke up'}
          </Button>
        )}
        
        {/* Log predicted activity button */}
        {onLogPredictedActivity && !ongoingNap && hasActionablePrediction && (
          <Button
            size="lg"
            onClick={() => onLogPredictedActivity(prediction.type)}
            className="w-full"
          >
            {prediction.type === 'feed' 
              ? t('logFeedNow') 
              : `${babyName || 'Baby'} fell asleep`}
          </Button>
        )}
      </div>
    </div>
  );
};
