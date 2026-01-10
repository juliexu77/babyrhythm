import { Lightbulb, CheckSquare, ArrowRight, ChevronDown, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface UnifiedInsightCardProps {
  whatToKnow?: string[];
  whatToDo?: string[];
  whatsNext?: string;
  prepTip?: string;
  baselineContext?: string;
  currentPattern?: string;
  babyName?: string;
  loading?: boolean;
  chatComponent?: React.ReactNode;
}

export const UnifiedInsightCard = ({
  whatToKnow,
  whatToDo,
  whatsNext,
  prepTip,
  baselineContext,
  currentPattern,
  babyName = "Your baby",
  loading,
  chatComponent
}: UnifiedInsightCardProps) => {
  // All sections collapsed by default
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
      <div>
        {/* Deeper rose-neutral card with tonal separators and soft matte highlight */}
        <div className="rounded-xl bg-gradient-to-b from-[hsl(18,40%,88%)] via-[hsl(16,38%,86%)] to-[hsl(14,35%,83%)] dark:from-card dark:to-card border border-[hsl(18,28%,78%)]/30 dark:border-border/20 shadow-[0_6px_18px_-4px_hsla(18,40%,45%,0.12)] dark:shadow-none overflow-hidden">
          <div className="px-4 py-4 border-b border-[hsl(18,25%,78%)]/30 dark:border-border/30 bg-gradient-to-b from-[hsl(22,35%,93%)]/60 to-transparent">
            <div className="h-4 w-48 bg-[hsl(18,30%,82%)] dark:bg-muted rounded"></div>
          </div>
          <div className="p-5 space-y-4 animate-pulse">
            <div className="h-4 w-full bg-[hsl(18,30%,82%)] dark:bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-[hsl(18,30%,82%)] dark:bg-muted rounded"></div>
            <div className="h-4 w-4/6 bg-[hsl(18,30%,82%)] dark:bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // If we have nothing to show, don't render
  if (!whatToKnow?.length && !whatToDo?.length && !whatsNext && !prepTip) {
    return null;
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Deeper rose-neutral card with tonal separators and soft matte highlight at top */}
      <div className="rounded-xl bg-gradient-to-b from-[hsl(18,40%,88%)] via-[hsl(16,38%,86%)] to-[hsl(14,35%,83%)] dark:from-card dark:to-card border border-[hsl(18,28%,78%)]/30 dark:border-border/20 shadow-[0_6px_18px_-4px_hsla(18,40%,45%,0.12)] dark:shadow-none overflow-hidden">
        {/* Header with soft matte highlight (warm cream > blush gradient at 5-7% opacity) */}
        <div className="px-4 py-4 border-b border-[hsl(18,25%,78%)]/30 dark:border-border/30 bg-gradient-to-b from-[hsl(22,35%,93%)]/60 to-transparent">
          <h3 className="text-xs font-medium text-foreground/70">
            Understanding {babyName}&apos;s Rhythm
          </h3>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
        {/* What to Know - Expanded by default, observational insights */}
        {whatToKnow && whatToKnow.length > 0 && (() => {
          const isExpanded = expandedSections.has('know');
          
          return (
            <Collapsible open={isExpanded}>
              <CollapsibleTrigger 
                onClick={() => toggleSection('know')}
                className="flex items-start justify-between w-full group"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground text-left">
                      What to Know
                    </h4>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1 text-left">
                        {whatToKnow[0]}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 pl-6 mt-3">
                <div className="space-y-2">
                  {whatToKnow.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-500/60 mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground leading-relaxed text-left flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* What To Do - Collapsed by default, actionable steps */}
        {whatToDo && whatToDo.length > 0 && (() => {
          const isExpanded = expandedSections.has('do');
          
          return (
            <Collapsible open={isExpanded}>
              <CollapsibleTrigger 
                onClick={() => toggleSection('do')}
                className="flex items-start justify-between w-full group"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground text-left">
                      What to Do
                    </h4>
                    {!isExpanded && whatToDo.length > 0 && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1 text-left">
                        {whatToDo[0]}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2.5 pl-6 mt-3">
                <div className="space-y-2">
                  {whatToDo.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500/60 mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground leading-relaxed text-left flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* What's Next - Collapsed by default */}
        {whatsNext && (() => {
          const isExpanded = expandedSections.has('next');
          
          return (
            <Collapsible open={isExpanded}>
              <CollapsibleTrigger 
                onClick={() => toggleSection('next')}
                className="flex items-start justify-between w-full group"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground text-left">
                      What&apos;s Next
                    </h4>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1 text-left">
                        {whatsNext}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 mt-3">
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  {whatsNext}
                </p>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        {/* Prep Tip - If available */}
        {prepTip && (
          <div className="pt-3 border-t border-border/20">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                Tip
              </Badge>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{prepTip}</p>
            </div>
          </div>
        )}

        {/* Ask Me Anything Button */}
        {chatComponent && (
          <div className="pt-3 border-t border-border/20">
            {chatComponent}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
