import { Lightbulb, CheckSquare, ArrowRight, ChevronDown, RefreshCw, Info } from "lucide-react";
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
  generatedAt?: Date;
  onRefresh?: () => void;
  refreshing?: boolean;
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
  generatedAt,
  onRefresh,
  refreshing = false
}: UnifiedInsightCardProps) => {
  // Show "What to Know" expanded by default, others collapsed
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['know']));

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
    <div className="mx-2 space-y-4">
      {/* Section Title with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Understanding {babyName}&apos;s Rhythm
        </h3>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Baseline Context Banner - Prominent at top */}
      {(baselineContext || currentPattern) && (
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg space-y-1.5">
          {currentPattern && (
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground font-medium">{currentPattern}</p>
            </div>
          )}
          {baselineContext && (
            <p className="text-xs text-muted-foreground pl-6">{baselineContext}</p>
          )}
        </div>
      )}
      
      <div className="p-5 bg-gradient-to-b from-card-ombre-2-dark to-card-ombre-2 rounded-xl border border-border/20 space-y-4 text-left">
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
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
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
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
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
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wider text-left">
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

        {/* Timestamp footer */}
        {generatedAt && (
          <div className="pt-3 border-t border-border/20 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/60">
              Updated {formatTimestamp(generatedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
