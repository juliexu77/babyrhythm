import { ChevronDown, ChevronUp } from "lucide-react";
import { PatternInsight } from "@/hooks/usePatternAnalysis";

interface InsightCardProps {
  insight: PatternInsight;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number | null) => void;
}

export const InsightCard = ({ insight, index, isExpanded, onToggle }: InsightCardProps) => {
  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const IconComponent = insight.icon;

  return (
    <div 
      className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-sm ${getConfidenceColor(insight.confidence)}`}
      onClick={() => onToggle(isExpanded ? null : index)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconComponent className="h-5 w-5" />
          <div>
            <h4 className="font-medium">{insight.text}</h4>
            <span className="text-xs opacity-75 capitalize">{insight.confidence} confidence</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 opacity-50" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-50" />
        )}
      </div>
      
      {isExpanded && (
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
};