import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface AiPrediction {
  total_naps_today: number;
  remaining_naps: number;
  total_feeds_today: number;
  predicted_bedtime: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  is_transitioning: boolean;
  transition_note?: string;
}

interface TodayAtGlanceProps {
  prediction: AiPrediction | null;
  loading: boolean;
}

export const TodayAtGlance = ({ prediction, loading }: TodayAtGlanceProps) => {
  if (loading) {
    return (
      <div className="px-4 py-3 bg-accent/10 rounded-lg border border-border/40 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analyzing patterns...</p>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const parts: string[] = [];
  
  // Add naps
  if (prediction.total_naps_today > 0) {
    parts.push(`${prediction.total_naps_today} ${prediction.total_naps_today === 1 ? 'nap' : 'naps'}`);
  }
  
  // Add feeds
  if (prediction.total_feeds_today > 0) {
    parts.push(`${prediction.total_feeds_today} ${prediction.total_feeds_today === 1 ? 'feed' : 'feeds'}`);
  }
  
  // Add bedtime
  if (prediction.predicted_bedtime) {
    parts.push(`bedtime at ${prediction.predicted_bedtime}`);
  }
  
  // If no data, don't render anything
  if (parts.length === 0 && (!prediction.is_transitioning || !prediction.transition_note)) {
    return null;
  }
  
  // Show summary of today's predicted activities
  if (parts.length > 0) {
    return (
      <div className="px-3 py-2 bg-accent/10 rounded-lg border border-border/30">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Today:</span> {parts.join(', ')}
          </p>
          <Badge variant={prediction.confidence === 'high' ? 'default' : 'secondary'} className="text-[10px] h-5">
            {prediction.confidence}
          </Badge>
        </div>
      </div>
    );
  }
  
  // Only show transition detection if no summary is shown and schedule doesn't already have it
  if (prediction.is_transitioning && prediction.transition_note) {
    return (
      <div className="px-3 py-2 bg-accent/10 rounded-lg border border-border/30">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Transition detected:</span> {prediction.transition_note}
        </p>
      </div>
    );
  }
  
  return null;
};
