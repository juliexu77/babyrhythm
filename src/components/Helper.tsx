import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp, AlertCircle, Baby, Target, ChevronDown, ChevronUp, Heart } from "lucide-react";
import { format, differenceInWeeks, startOfDay, endOfDay, subDays } from "date-fns";
import { useHousehold } from "@/hooks/useHousehold";

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
  console.log('Helper component received activities:', activities.length, activities.slice(0, 3));
  const { household } = useHousehold();
  const [showDailyReview, setShowDailyReview] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // Check if it's evening and show daily review prompt
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const hasActivitiesToday = activities.some(activity => {
        const activityDate = new Date(activity.logged_at);
        return activityDate.toDateString() === now.toDateString();
      });
      
      setShowReviewPrompt(hour >= 19 && hasActivitiesToday && !showDailyReview); // 7 PM or later
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [activities, showDailyReview]);
  
  const generatePersonalizedDailyReview = (): string => {
    const today = new Date();
    const todayActivities = activities.filter(activity => {
      const activityDate = new Date(activity.logged_at);
      return activityDate.toDateString() === today.toDateString();
    });

    const feeds = todayActivities.filter(a => a.type === "feed");
    const naps = todayActivities.filter(a => a.type === "nap");
    const diapers = todayActivities.filter(a => a.type === "diaper");
    const notes = todayActivities.filter(a => a.type === "note");

    const babyName = household?.baby_name || "your little one";
    const babyPronoun = "they"; // Could be made configurable
    const totalIntake = feeds.reduce((sum, f) => {
      const quantity = f.details?.quantity || 0;
      return sum + (parseFloat(quantity as string) || 0);
    }, 0);

    let review = `Good evening! Let me share how ${babyName}'s day went. `;

    // Feeding insights
    if (feeds.length > 0) {
      const avgInterval = feeds.length > 1 ? Math.round(12 / feeds.length) : 0;
      review += `You fed ${babyName} ${feeds.length} times today, and ${babyPronoun} took in ${totalIntake.toFixed(1)}${feeds.some(f => f.details?.unit === 'ml') ? 'ml' : 'oz'} total. `;
      
      if (feeds.length >= 8) {
        review += `${babyName} had a hearty appetite today - that's wonderful! `;
      } else if (feeds.length >= 6) {
        review += `${babyName} seems to be eating well and settling into a nice rhythm. `;
      } else if (feeds.length >= 4) {
        review += `${babyName} had decent feeds today, though ${babyPronoun} might be going through a growth phase. `;
      } else {
        review += `${babyName} had fewer feeds than usual - ${babyPronoun} might just be having a lighter day or cluster feeding later. `;
      }
    } else {
      review += `I notice you didn't log any feeds today - just a gentle reminder to track them for better insights. `;
    }

    // Sleep insights
    if (naps.length > 0) {
      const totalNapTime = naps.reduce((sum, n) => {
        if (n.details?.startTime && n.details?.endTime) {
          const start = new Date(`1970-01-01 ${n.details.startTime}`);
          const end = new Date(`1970-01-01 ${n.details.endTime}`);
          return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
        return sum;
      }, 0);

      if (totalNapTime > 0) {
        const napHours = Math.floor(totalNapTime / 60);
        const napMins = totalNapTime % 60;
        review += `For sleep, ${babyName} took ${naps.length} nap${naps.length > 1 ? 's' : ''} totaling ${napHours}h ${napMins}m. `;
        
        if (totalNapTime > 240) {
          review += `That's excellent rest - ${babyName} really recharged today! `;
        } else if (totalNapTime > 120) {
          review += `Good sleep patterns emerging - ${babyName} is learning to rest well. `;
        } else {
          review += `${babyName} had shorter naps today - ${babyPronoun} might be going through a developmental leap or just needed more awake time. `;
        }
      } else {
        review += `You logged ${naps.length} nap${naps.length > 1 ? 's' : ''} but the timing details weren't captured - try adding start and end times for better sleep insights. `;
      }
    } else {
      review += `No naps were logged today - ${babyName} might have been extra alert or had different sleep needs. `;
    }

    // Diaper insights
    if (diapers.length > 0) {
      review += `You changed ${diapers.length} diaper${diapers.length > 1 ? 's' : ''} today`;
      if (diapers.length >= 6) {
        review += ` - perfect hydration and digestion signs! `;
      } else if (diapers.length >= 4) {
        review += ` - good signs of healthy intake. `;
      } else {
        review += ` - keep an eye on hydration, especially if ${babyName} seems fussy. `;
      }
    }

    // Notes and observations
    if (notes.length > 0) {
      review += `I also noticed you made ${notes.length} special observation${notes.length > 1 ? 's' : ''} about ${babyName} today - these little moments and notes help track ${babyPronoun} development beautifully. `;
    }

    // Encouraging conclusion
    review += `Overall, you're doing wonderfully with ${babyName}. Every day is different, and you're learning ${babyPronoun} unique rhythm together. Rest well tonight - tomorrow brings new discoveries! 💙`;

    return review;
  };

  const startDailyReview = () => {
    const reviewText = generatePersonalizedDailyReview();
    setShowDailyReview(true);
    setShowReviewPrompt(false);
    setIsTyping(true);
    setTypedText("");
    
    // Simulate typing effect
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < reviewText.length) {
        setTypedText(reviewText.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 25); // Typing speed
  };

  const getAllInsights = (): HelperCard[] => {
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

    const insights: HelperCard[] = [];

    // 1. Today's Status (highest priority)
    const todayFeeds = todayActivities.filter(a => a.type === "feed");
    const todayNaps = todayActivities.filter(a => a.type === "nap");
    const todayDiapers = todayActivities.filter(a => a.type === "diaper");

    if (activities.length === 0) {
      insights.push({
        title: "Getting Started",
        summary: "Ready to track your baby's day",
        bullets: [
          "Start by logging activities as they happen",
          "I'll learn patterns and provide insights",
          "Tap the + button to add feeding, naps, or diaper changes"
        ],
        icon: Baby,
        confidence: 1.0
      });
      return insights;
    }

    // Current day summary - fix field mapping
    const totalIntakeToday = todayFeeds.reduce((sum, f) => {
      const quantity = f.details?.quantity || f.details?.amount || 0;
      return sum + (parseFloat(quantity) || 0);
    }, 0);
    
    // Calculate total nap time properly
    const totalNapTimeToday = todayNaps.reduce((sum, n) => {
      if (n.details?.duration) {
        // Parse duration string like "1h 30m" or "45m"
        const duration = n.details.duration;
        if (typeof duration === 'string') {
          const hours = duration.match(/(\d+)h/)?.[1] || '0';
          const minutes = duration.match(/(\d+)m/)?.[1] || '0';
          return sum + (parseInt(hours) * 60) + parseInt(minutes);
        }
        return sum + parseInt(duration) || 0;
      }
      // Fallback: calculate from start/end times
      if (n.details?.startTime && n.details?.endTime) {
        const start = new Date(`1970-01-01 ${n.details.startTime}`);
        const end = new Date(`1970-01-01 ${n.details.endTime}`);
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return sum;
    }, 0);
    
    let todayStatus = "tracking well";
    const currentHour = new Date().getHours();
    
    if (currentHour < 12 && todayFeeds.length === 0) {
      todayStatus = "haven't logged morning feed yet";
    } else if (currentHour > 18 && todayFeeds.length < 4) {
      todayStatus = "fewer feeds than usual today";
    }

    insights.push({
      title: "Today's Progress",
      summary: `${todayFeeds.length} feeds • ${isNaN(totalNapTimeToday) || totalNapTimeToday === 0 ? '0h' : Math.round(totalNapTimeToday / 60) + 'h'} sleep • ${todayDiapers.length} diapers`,
      bullets: [
        totalIntakeToday > 0 ? `Total intake: ${totalIntakeToday}${todayFeeds.some(f => f.details?.unit === 'ml') ? 'ml' : 'oz'}` : "No intake tracked yet today",
        todayNaps.length > 0 && totalNapTimeToday > 0 && !isNaN(totalNapTimeToday) ? `Nap time: ${Math.floor(totalNapTimeToday / 60)}h ${totalNapTimeToday % 60}m` : todayNaps.length > 0 ? "Nap logged (calculating time...)" : "No naps logged today",
        `Status: ${todayStatus}`
      ].filter(Boolean),
      icon: Clock,
      confidence: todayFeeds.length >= 2 ? 0.85 : 0.6
    });

    // 2. What's Next Prediction
    if (activities.length >= 3) {
      const recentFeeds = activities
        .filter(a => a.type === "feed")
        .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
        .slice(0, 4);

      if (recentFeeds.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recentFeeds.length; i++) {
          const diff = (new Date(recentFeeds[i-1].logged_at).getTime() - new Date(recentFeeds[i].logged_at).getTime()) / (1000 * 60);
          intervals.push(diff);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastFeed = new Date(recentFeeds[0].logged_at);
        const nextFeed = new Date(lastFeed.getTime() + avgInterval * 60 * 1000);
        const minutesUntil = Math.round((nextFeed.getTime() - new Date().getTime()) / (1000 * 60));
        
        let timing = "soon";
        if (minutesUntil > 60) timing = `in ${Math.round(minutesUntil / 60)}h`;
        else if (minutesUntil > 0) timing = `in ${minutesUntil}m`;
        else if (minutesUntil > -30) timing = "now";
        else timing = "overdue";

        insights.push({
          title: "Next Feed Prediction",
          summary: `Expected ${timing} around ${format(nextFeed, "h:mma")}`,
          bullets: [
            `Based on ${recentFeeds.length} recent feeds`,
            `Average interval: ${Math.round(avgInterval / 60)}h ${Math.round(avgInterval % 60)}m`,
            minutesUntil < -30 ? "⚠️ Later than usual pattern" : "📍 Following typical schedule"
          ],
          icon: Target,
          confidence: Math.min(0.9, recentFeeds.length / 4)
        });
      }
    }

    // 3. Anomaly Detection (show if any detected)
    if (yesterdayActivities.length > 0 && weekActivities.length > 7) {
      const weeklyAvgFeeds = weekActivities.filter(a => a.type === "feed").length / 7;
      const yesterdayFeeds = yesterdayActivities.filter(a => a.type === "feed").length;
      
      const anomalies = [];
      if (yesterdayFeeds > weeklyAvgFeeds * 1.4) {
        anomalies.push("📈 Fed more frequently than usual yesterday");
      } else if (yesterdayFeeds < weeklyAvgFeeds * 0.6) {
        anomalies.push("📉 Fewer feeds than typical yesterday");
      }

      const weeklyNaps = weekActivities.filter(a => a.type === "nap");
      const avgNapDuration = weeklyNaps.reduce((sum, n) => {
        if (n.details?.duration) {
          const duration = n.details.duration;
          if (typeof duration === 'string') {
            const hours = duration.match(/(\d+)h/)?.[1] || '0';
            const minutes = duration.match(/(\d+)m/)?.[1] || '0';
            return sum + (parseInt(hours) * 60) + parseInt(minutes);
          }
          return sum + parseInt(duration) || 0;
        }
        if (n.details?.startTime && n.details?.endTime) {
          const start = new Date(`1970-01-01 ${n.details.startTime}`);
          const end = new Date(`1970-01-01 ${n.details.endTime}`);
          return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
        return sum;
      }, 0) / Math.max(weeklyNaps.length, 1);
      
      const yesterdayNaps = yesterdayActivities.filter(a => a.type === "nap");
      const yesterdayAvgNap = yesterdayNaps.reduce((sum, n) => {
        if (n.details?.duration) {
          const duration = n.details.duration;
          if (typeof duration === 'string') {
            const hours = duration.match(/(\d+)h/)?.[1] || '0';
            const minutes = duration.match(/(\d+)m/)?.[1] || '0';
            return sum + (parseInt(hours) * 60) + parseInt(minutes);
          }
          return sum + parseInt(duration) || 0;
        }
        if (n.details?.startTime && n.details?.endTime) {
          const start = new Date(`1970-01-01 ${n.details.startTime}`);
          const end = new Date(`1970-01-01 ${n.details.endTime}`);
          return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
        return sum;
      }, 0) / Math.max(yesterdayNaps.length, 1);
      
      if (yesterdayAvgNap < avgNapDuration * 0.7) {
        anomalies.push("😴 Shorter naps than usual yesterday");
      } else if (yesterdayAvgNap > avgNapDuration * 1.4) {
        anomalies.push("💤 Longer naps than normal yesterday");
      }

      if (anomalies.length > 0) {
        insights.push({
          title: "Pattern Alerts",
          summary: `${anomalies.length} things worth noting`,
          bullets: anomalies,
          icon: AlertCircle,
          confidence: 0.8
        });
      }
    }

    // 4. Weekly Trends Summary
    if (weekActivities.length > 10) {
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
      const todayFeeds = feedsByDay[format(today, "yyyy-MM-dd")] || 0;

      let trendDirection = "steady";
      if (todayFeeds > avgFeeds * 1.2) trendDirection = "increasing";
      else if (todayFeeds < avgFeeds * 0.8) trendDirection = "decreasing";

      insights.push({
        title: "Weekly Pattern",
        summary: `Averaging ${avgFeeds.toFixed(1)} feeds and ${avgNaps.toFixed(1)} naps daily`,
        bullets: [
          `Most consistent: ${avgFeeds > avgNaps ? "Feeding schedule" : "Nap routine"}`,
          `Trend: ${trendDirection} feeding frequency`,
          `Range: ${Math.min(...(Object.values(feedsByDay) as number[]))}-${Math.max(...(Object.values(feedsByDay) as number[]))} feeds per day`
        ],
        icon: TrendingUp,
        confidence: 0.7
      });
    }

    // 5. Age-appropriate guidance (if birth date provided)
    if (babyBirthDate) {
      const ageInWeeks = differenceInWeeks(new Date(), babyBirthDate);
      let guidance = [];
      let agePhase = "";

      if (ageInWeeks < 6) {
        agePhase = "Newborn phase";
        guidance = [
          "Every 2-3 hours feeding is normal",
          "14-17 hours total sleep expected", 
          "Growth spurts around weeks 2-3, 6"
        ];
      } else if (ageInWeeks < 16) {
        agePhase = "Early infant";
        guidance = [
          "4-6 hour stretches becoming possible",
          "More predictable patterns emerging",
          "Night feeds may still be needed"
        ];
      } else if (ageInWeeks < 26) {
        agePhase = "Established routine phase";
        guidance = [
          "3-4 feeds per day becoming standard",
          "2-3 regular naps expected",
          "6-8 hour night stretches achievable"
        ];
      } else {
        agePhase = "Mobile baby";
        guidance = [
          "Solid foods affecting milk intake",
          "2 main naps + possible short nap",
          "10-12 hour nights possible"
        ];
      }

      insights.push({
        title: `${agePhase} (${ageInWeeks} weeks)`,
        summary: "Age-appropriate expectations",
        bullets: guidance,
        icon: Baby,
        confidence: 0.9
      });
    }

    return insights.slice(0, 5); // Limit to most important insights
  };

  const cards = getAllInsights();

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Your Assistant</h2>
        <p className="text-sm text-muted-foreground">Here's what I'm noticing about your baby's patterns</p>
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {card.title}
                </CardTitle>
                <p className="text-sm font-medium text-muted-foreground">{card.summary}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {card.bullets.map((bullet, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
        
        {cards.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Baby className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Start logging activities to see personalized insights</p>
            </CardContent>
          </Card>
        )}

        {/* Daily Review Prompt */}
        {showReviewPrompt && (
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="w-6 h-6 text-purple-500" />
                <div>
                  <h3 className="font-semibold text-purple-900">Your Night Doula</h3>
                  <p className="text-sm text-purple-700">Want to hear about your day?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={startDailyReview}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  size="sm"
                >
                  Yes, tell me
                </Button>
                <Button 
                  onClick={() => setShowReviewPrompt(false)}
                  variant="outline"
                  size="sm"
                >
                  Maybe later
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Review Display */}
        {showDailyReview && (
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-500" />
                  <span className="text-purple-900">Your Day Together</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDailyReview(false)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/70 rounded-lg p-4 border border-purple-100">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {typedText}
                  {isTyping && (
                    <span className="animate-pulse text-purple-500">|</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};