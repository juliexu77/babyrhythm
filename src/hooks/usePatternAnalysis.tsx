import { Activity } from "@/components/ActivityCard";
import { Brain, Clock, TrendingUp, Baby, Moon } from "lucide-react";

export interface PatternInsight {
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
}

export const usePatternAnalysis = (activities: Activity[]) => {
  const getTimeInMinutes = (timeString: string) => {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  const analyzePatterns = (): PatternInsight[] => {
    const insights: PatternInsight[] = [];

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

    // Analyze nap patterns - filter for today's daytime naps only
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const naps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      if (!a.loggedAt) return true; // Include if no timestamp (fallback)
      const activityDate = new Date(a.loggedAt);
      if (!(activityDate >= todayStart && activityDate < todayEnd)) return false;
      
      // Only count daytime naps (exclude overnight sleep)
      const napTime = getTimeInMinutes(a.time);
      // Exclude naps that start after 6 PM (likely overnight sleep)
      if (napTime >= 18 * 60) return false;
      
      return true;
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

    // Analyze wake windows (time between daytime naps only)
    const completedDaytimeNaps = naps.filter(nap => {
      if (!nap.details.startTime || !nap.details.endTime) return false;
      
      const startTime = getTimeInMinutes(nap.details.startTime);
      const endTime = getTimeInMinutes(nap.details.endTime);
      
      // Only consider daytime naps (start between 6 AM and 6 PM)
      // Exclude overnight sleep periods
      if (startTime < 6 * 60 || startTime >= 18 * 60) return false;
      
      // Also exclude naps that span too long (likely overnight sleep)
      const duration = endTime >= startTime ? endTime - startTime : (24 * 60) - startTime + endTime;
      if (duration > 4 * 60) return false; // Exclude naps longer than 4 hours
      
      return true;
    });
    
    if (completedDaytimeNaps.length >= 2) {
      const wakeWindows: Array<{ duration: number; afterNap: Activity; beforeNap: Activity }> = [];
      
      // Sort daytime naps by start time to get chronological order
      const sortedNaps = [...completedDaytimeNaps].sort((a, b) => {
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
            description: `Based on ${wakeWindows.length} wake windows between daytime naps today, your baby typically stays awake for ${timeText} between naps. This is a good indicator of their natural rhythm.`,
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

    // Analyze bedtime trends and daily feeding totals
    const bedtimes: Array<{ time: number; activity: Activity; date: string }> = [];
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

    // Find bedtime patterns
    activitiesByDate.forEach((dayActivities, dateKey) => {
      const eveningSleepActivities = dayActivities.filter(activity => {
        if (activity.type !== 'nap') return false;
        const activityTime = getTimeInMinutes(activity.time);
        if (activityTime < 18 * 60) return false;
        if (activity.details.isDreamFeed) return false;
        return true;
      });
      
      if (eveningSleepActivities.length > 0) {
        const latestSleepActivity = eveningSleepActivities.reduce((latest, current) => {
          const latestTime = getTimeInMinutes(latest.time);
          const currentTime = getTimeInMinutes(current.time);
          return currentTime > latestTime ? current : latest;
        });
        
        const bedtimeMinutes = getTimeInMinutes(latestSleepActivity.time);
        if (bedtimeMinutes >= 18 * 60 && bedtimeMinutes <= 23 * 60) {
          bedtimes.push({
            time: bedtimeMinutes,
            activity: latestSleepActivity,
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

      if (bedtimes.length >= 4) {
        const firstHalf = bedtimes.slice(0, Math.floor(bedtimes.length / 2));
        const secondHalf = bedtimes.slice(Math.floor(bedtimes.length / 2));
        const firstAvg = firstHalf.reduce((sum, b) => sum + b.time, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, b) => sum + b.time, 0) / secondHalf.length;
        const timeDiff = Math.abs(secondAvg - firstAvg);

        if (timeDiff >= 30) {
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

    // Analyze daily totals - average feeds per day over past 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const feedCountsByDate = new Map<string, number>();
    
    // Initialize all dates in the past 7 days with 0 counts
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      feedCountsByDate.set(d.toDateString(), 0);
    }
    
    // Count feeds per day based on loggedAt timestamps
    const recentFeeds = feeds.filter(feed => {
      if (!feed.loggedAt) return;
      const d = new Date(feed.loggedAt);
      if (d >= sevenDaysAgo && d <= now) {
        const key = d.toDateString();
        const currentCount = feedCountsByDate.get(key) || 0;
        feedCountsByDate.set(key, currentCount + 1);
        return true;
      }
      return false;
    });

    if (recentFeeds.length >= 7) {
      const feedCounts = Array.from(feedCountsByDate.values());
      const totalFeeds = feedCounts.reduce((sum, count) => sum + count, 0);
      const avgFeeds = Math.round(totalFeeds / 7 * 10) / 10;
      
      // Check for consistency
      const variance = feedCounts.reduce((sum, count) => sum + Math.pow(count - avgFeeds, 2), 0) / feedCounts.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev <= 1) {
        insights.push({
          icon: Baby,
          text: `Very consistent feeding routine - ${avgFeeds} feeds/day`,
          confidence: 'high',
          type: 'feeding',
          details: {
            description: `Your baby has a very consistent feeding pattern, averaging ${avgFeeds} feeds per day with minimal variation.`,
            data: Array.from(feedCountsByDate.entries()).map(([date, count]) => ({
              activity: feeds[0], // Use first feed as representative
              value: `${count} feeds`,
              calculation: `${new Date(date).toLocaleDateString()}`
            })),
            calculation: `7-day average: ${feedCounts.join(' + ')} ÷ 7 = ${avgFeeds} feeds/day`
          }
        });
      } else if (avgFeeds >= 8) {
        insights.push({
          icon: Baby,
          text: `Frequent feeder - ${avgFeeds} feeds/day`,
          confidence: 'medium',
          type: 'feeding',
          details: {
            description: `Your baby feeds frequently with an average of ${avgFeeds} feeds per day. This could indicate a growth spurt or cluster feeding pattern.`,
            data: Array.from(feedCountsByDate.entries()).map(([date, count]) => ({
              activity: feeds[0],
              value: `${count} feeds`,
              calculation: `${new Date(date).toLocaleDateString()}`
            })),
            calculation: `7-day average: ${feedCounts.join(' + ')} ÷ 7 = ${avgFeeds} feeds/day`
          }
        });
      }
    }

    return insights;
  };

  return {
    insights: analyzePatterns(),
    getTimeInMinutes
  };
};