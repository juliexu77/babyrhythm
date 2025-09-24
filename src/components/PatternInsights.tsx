import { Activity } from "./ActivityCard";
import { Brain, Clock, TrendingUp, Baby, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PatternInsightsProps {
  activities: Activity[];
}

export const PatternInsights = ({ activities }: PatternInsightsProps) => {
  const getTimeInMinutes = (timeString: string) => {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  const analyzePatterns = () => {
    const insights: Array<{
      icon: any;
      text: string;
      confidence: 'high' | 'medium' | 'low';
      type: 'feeding' | 'sleep' | 'general';
    }> = [];

    // Analyze feeding patterns
    const feeds = activities.filter(a => a.type === 'feed');
    if (feeds.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < feeds.length; i++) {
        const current = getTimeInMinutes(feeds[i-1].time);
        const previous = getTimeInMinutes(feeds[i].time);
        const interval = Math.abs(current - previous);
        if (interval > 30 && interval < 360) { // Between 30 min and 6 hours
          intervals.push(interval);
        }
      }

      if (intervals.length >= 2) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const hours = Math.round(avgInterval / 60 * 10) / 10;
        
        insights.push({
          icon: Baby,
          text: `Usually feeds every ${hours}h`,
          confidence: intervals.length >= 5 ? 'high' : intervals.length >= 3 ? 'medium' : 'low',
          type: 'feeding'
        });

        // Check for consistency
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev < 30) { // Very consistent timing
          insights.push({
            icon: Clock,
            text: 'Very consistent feeding schedule',
            confidence: 'high',
            type: 'feeding'
          });
        } else if (stdDev > 90) {
          insights.push({
            icon: TrendingUp,
            text: 'Feeding times vary - growing appetite?',
            confidence: 'medium',
            type: 'feeding'
          });
        }
      }
    }

    // Analyze nap patterns
    const naps = activities.filter(a => a.type === 'nap');
    if (naps.length >= 2) {
      insights.push({
        icon: Moon,
        text: `Taking ${naps.length} naps on average`,
        confidence: 'medium',
        type: 'sleep'
      });

      // Check nap timing patterns
      const napTimes = naps.map(nap => getTimeInMinutes(nap.time));
      const morningNaps = napTimes.filter(time => time < 12 * 60).length;
      const afternoonNaps = napTimes.filter(time => time >= 12 * 60 && time < 18 * 60).length;
      
      if (morningNaps > afternoonNaps && morningNaps >= 2) {
        insights.push({
          icon: Moon,
          text: 'Prefers morning naps',
          confidence: 'medium',
          type: 'sleep'
        });
      } else if (afternoonNaps > morningNaps && afternoonNaps >= 2) {
        insights.push({
          icon: Moon,
          text: 'Afternoon sleeper',
          confidence: 'medium',
          type: 'sleep'
        });
      }
    }

    // Analyze daily totals
    const dailyFeeds = feeds.length;
    if (dailyFeeds >= 6 && dailyFeeds <= 8) {
      insights.push({
        icon: Baby,
        text: 'Healthy feeding frequency',
        confidence: 'high',
        type: 'general'
      });
    } else if (dailyFeeds > 10) {
      insights.push({
        icon: Baby,
        text: 'Frequent feeder - growth spurts?',
        confidence: 'medium',
        type: 'general'
      });
    }

    return insights;
  };

  const insights = analyzePatterns();

  if (insights.length === 0) {
    return null;
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-purple-600" />
          Pattern Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${getConfidenceColor(insight.confidence)}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{insight.text}</span>
                {insight.confidence === 'high' && (
                  <span className="text-xs bg-white/50 px-2 py-1 rounded-full ml-auto">
                    High confidence
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {insights.length >= 3 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-700">
              💡 These patterns are based on your recent activities. The more you track, the more accurate they become!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};