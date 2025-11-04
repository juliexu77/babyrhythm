import { Lightbulb, CheckSquare, ArrowRight, Compass, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface UnifiedInsightCardProps {
  whatToDo?: string[];
  whatsNext?: string;
  prepTip?: string;
  whyThisMatters?: string;
  babyName?: string;
  loading?: boolean;
}

export const UnifiedInsightCard = ({
  whatToDo,
  whatsNext,
  prepTip,
  whyThisMatters,
  babyName = "Your baby",
  loading
}: UnifiedInsightCardProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // Collapsed by default

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
  if (!whatToDo?.length && !whatsNext && !whyThisMatters) {
    return null;
  }

  return (
    <div className="p-5 bg-accent/30 rounded-xl border border-border space-y-4">
      {/* Understanding Baby's Rhythm - Collapsible with preview */}
      {whyThisMatters && (() => {
        // Extract first sentence as preview
        const firstSentence = whyThisMatters.split(/[.!?]/)[0] + (whyThisMatters.includes('.') ? '.' : '');
        const isExpanded = expandedSections.has('why');
        
        return (
          <Collapsible open={isExpanded}>
            <CollapsibleTrigger 
              onClick={() => toggleSection('why')}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-foreground uppercase tracking-wider">
                    Understanding {babyName}'s Rhythm
                  </h4>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-1">
                      {firstSentence}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-1 mt-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {whyThisMatters}
              </p>
            </CollapsibleContent>
          </Collapsible>
        );
      })()}

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
          <CollapsibleContent className="space-y-2.5 pl-1 mt-3">
            {whatToDo.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
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
          <CollapsibleContent className="pl-1 mt-3 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {whatsNext}
            </p>
            {prepTip && (
              <div className="flex items-start gap-2.5 p-3 bg-accent/20 rounded-lg border border-border/40">
                <Compass className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Prep tip:</span> {prepTip}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
