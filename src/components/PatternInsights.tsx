import { Activity } from "./ActivityCard";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { usePatternAnalysis } from "@/hooks/usePatternAnalysis";

interface PatternInsightsProps {
  activities: Activity[];
}

export const PatternInsights = ({ activities }: PatternInsightsProps) => {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const { insights } = usePatternAnalysis(activities);

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

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
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            
            return (
              <div 
                key={index}
                className={`rounded-lg p-4 transition-all cursor-pointer hover:opacity-90 ${getConfidenceColor(insight.confidence)}`}
                onClick={() => setExpandedInsight(expandedInsight === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-4 w-4" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{insight.text}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-75 capitalize">{insight.confidence} confidence</span>
                    {expandedInsight === index ? (
                      <ChevronUp className="h-3 w-3 opacity-50" />
                    ) : (
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    )}
                  </div>
                </div>
                
                {expandedInsight === index && (
                  <div className="mt-4 pt-4 border-t border-current/20">
                    <p className="text-sm mb-4 opacity-90">
                      {insight.details.description}
                    </p>
                    
                    {insight.details.data.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium opacity-75 uppercase tracking-wide">
                          Supporting Data
                        </h5>
                        <div className="space-y-1">
                          {insight.details.data.slice(0, 3).map((dataPoint, dataIndex) => (
                            <div key={dataIndex} className="flex justify-between items-center text-xs">
                              <span className="opacity-75">
                                {dataPoint.calculation || 'Activity'}
                              </span>
                              <span className="font-medium">
                                {dataPoint.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {insight.details.calculation && (
                      <div className="mt-3 pt-3 border-t border-current/20">
                        <span className="text-xs opacity-75 font-medium">Calculation: </span>
                        <span className="text-xs opacity-90">{insight.details.calculation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};