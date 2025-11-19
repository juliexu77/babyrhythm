import { Lightbulb, CheckSquare, ArrowRight, ChevronDown } from "lucide-react";
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // All collapsed, show previews

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
      <div className="mx-2 p-5 bg-gradient-to-b from-card-ombre-2-dark to-card-ombre-2 rounded-xl border border-border/20 animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded"></div>
        <div className="h-4 w-full bg-muted rounded"></div>
        <div className="h-4 w-5/6 bg-muted rounded"></div>
        <div className="h-4 w-4/6 bg-muted rounded"></div>
      </div>
    );
  }

  // If we have nothing to show, don't render
  if (!whatToDo?.length && !whatsNext && !prepTip) {
    return null;
  }

  return (
    <div className="mx-2 space-y-4">
      {/* Section Title - Matching Schedule Timeline Style */}
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        Understanding {babyName}&apos;s Rhythm
      </h3>
      
      <div className="p-5 bg-gradient-to-b from-card-ombre-2-dark to-card-ombre-2 rounded-xl border border-border/20 space-y-4 text-left">
        {/* What to Know - Collapsible with preview */}
        {prepTip && (() => {
          const isExpanded = expandedSections.has('know');
          
          return (
            <Collapsible open={isExpanded}>
              <CollapsibleTrigger 
                onClick={() => toggleSection('know')}
                className="flex items-start justify-between w-full group"
              >
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
                      What to Know
                    </h4>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1 text-left">
                        {prepTip}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 pl-6 mt-3">
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  {prepTip}
                </p>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

      {/* What To Do - Collapsible with preview */}
      {whatToDo && whatToDo.length > 0 && (() => {
        const isExpanded = expandedSections.has('do');
        
        return (
          <Collapsible open={isExpanded}>
            <CollapsibleTrigger 
              onClick={() => toggleSection('do')}
              className="flex items-start justify-between w-full group"
            >
              <div className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
                    What To Do
                  </h4>
                  {!isExpanded && whatToDo.length > 0 && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-1 text-left">
                      {whatToDo[0]}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2.5 pl-6 mt-3">
              {whatToDo.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed text-left">
                    {item}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })()}

      {/* What's Next - Collapsible with preview */}
      {whatsNext && (() => {
        const isExpanded = expandedSections.has('next');
        
        return (
          <Collapsible open={isExpanded}>
            <CollapsibleTrigger 
              onClick={() => toggleSection('next')}
              className="flex items-start justify-between w-full group"
            >
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
                    What's Next
                  </h4>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-1 text-left">
                      {whatsNext}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 mt-3 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed text-left">
                {whatsNext}
              </p>
            </CollapsibleContent>
          </Collapsible>
        );
      })()}
      </div>
    </div>
  );
};
