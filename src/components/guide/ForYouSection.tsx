import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Sparkles, Heart } from "lucide-react";

interface ForYouSectionProps {
  babyName: string;
  babyAgeInWeeks: number;
  hasInsights: boolean;
  recentActivities: any[];
  onArticleClick: (title: string) => void;
}

interface Article {
  title: string;
  category: string;
  icon: React.ReactNode;
  reason: string;
}

export const ForYouSection = ({ 
  babyName, 
  babyAgeInWeeks, 
  hasInsights, 
  recentActivities,
  onArticleClick 
}: ForYouSectionProps) => {
  
  const articles: Article[] = [];
  
  // Pattern-related content (if insights exist)
  if (hasInsights) {
    articles.push({
      title: "Understanding Your Baby's Current Pattern",
      category: "Deep Dive",
      icon: <TrendingUp className="w-4 h-4" />,
      reason: "Based on today's insights"
    });
    
    articles.push({
      title: "Strategies for Pattern Changes",
      category: "Tips",
      icon: <Sparkles className="w-4 h-4" />,
      reason: "Tailored to your situation"
    });
  }
  
  // Age-based content (always show)
  const ageInMonths = Math.floor(babyAgeInWeeks / 4);
  articles.push({
    title: `Understanding ${ageInMonths}-Month Babies`,
    category: "Age Guide",
    icon: <BookOpen className="w-4 h-4" />,
    reason: `Perfect for ${babyName}'s age`
  });
  
  articles.push({
    title: `What's Next at ${ageInMonths + 1} Months`,
    category: "Looking Ahead",
    icon: <BookOpen className="w-4 h-4" />,
    reason: "Prepare for upcoming changes"
  });
  
  // Recent activity-based content
  const recentNaps = recentActivities.filter(a => a.type === 'nap');
  const recentFeeds = recentActivities.filter(a => a.type === 'feed');
  
  // Check for night wakings (naps logged between 10pm-6am)
  const nightWakings = recentNaps.filter(nap => {
    const hour = new Date(nap.logged_at).getHours();
    return hour >= 22 || hour <= 6;
  });
  
  if (nightWakings.length > 3) {
    articles.push({
      title: "Understanding Night Wakings",
      category: "Sleep Help",
      icon: <BookOpen className="w-4 h-4" />,
      reason: "You've logged several night wakings"
    });
  } else if (recentFeeds.length > 0) {
    // Check feed variation
    const feedIntervals: number[] = [];
    for (let i = 1; i < recentFeeds.length; i++) {
      const interval = (new Date(recentFeeds[i].logged_at).getTime() - 
                       new Date(recentFeeds[i-1].logged_at).getTime()) / (1000 * 60);
      feedIntervals.push(interval);
    }
    
    if (feedIntervals.length > 0) {
      const avgInterval = feedIntervals.reduce((a, b) => a + b, 0) / feedIntervals.length;
      const variance = feedIntervals.some(i => Math.abs(i - avgInterval) > 60);
      
      if (variance) {
        articles.push({
          title: `Feeding Patterns at ${ageInMonths} Months`,
          category: "Feeding",
          icon: <BookOpen className="w-4 h-4" />,
          reason: "Your feeding times have varied"
        });
      }
    }
  }
  
  // Default encouragement if nothing unusual
  if (articles.length < 4) {
    articles.push({
      title: "You're Doing Great!",
      category: "Encouragement",
      icon: <Heart className="w-4 h-4" />,
      reason: "Keep up the amazing work"
    });
  }

  return (
    <div className="mx-2 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">✨ For You</h2>
        <span className="text-xs text-muted-foreground">Personalized</span>
      </div>
      
      <div className="space-y-3">
        {articles.slice(0, 5).map((article, idx) => (
          <Card 
            key={idx}
            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer border-border/40"
            onClick={() => onArticleClick(article.title)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {article.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">{article.category}</span>
                </div>
                <h3 className="text-sm font-medium mb-1">{article.title}</h3>
                <p className="text-xs text-muted-foreground">{article.reason}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
