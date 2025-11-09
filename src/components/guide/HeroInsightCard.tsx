import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface HeroInsightCardProps {
  insight: string;
  confidence: string;
  loading?: boolean;
}

export const HeroInsightCard = ({ insight, confidence, loading }: HeroInsightCardProps) => {
  if (loading) {
    return (
      <div className="mb-6 p-5 bg-gradient-to-b from-card-ombre-1-dark to-card-ombre-1 rounded-xl border border-border/20 animate-pulse">
        <div className="flex items-start gap-2 mb-3">
          <div className="h-6 w-48 bg-primary/20 rounded"></div>
        </div>
        <div className="h-4 w-full bg-primary/20 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-primary/20 rounded"></div>
      </div>
    );
  }

  // Extract first sentence only
  const firstSentence = insight.split(/[.!?]/).filter(s => s.trim())[0] + '.';

  return (
    <div className="mb-6 p-5 bg-gradient-to-b from-card-ombre-1-dark to-card-ombre-1 rounded-xl border border-border/20 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Today's Insight
        </h3>
      </div>
      <p className="text-base text-foreground leading-relaxed">
        {firstSentence}
      </p>
    </div>
  );
};
