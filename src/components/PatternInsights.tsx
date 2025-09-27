import { Activity } from "./ActivityCard";
import { Brain, Clock, TrendingUp, Baby, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface PatternInsightsProps {
  activities: Activity[];
}

export const PatternInsights = ({ activities }: PatternInsightsProps) => {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

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
      details: {
        description: string;
        data: Array<{
          activity: Activity;
          value?: string | number;
          calculation?: string;
        }>;
        calculation?: string;
      };
    }> = [];

    // Analyze feeding patterns
    const feeds = activities.filter(a => a.type === 'feed');
    if (feeds.length >= 3) {
      const intervals: Array<{ interval: number; feed1: Activity; feed2: Activity }> = [];
      for (let i = 1; i < feeds.length; i++) {
        const current = getTimeInMinutes(feeds[i-1].time);
        const previous = getTimeInMinutes(feeds[i].time);
        const interval = Math.abs(current - previous);
        if (interval > 30 && interval < 360) { // Between 30 min and 6 hours
          intervals.push({
            interval,
            feed1: feeds[i],
            feed2: feeds[i-1]
          });
        }
      }

      if (intervals.length >= 2) {
        const avgInterval = intervals.reduce((a, b) => a + b.interval, 0) / intervals.length;
        const hours = Math.round(avgInterval / 60 * 10) / 10;
        
        insights.push({
          icon: Baby,
          text: `Usually feeds every ${hours}h`,
          confidence: intervals.length >= 5 ? 'high' : intervals.length >= 3 ? 'medium' : 'low',
          type: 'feeding',
          details: {
            description: `Based on ${intervals.length} feeding intervals, the average time between feeds is ${hours} hours.`,
            data: intervals.map(({ interval, feed1, feed2 }) => ({
              activity: feed1,
              value: `${Math.round(interval / 60 * 10) / 10}h`,
              calculation: `Time between ${feed2.time} and ${feed1.time}`
            })),
            calculation: `Average: ${intervals.map(i => Math.round(i.interval / 60 * 10) / 10).join(' + ')} ÷ ${intervals.length} = ${hours}h`
          }
        });

        // Check for consistency
        const variance = intervals.reduce((sum, { interval }) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev < 30) { // Very consistent timing
          insights.push({
            icon: Clock,
            text: 'Very consistent feeding schedule',
            confidence: 'high',
            type: 'feeding',
            details: {
              description: `Feeding intervals vary by only ${Math.round(stdDev)} minutes on average, showing high consistency.`,
              data: intervals.map(({ interval, feed1, feed2 }) => ({
                activity: feed1,
                value: `${Math.round(interval / 60 * 10) / 10}h`,
                calculation: `Deviation from average: ${Math.round(Math.abs(interval - avgInterval))} minutes`
              }))
            }
          });
        } else if (stdDev > 90) {
          insights.push({
            icon: TrendingUp,
            text: 'Feeding times vary - growing appetite?',
            confidence: 'medium',
            type: 'feeding',
            details: {
              description: `Feeding intervals vary by ${Math.round(stdDev)} minutes on average, which could indicate growth spurts or changing needs.`,
              data: intervals.map(({ interval, feed1, feed2 }) => ({
                activity: feed1,
                value: `${Math.round(interval / 60 * 10) / 10}h`,
                calculation: `Deviation from average: ${Math.round(Math.abs(interval - avgInterval))} minutes`
              }))
            }
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
        type: 'sleep',
        details: {
          description: `Recorded ${naps.length} nap activities. Here are the nap times:`,
          data: naps.map(nap => ({
            activity: nap,
            value: nap.details.startTime && nap.details.endTime 
              ? `${nap.details.startTime} - ${nap.details.endTime}`
              : nap.time,
            calculation: nap.details.startTime && nap.details.endTime 
              ? (() => {
                  const start = new Date(`2000/01/01 ${nap.details.startTime}`);
                  const end = new Date(`2000/01/01 ${nap.details.endTime}`);
                  const diffMs = end.getTime() - start.getTime();
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  return `Duration: ${hours}h ${minutes}m`;
                })()
              : 'Single time logged'
          }))
        }
      });

      // Check nap timing patterns
      const napTimes = naps.map(nap => getTimeInMinutes(nap.time));
      const morningNaps = napTimes.filter(time => time < 12 * 60);
      const afternoonNaps = napTimes.filter(time => time >= 12 * 60 && time < 18 * 60);
      
      if (morningNaps.length > afternoonNaps.length && morningNaps.length >= 2) {
        const morningNapActivities = naps.filter(nap => getTimeInMinutes(nap.time) < 12 * 60);
        insights.push({
          icon: Moon,
          text: 'Prefers morning naps',
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: `${morningNaps.length} out of ${naps.length} naps occur in the morning (before 12 PM).`,
            data: morningNapActivities.map(nap => ({
              activity: nap,
              value: nap.time,
              calculation: 'Morning nap (before 12 PM)'
            }))
          }
        });
      } else if (afternoonNaps.length > morningNaps.length && afternoonNaps.length >= 2) {
        const afternoonNapActivities = naps.filter(nap => {
          const time = getTimeInMinutes(nap.time);
          return time >= 12 * 60 && time < 18 * 60;
        });
        insights.push({
          icon: Moon,
          text: 'Afternoon sleeper',
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: `${afternoonNaps.length} out of ${naps.length} naps occur in the afternoon (12 PM - 6 PM).`,
            data: afternoonNapActivities.map(nap => ({
              activity: nap,
              value: nap.time,
              calculation: 'Afternoon nap (12 PM - 6 PM)'
            }))
          }
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
        type: 'general',
        details: {
          description: `${dailyFeeds} feeds per day falls within the typical range of 6-8 feeds for healthy babies.`,
          data: feeds.map(feed => ({
            activity: feed,
            value: feed.details.quantity && feed.details.unit 
              ? `${feed.details.quantity}${feed.details.unit}`
              : feed.details.feedType || 'Feed',
            calculation: `Feed #${feeds.indexOf(feed) + 1}`
          }))
        }
      });
    } else if (dailyFeeds > 10) {
      insights.push({
        icon: Baby,
        text: 'Frequent feeder - growth spurts?',
        confidence: 'medium',
        type: 'general',
        details: {
          description: `${dailyFeeds} feeds per day is above typical range, which could indicate growth spurts or increased appetite.`,
          data: feeds.map(feed => ({
            activity: feed,
            value: feed.details.quantity && feed.details.unit 
              ? `${feed.details.quantity}${feed.details.unit}`
              : feed.details.feedType || 'Feed',
            calculation: `Feed #${feeds.indexOf(feed) + 1} at ${feed.time}`
          }))
        }
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
            const isExpanded = expandedInsight === index;
            
            return (
              <div key={index} className="space-y-2">
                <button
                  onClick={() => setExpandedInsight(isExpanded ? null : index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:opacity-80 ${getConfidenceColor(insight.confidence)}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{insight.text}</span>
                  <div className="flex items-center gap-2">
                    {insight.confidence === 'high' && (
                      <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                        High confidence
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="ml-7 p-4 bg-white/50 rounded-lg border border-white/20">
                    <p className="text-sm text-gray-700 mb-3 font-medium">
                      {insight.details.description}
                    </p>
                    
                    {insight.details.calculation && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>Calculation:</strong> {insight.details.calculation}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Supporting Data ({insight.details.data.length} activities)
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {insight.details.data.map((item, dataIndex) => (
                          <div key={dataIndex} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              <span className="font-medium">{item.activity.time}</span>
                              <span className="text-gray-500 capitalize">
                                {item.activity.type}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{item.value}</div>
                              {item.calculation && (
                                <div className="text-gray-500 text-xs">{item.calculation}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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