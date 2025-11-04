import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AISchedulePrediction } from "@/utils/adaptiveScheduleGenerator";

interface TodayAtGlanceProps {
  prediction: AISchedulePrediction | null;
  loading: boolean;
}

export const TodayAtGlance = ({ prediction, loading }: TodayAtGlanceProps) => {
  // Information is already shown in schedule timeline below
  return null;
};
