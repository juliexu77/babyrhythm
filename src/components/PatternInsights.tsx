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

    // Analyze nap patterns - filter for today's naps only
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const naps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      if (!a.loggedAt) return true; // Include if no timestamp (fallback)
      const activityDate = new Date(a.loggedAt);
      return activityDate >= todayStart && activityDate < todayEnd;
    });
    
    if (naps.length >= 2) {
      insights.push({
        icon: Moon,
        text: `Taking ${naps.length} naps today`,
        confidence: 'medium',
        type: 'sleep',
        details: {
          description: `Recorded ${naps.length} nap activities today. Here are the nap times:`,
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

    // Analyze wake windows (time between naps)
    const completedNaps = naps.filter(nap => nap.details.startTime && nap.details.endTime);
    if (completedNaps.length >= 2) {
      const wakeWindows: Array<{ duration: number; afterNap: Activity; beforeNap: Activity }> = [];
      
      // Sort naps by start time to get chronological order
      const sortedNaps = [...completedNaps].sort((a, b) => {
        const aTime = getTimeInMinutes(a.details.startTime!);
        const bTime = getTimeInMinutes(b.details.startTime!);
        return aTime - bTime;
      });

      for (let i = 1; i < sortedNaps.length; i++) {
        const prevNapEnd = getTimeInMinutes(sortedNaps[i-1].details.endTime!);
        const currentNapStart = getTimeInMinutes(sortedNaps[i].details.startTime!);
        
        let wakeTime = currentNapStart - prevNapEnd;
        
        // Handle case where next nap is next day (add 24 hours)
        if (wakeTime < 0) {
          wakeTime += 24 * 60;
        }
        
        // Only include reasonable wake windows (30 min to 6 hours)
        if (wakeTime >= 30 && wakeTime <= 360) {
          wakeWindows.push({
            duration: wakeTime,
            afterNap: sortedNaps[i-1],
            beforeNap: sortedNaps[i]
          });
        }
      }

      if (wakeWindows.length >= 1) {
        const avgWakeWindow = wakeWindows.reduce((sum, w) => sum + w.duration, 0) / wakeWindows.length;
        const hours = Math.floor(avgWakeWindow / 60);
        const minutes = Math.round(avgWakeWindow % 60);
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        insights.push({
          icon: Clock,
          text: `Your baby stays awake ~${timeText} between naps`,
          confidence: wakeWindows.length >= 3 ? 'high' : 'medium',
          type: 'sleep',
          details: {
            description: `Based on ${wakeWindows.length} wake windows today, your baby typically stays awake for ${timeText} between naps. This is a good indicator of their natural rhythm.`,
            data: wakeWindows.map(({ duration, afterNap, beforeNap }) => {
              const wHours = Math.floor(duration / 60);
              const wMinutes = Math.round(duration % 60);
              const wTimeText = wHours > 0 ? `${wHours}h ${wMinutes}m` : `${wMinutes}m`;
              return {
                activity: beforeNap,
                value: wTimeText,
                calculation: `Awake from ${afterNap.details.endTime} to ${beforeNap.details.startTime}`
              };
            }),
            calculation: `Average: ${wakeWindows.map(w => {
              const h = Math.floor(w.duration / 60);
              const m = Math.round(w.duration % 60);
              return h > 0 ? `${h}h${m}m` : `${m}m`;
            }).join(' + ')} ÷ ${wakeWindows.length} = ${timeText}`
          }
        });
      }
    }

    // Analyze bedtime trends (look at last activity each day over past week)
    const bedtimes: Array<{ time: number; activity: Activity; date: string }> = [];
    
    // Group activities by date
    const activitiesByDate = new Map<string, Activity[]>();
    activities.forEach(activity => {
      if (!activity.loggedAt) return;
      const date = new Date(activity.loggedAt);
      const dateKey = date.toDateString();
      if (!activitiesByDate.has(dateKey)) {
        activitiesByDate.set(dateKey, []);
      }
      activitiesByDate.get(dateKey)!.push(activity);
    });

    // Find last activity of each day (potential bedtime indicator)
    activitiesByDate.forEach((dayActivities, dateKey) => {
      // Sort by time and get the latest activity that's after 6 PM
      const eveningActivities = dayActivities.filter(activity => {
        const activityTime = getTimeInMinutes(activity.time);
        return activityTime >= 18 * 60; // After 6 PM
      });
      
      if (eveningActivities.length > 0) {
        // Get the latest evening activity
        const latestActivity = eveningActivities.reduce((latest, current) => {
          const latestTime = getTimeInMinutes(latest.time);
          const currentTime = getTimeInMinutes(current.time);
          return currentTime > latestTime ? current : latest;
        });
        
        const bedtimeMinutes = getTimeInMinutes(latestActivity.time);
        // Only consider reasonable bedtimes (6 PM to 11 PM)
        if (bedtimeMinutes >= 18 * 60 && bedtimeMinutes <= 23 * 60) {
          bedtimes.push({
            time: bedtimeMinutes,
            activity: latestActivity,
            date: dateKey
          });
        }
      }
    });

    if (bedtimes.length >= 3) {
      const avgBedtime = bedtimes.reduce((sum, b) => sum + b.time, 0) / bedtimes.length;
      const bedtimeHours = Math.floor(avgBedtime / 60);
      const bedtimeMinutes = Math.round(avgBedtime % 60);
      const bedtimeText = `${bedtimeHours === 0 ? 12 : bedtimeHours > 12 ? bedtimeHours - 12 : bedtimeHours}:${bedtimeMinutes.toString().padStart(2, '0')} ${bedtimeHours >= 12 ? 'PM' : 'AM'}`;

      // Check for trend (compare first half vs second half of data)
      if (bedtimes.length >= 4) {
        const firstHalf = bedtimes.slice(0, Math.floor(bedtimes.length / 2));
        const secondHalf = bedtimes.slice(Math.floor(bedtimes.length / 2));
        const firstAvg = firstHalf.reduce((sum, b) => sum + b.time, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, b) => sum + b.time, 0) / secondHalf.length;
        const timeDiff = Math.abs(secondAvg - firstAvg);

        if (timeDiff >= 30) { // At least 30 minutes difference
          const isGettingLater = secondAvg > firstAvg;
          const direction = isGettingLater ? 'later' : 'earlier';
          insights.push({
            icon: Moon,
            text: `Bedtime trending ${direction} - now ~${bedtimeText}`,
            confidence: 'medium',
            type: 'sleep',
            details: {
              description: `Over the past ${bedtimes.length} days, bedtime has been trending ${direction}. Current average is ${bedtimeText}, which is ${Math.round(timeDiff)} minutes ${direction} than earlier this week.`,
              data: bedtimes.map(({ time, activity, date }) => {
                const h = Math.floor(time / 60);
                const m = Math.round(time % 60);
                const timeText = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                return {
                  activity,
                  value: timeText,
                  calculation: `Last activity on ${new Date(date).toLocaleDateString()}`
                };
              })
            }
          });
        } else {
          insights.push({
            icon: Moon,
            text: `Consistent bedtime routine ~${bedtimeText}`,
            confidence: 'high',
            type: 'sleep',
            details: {
              description: `Your baby has a consistent bedtime around ${bedtimeText}. This stable routine is great for healthy sleep patterns.`,
              data: bedtimes.map(({ time, activity, date }) => {
                const h = Math.floor(time / 60);
                const m = Math.round(time % 60);
                const timeText = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                return {
                  activity,
                  value: timeText,
                  calculation: `Bedtime on ${new Date(date).toLocaleDateString()}`
                };
              })
            }
          });
        }
      } else {
        insights.push({
          icon: Moon,
          text: `Average bedtime this week ~${bedtimeText}`,
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: `Based on ${bedtimes.length} recent days, your baby's average bedtime is around ${bedtimeText}. Keep tracking to see if patterns emerge.`,
            data: bedtimes.map(({ time, activity, date }) => {
              const h = Math.floor(time / 60);
              const m = Math.round(time % 60);
              const timeText = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
              return {
                activity,
                value: timeText,
                calculation: `Last activity on ${new Date(date).toLocaleDateString()}`
              };
            })
          }
        });
      }
    }

    // Analyze daily totals - average feeds per day over past 7 days (using loggedAt)
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6); // inclusive of today -> 7 days window
    start.setHours(0, 0, 0, 0);
    
    // Initialize counts for each day in the window
    const feedCountsByDate = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      feedCountsByDate.set(d.toDateString(), 0);
    }
    
    // Count feeds per day based on loggedAt timestamps
    feeds.forEach(feed => {
      if (!feed.loggedAt) return;
      const d = new Date(feed.loggedAt);
      if (d >= start && d <= now) {
        const key = d.toDateString();
        if (feedCountsByDate.has(key)) {
          feedCountsByDate.set(key, (feedCountsByDate.get(key) || 0) + 1);
        }
      }
    });
    
    // Calculate 7-day average (including days with zero feeds)
    const sumFeeds = Array.from(feedCountsByDate.values()).reduce((a, b) => a + b, 0);
    const avgDailyFeeds = Math.round(sumFeeds / 7);
    if (avgDailyFeeds >= 6 && avgDailyFeeds <= 8) {
      insights.push({
        icon: Baby,
        text: 'Healthy feeding frequency',
        confidence: 'high',
        type: 'general',
        details: {
          description: `Averaging ${avgDailyFeeds} feeds per day over the past 7 days falls within the typical range of 6-8 feeds for healthy babies.`,
          data: feeds.map(feed => ({
            activity: feed,
            value: feed.details.quantity && feed.details.unit 
              ? `${feed.details.quantity}${feed.details.unit}`
              : feed.details.feedType || 'Feed',
            calculation: `Feed #${feeds.indexOf(feed) + 1}`
          }))
        }
      });
    } else if (avgDailyFeeds > 10) {
      insights.push({
        icon: Baby,
        text: 'Frequent feeder - growth spurts?',
        confidence: 'medium',
        type: 'general',
        details: {
          description: `Averaging ${avgDailyFeeds} feeds per day over the past 7 days is above typical range, which could indicate growth spurts or increased appetite.`,
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