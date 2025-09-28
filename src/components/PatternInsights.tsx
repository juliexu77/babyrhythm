import { Activity } from "./ActivityCard";
import { Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { usePatternAnalysis } from "@/hooks/usePatternAnalysis";
import { InsightCard } from "./insights/InsightCard";

interface PatternInsightsProps {
  activities: Activity[];
}

export const PatternInsights = ({ activities }: PatternInsightsProps) => {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const { insights } = usePatternAnalysis(activities);

  if (insights.length === 0) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-serif">
            <Brain className="h-5 w-5 text-primary" />
            Pattern Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Keep logging activities to discover patterns in your baby's routine.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Insights appear after logging multiple activities of the same type.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-serif">
          <Brain className="h-5 w-5 text-primary" />
          Pattern Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <InsightCard
              key={index}
              insight={insight}
              index={index}
              isExpanded={expandedInsight === index}
              onToggle={setExpandedInsight}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};