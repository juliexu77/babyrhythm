import { useState } from "react";
import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, Utensils, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BabyCarePredictionEngine } from "@/utils/predictionEngine";
import { useHousehold } from "@/hooks/useHousehold";

interface NextActivityPredictionProps {
  activities: Activity[];
}

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const { household } = useHousehold();
  
  const engine = new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined);
  const prediction = engine.getNextAction();

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "FEED_NOW":
        return <Utensils className="h-5 w-5 text-blue-600" />;
      case "START_WIND_DOWN":
        return <Moon className="h-5 w-5 text-purple-600" />;
      case "INDEPENDENT_TIME":
        return <Play className="h-5 w-5 text-green-600" />;
      case "LET_SLEEP_CONTINUE":
        return <Baby className="h-5 w-5 text-indigo-600" />;
      case "HOLD":
        return <Pause className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "FEED_NOW":
        return "Time to Feed";
      case "START_WIND_DOWN":
        return "Start Nap Routine";
      case "INDEPENDENT_TIME":
        return "Quiet Play Time";
      case "LET_SLEEP_CONTINUE":
        return "Keep Sleeping";
      case "HOLD":
        return "Wait & Monitor";
      default:
        return "Check Back Soon";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-orange-600 bg-orange-50";
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return "Unknown";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getReasonText = () => {
    const { rationale } = prediction;
    const parts = [];
    
    if (rationale.t_since_last_feed_min) {
      parts.push(`${formatDuration(rationale.t_since_last_feed_min)} since last feed`);
    }
    
    if (rationale.t_awake_now_min) {
      parts.push(`awake for ${formatDuration(rationale.t_awake_now_min)}`);
    } else if (prediction.next_action === "LET_SLEEP_CONTINUE") {
      parts.push("currently sleeping");
    }
    
    if (rationale.flags.cluster_feeding) {
      parts.push("cluster feeding detected");
    }
    
    if (rationale.flags.short_nap) {
      parts.push("recovering from short nap");
    }
    
    if (rationale.flags.data_gap) {
      parts.push("limited recent data");
    }

    return parts.join(" • ") || "Based on current patterns";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getActivityIcon(prediction.next_action)}
          <div>
            <h3 className="font-semibold text-lg">
              {getActionText(prediction.next_action)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {prediction.rationale.night_or_day === 'night' ? '🌙 Night time' : '☀️ Day time'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
            {Math.round(prediction.confidence * 100)}% confidence
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm text-muted-foreground">{getReasonText()}</p>
        
        {isExpanded && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Prediction Details:</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Feed Pressure: {Math.round(prediction.rationale.scores.feed * 100)}%</p>
              <p>• Sleep Pressure: {Math.round(prediction.rationale.scores.sleep * 100)}%</p>
              <p>• Day Sleep: {formatDuration(prediction.rationale.cumulative_day_sleep_min)} of {formatDuration(prediction.rationale.day_sleep_target_min)} target</p>
              {prediction.rationale.last_nap_duration_min && (
                <p>• Last Nap: {formatDuration(prediction.rationale.last_nap_duration_min)}</p>
              )}
              {Object.entries(prediction.rationale.flags).some(([_, value]) => value) && (
                <p>• Flags: {Object.entries(prediction.rationale.flags)
                  .filter(([_, value]) => value)
                  .map(([key, _]) => key.replace('_', ' '))
                  .join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};