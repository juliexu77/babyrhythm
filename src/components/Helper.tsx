import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp, AlertCircle, Baby, Target } from "lucide-react";
import { format, differenceInWeeks, startOfDay, endOfDay, subDays } from "date-fns";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface HelperProps {
  activities: Activity[];
  babyBirthDate?: Date;
}

interface HelperCard {
  title: string;
  summary: string;
  bullets: string[];
  icon: any;
  confidence?: number;
}

export const Helper = ({ activities, babyBirthDate }: HelperProps) => {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);

  const getHelperResponse = (intent: string): HelperCard[] => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yesterday = subDays(today, 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);
    const weekAgo = subDays(today, 7);

    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= todayStart && activityDate <= todayEnd;
    });

    const yesterdayActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= yesterdayStart && activityDate <= yesterdayEnd;
    });

    const weekActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= weekAgo;
    });

    switch (intent) {
      case "todays_schedule": {
        const feeds = todayActivities.filter(a => a.type === "feed");
        const naps = todayActivities.filter(a => a.type === "nap");
        const diapers = todayActivities.filter(a => a.type === "diaper");
        
        const feedTimes = feeds.map(f => format(new Date(f.logged_at), "h:mma")).join(", ");
        const napSummary = naps.map(n => {
          const start = format(new Date(n.logged_at), "h:mma");
          const duration = n.details?.duration || "unknown";
          return `${start} (${duration}m)`;
        }).join(", ");

        // Predict next feed
        let nextFeedPrediction = "";
        if (feeds.length >= 2) {
          const intervals = [];
          for (let i = 1; i < feeds.length; i++) {
            const diff = (new Date(feeds[i].logged_at).getTime() - new Date(feeds[i-1].logged_at).getTime()) / (1000 * 60);
            intervals.push(diff);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const lastFeed = new Date(feeds[feeds.length - 1].logged_at);
          const nextFeed = new Date(lastFeed.getTime() + avgInterval * 60 * 1000);
          nextFeedPrediction = `Next feed ~ ${format(nextFeed, "h:mma")} (±20m)`;
        }

        return [{
          title: "Today's Schedule",
          summary: `${feeds.length} feeds • ${naps.length} naps • ${diapers.length} diapers so far`,
          bullets: [
            feeds.length > 0 ? `Feeds: ${feedTimes}` : "No feeds yet today",
            naps.length > 0 ? `Naps: ${napSummary}` : "No naps yet today",
            nextFeedPrediction || "Building feeding pattern..."
          ].filter(Boolean),
          icon: Clock,
          confidence: feeds.length >= 3 ? 0.82 : 0.45
        }];
      }

      case "yesterdays_summary": {
        const feeds = yesterdayActivities.filter(a => a.type === "feed");
        const naps = yesterdayActivities.filter(a => a.type === "nap");
        const diapers = yesterdayActivities.filter(a => a.type === "diaper");
        
        const totalIntake = feeds.reduce((sum, f) => sum + (f.details?.amount || 0), 0);
        const totalNapTime = naps.reduce((sum, n) => sum + (n.details?.duration || 0), 0);
        
        const feedTimes = feeds.map(f => new Date(f.logged_at).getTime());
        const firstFeed = feedTimes.length > 0 ? format(new Date(Math.min(...feedTimes)), "h:mma") : "None";
        const lastFeed = feedTimes.length > 0 ? format(new Date(Math.max(...feedTimes)), "h:mma") : "None";

        return [{
          title: "Yesterday's Summary",
          summary: `${feeds.length} feeds • ${Math.round(totalNapTime / 60)}h sleep • ${diapers.length} diapers`,
          bullets: [
            `Total intake: ${totalIntake}ml`,
            `First feed: ${firstFeed}, Last: ${lastFeed}`,
            `Total nap time: ${totalNapTime}min`
          ],
          icon: Calendar
        }];
      }

      case "weekly_patterns": {
        const feedsByDay = {};
        const napsByDay = {};
        
        for (let i = 0; i < 7; i++) {
          const day = format(subDays(today, i), "yyyy-MM-dd");
          const dayStart = startOfDay(subDays(today, i));
          const dayEnd = endOfDay(subDays(today, i));
          
          const dayActivities = activities.filter(a => {
            const activityDate = new Date(a.logged_at);
            return activityDate >= dayStart && activityDate <= dayEnd;
          });
          
          feedsByDay[day] = dayActivities.filter(a => a.type === "feed").length;
          napsByDay[day] = dayActivities.filter(a => a.type === "nap").length;
        }

        const avgFeeds = (Object.values(feedsByDay) as number[]).reduce((a, b) => a + b, 0) / 7;
        const avgNaps = (Object.values(napsByDay) as number[]).reduce((a, b) => a + b, 0) / 7;

        return [{
          title: "Weekly Patterns",
          summary: `Avg ${avgFeeds.toFixed(1)} feeds/day • ${avgNaps.toFixed(1)} naps/day`,
          bullets: [
            `Most feeds in a day: ${Math.max(...(Object.values(feedsByDay) as number[]))}`,
            `Most consistent: ${avgFeeds > 6 ? "Feeding" : "Napping"}`,
            `7-day trend: ${feedsByDay[format(today, "yyyy-MM-dd")] > avgFeeds ? "↗" : "↘"} feeds today`
          ],
          icon: TrendingUp
        }];
      }

      case "whats_next": {
        const recentFeeds = activities
          .filter(a => a.type === "feed")
          .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
          .slice(0, 5);

        if (recentFeeds.length < 2) {
          return [{
            title: "What's Next?",
            summary: "Building your routine...",
            bullets: ["Log a few more activities to see predictions!"],
            icon: Target,
            confidence: 0.20
          }];
        }

        const intervals = [];
        for (let i = 1; i < recentFeeds.length; i++) {
          const diff = (new Date(recentFeeds[i-1].logged_at).getTime() - new Date(recentFeeds[i].logged_at).getTime()) / (1000 * 60);
          intervals.push(diff);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastFeed = new Date(recentFeeds[0].logged_at);
        const nextFeed = new Date(lastFeed.getTime() + avgInterval * 60 * 1000);
        
        const confidence = Math.min(0.9, Math.max(0.4, recentFeeds.length / 5));

        return [{
          title: "What's Next?",
          summary: `Next feed predicted: ${format(nextFeed, "h:mma")}`,
          bullets: [
            `Based on ${recentFeeds.length} recent feeds`,
            `Average interval: ${Math.round(avgInterval / 60)}h ${Math.round(avgInterval % 60)}m`,
            `Window: ${format(new Date(nextFeed.getTime() - 20*60*1000), "h:mma")}-${format(new Date(nextFeed.getTime() + 20*60*1000), "h:mma")}`
          ],
          icon: Target,
          confidence
        }];
      }

      case "anomalies_today": {
        const recentAvg = weekActivities.filter(a => a.type === "feed").length / 7;
        const todayFeeds = todayActivities.filter(a => a.type === "feed").length;
        
        const anomalies = [];
        if (todayFeeds > recentAvg * 1.3) {
          anomalies.push("More frequent feeding today");
        } else if (todayFeeds < recentAvg * 0.7) {
          anomalies.push("Fewer feeds than usual");
        }

        const todayNaps = todayActivities.filter(a => a.type === "nap");
        const avgNapDuration = weekActivities
          .filter(a => a.type === "nap")
          .reduce((sum, n) => sum + (n.details?.duration || 0), 0) / weekActivities.filter(a => a.type === "nap").length;
        
        const todayAvgNap = todayNaps.reduce((sum, n) => sum + (n.details?.duration || 0), 0) / todayNaps.length;
        
        if (todayAvgNap < avgNapDuration * 0.7) {
          anomalies.push("Shorter naps than usual");
        } else if (todayAvgNap > avgNapDuration * 1.3) {
          anomalies.push("Longer naps than usual");
        }

        return [{
          title: "Today's Anomalies",
          summary: anomalies.length > 0 ? `${anomalies.length} patterns differ from baseline` : "All patterns normal",
          bullets: anomalies.length > 0 ? anomalies : ["No significant deviations detected", "Routine tracking well", "All metrics within normal range"],
          icon: AlertCircle
        }];
      }

      case "age_tips": {
        if (!babyBirthDate) {
          return [{
            title: "Age-Based Tips",
            summary: "Set baby's birth date to see age-specific guidance",
            bullets: ["Go to Settings to add birth date"],
            icon: Baby
          }];
        }

        const ageInWeeks = differenceInWeeks(new Date(), babyBirthDate);
        let tips = [];

        if (ageInWeeks < 6) {
          tips = [
            "Newborns feed every 2-3 hours",
            "Sleep 14-17 hours per day is normal",
            "Growth spurts around weeks 2-3, 6"
          ];
        } else if (ageInWeeks < 12) {
          tips = [
            "Longer stretches between feeds emerging",
            "4-6 hour night sleep possible",
            "More predictable nap patterns developing"
          ];
        } else if (ageInWeeks < 24) {
          tips = [
            "3-4 feeds per day becoming normal",
            "2-3 regular naps expected",
            "Night sleep: 6-8 hour stretches"
          ];
        } else {
          tips = [
            "Solid food introduction affects patterns",
            "2 main naps + possible catnap",
            "10-12 hour night sleep achievable"
          ];
        }

        return [{
          title: "Age-Based Tips",
          summary: `Week ${ageInWeeks} guidance`,
          bullets: tips,
          icon: Baby
        }];
      }

      default:
        return [];
    }
  };

  const quickPrompts = [
    { id: "todays_schedule", label: "Today's schedule", icon: Clock },
    { id: "yesterdays_summary", label: "Yesterday at a glance", icon: Calendar },
    { id: "weekly_patterns", label: "This week's patterns", icon: TrendingUp },
    { id: "whats_next", label: "What's next?", icon: Target },
    { id: "anomalies_today", label: "Any anomalies today?", icon: AlertCircle },
    { id: "age_tips", label: "Age-based tips", icon: Baby },
  ];

  const handlePromptClick = (intent: string) => {
    setSelectedIntent(intent);
  };

  const cards = selectedIntent ? getHelperResponse(selectedIntent) : [];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Helper</h2>
        <p className="text-sm text-muted-foreground">Quick insights about your baby's patterns</p>
      </div>

      {!selectedIntent && (
        <div className="grid grid-cols-2 gap-3">
          {quickPrompts.map((prompt) => {
            const Icon = prompt.icon;
            return (
              <Button
                key={prompt.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => handlePromptClick(prompt.id)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs text-center leading-tight">{prompt.label}</span>
              </Button>
            );
          })}
        </div>
      )}

      {selectedIntent && (
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedIntent(null)}
            className="mb-4"
          >
            ← Back to prompts
          </Button>
          
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {card.title}
                    {card.confidence && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(card.confidence * 100)}% confident
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm font-medium text-muted-foreground">{card.summary}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {card.bullets.map((bullet, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};