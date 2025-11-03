import { Lightbulb, CheckSquare, ArrowRight, Compass, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface UnifiedInsightCardProps {
  whyThisMatters?: string;
  whatToKnow?: string[];
  whatToDo?: string[];
  whatsNext?: string;
  prepTip?: string;
  loading?: boolean;
}

export const UnifiedInsightCard = ({
  whyThisMatters,
  whatToKnow,
  whatToDo,
  whatsNext,
  prepTip,
  loading
}: UnifiedInsightCardProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-5 bg-accent/30 rounded-xl border border-border animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded"></div>
        <div className="h-4 w-full bg-muted rounded"></div>
        <div className="h-4 w-5/6 bg-muted rounded"></div>
        <div className="h-4 w-4/6 bg-muted rounded"></div>
      </div>
    );
  }

  // If we have nothing to show, don't render
  if (!whyThisMatters && !whatToDo?.length && !whatsNext) {
    return null;
  }

  return (
    <div className="p-5 bg-accent/30 rounded-xl border border-border space-y-5">
      {/* Why This Matters - Always shown if available */}
      {whyThisMatters && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-foreground">
              Why This Matters
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {whyThisMatters}
          </p>
        </div>
      )}

      {/* What To Do - Collapsible */}
      {whatToDo && whatToDo.length > 0 && (
        <Collapsible open={expandedSections.has('do')}>
          <CollapsibleTrigger 
            onClick={() => toggleSection('do')}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-medium text-foreground uppercase tracking-wider">
                What To Do
              </h4>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ${expandedSections.has('do') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pl-1 mt-3">
            {whatToDo.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* What's Next - Collapsible */}
      {whatsNext && (
        <Collapsible open={expandedSections.has('next')}>
          <CollapsibleTrigger 
            onClick={() => toggleSection('next')}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-medium text-foreground uppercase tracking-wider">
                What's Next
              </h4>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ${expandedSections.has('next') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pl-1 mt-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {whatsNext}
            </p>
            {prepTip && (
              <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-border/30">
                <Compass className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Prep tip:</span> {prepTip}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
