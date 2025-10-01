import { Activity } from "@/components/ActivityCard";
import { Brain, Clock, TrendingUp, Baby, Moon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
          text: `${t('usuallyFeedsEvery')} ${hours}h`,
          confidence: intervals.length >= 5 ? 'high' : intervals.length >= 3 ? 'medium' : 'low',
          type: 'feeding',
          details: {
            description: t('basedOnIntervals').replace('{count}', intervals.length.toString()).replace('{hours}', hours.toString()),
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
            text: `${t('feedsEvery')} ${hours}h ±${Math.round(stdDev)}min`,
            confidence: 'high',
            type: 'feeding',
            details: {
              description: t('highlyPredictable').replace('{minutes}', Math.round(stdDev).toString()).replace('{hours}', hours.toString()),
              data: intervals.map(({ interval, feed1, feed2 }) => ({
                activity: feed1,
                value: `${Math.round(interval / 60 * 10) / 10}h`,
                calculation: `Deviation: ${Math.round(Math.abs(interval - avgInterval))}min`
              }))
            }
          });
        } else if (stdDev > 90) {
          insights.push({
            icon: TrendingUp,
            text: t('feedingTimesVary'),
            confidence: 'medium',
            type: 'feeding',
            details: {
              description: t('feedingIntervalsVary').replace('{minutes}', Math.round(stdDev).toString()),
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

    // Analyze nap patterns - use recent week's worth of daytime naps for better pattern detection
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const naps = activities.filter(a => {
      if (a.type !== 'nap') return false;
      if (!a.loggedAt) return true; // Include if no timestamp (fallback)
      const activityDate = new Date(a.loggedAt);
      if (activityDate < weekAgo) return false; // Only include last 7 days
      
      // Only count daytime naps (exclude overnight sleep)
      const napTime = getTimeInMinutes(a.time);
      // Exclude naps that start after 6 PM (likely overnight sleep)
      if (napTime >= 18 * 60) return false;
      
      return true;
    });
    
    if (naps.length >= 3) {
      // Instead of just counting, look for meaningful nap patterns
      const todayNaps = naps.filter(n => {
        if (!n.loggedAt) return false;
        const activityDate = new Date(n.loggedAt);
        const today = new Date();
        return activityDate.toDateString() === today.toDateString();
      });
      
      // Only show nap insights if there's something meaningful to say
      const napTimes = naps.map(nap => getTimeInMinutes(nap.time));
      const morningNaps = napTimes.filter(time => time < 12 * 60);
      const afternoonNaps = napTimes.filter(time => time >= 12 * 60 && time < 18 * 60);
      
      if (morningNaps.length > afternoonNaps.length && morningNaps.length >= 2) {
        const morningNapActivities = naps.filter(nap => getTimeInMinutes(nap.time) < 12 * 60);
        insights.push({
          icon: Moon,
          text: `${morningNaps.length}/${naps.length} ${t('napsBeforeNoon')}`,
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: t('strongMorningNap').replace('{morning}', morningNaps.length.toString()).replace('{total}', naps.length.toString()),
            data: morningNapActivities.slice(-5).map(nap => ({
              activity: nap,
              value: nap.time,
              calculation: 'Morning nap'
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
          text: `${afternoonNaps.length}/${naps.length} ${t('napsAfterLunch')}`,
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: t('afternoonSleepPreference').replace('{afternoon}', afternoonNaps.length.toString()).replace('{total}', naps.length.toString()),
            data: afternoonNapActivities.slice(-5).map(nap => ({
              activity: nap,
              value: nap.time,
              calculation: 'Afternoon nap'
            }))
          }
        });
      }
    }

    // Analyze wake windows using recent week's nap data for better pattern detection across days
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
      // Group naps by day to handle cross-day wake windows properly
      const napsByDay = new Map<string, typeof completedDaytimeNaps>();
      completedDaytimeNaps.forEach(nap => {
        if (!nap.loggedAt) return;
        const dateKey = new Date(nap.loggedAt).toDateString();
        if (!napsByDay.has(dateKey)) {
          napsByDay.set(dateKey, []);
        }
        napsByDay.get(dateKey)!.push(nap);
      });

      // Sort days and calculate wake windows within each day and across days
      const sortedDays = Array.from(napsByDay.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      for (let dayIndex = 0; dayIndex < sortedDays.length; dayIndex++) {
        const dayNaps = napsByDay.get(sortedDays[dayIndex])!.sort((a, b) => {
          const aTime = getTimeInMinutes(a.details.startTime!);
          const bTime = getTimeInMinutes(b.details.startTime!);
          return aTime - bTime;
        });
        
        // Calculate wake windows within the same day
        for (let i = 1; i < dayNaps.length; i++) {
          const prevNapEnd = getTimeInMinutes(dayNaps[i-1].details.endTime!);
          const currentNapStart = getTimeInMinutes(dayNaps[i].details.startTime!);
          
          let wakeTime = currentNapStart - prevNapEnd;
          
          // Only include reasonable wake windows (30 min to 6 hours)
          if (wakeTime >= 30 && wakeTime <= 360) {
            wakeWindows.push({
              duration: wakeTime,
              afterNap: dayNaps[i-1],
              beforeNap: dayNaps[i]
            });
          }
        }
        
        // Calculate wake window from last nap of previous day to first nap of current day
        if (dayIndex > 0) {
          const prevDayNaps = napsByDay.get(sortedDays[dayIndex - 1])!.sort((a, b) => {
            const aTime = getTimeInMinutes(a.details.startTime!);
            const bTime = getTimeInMinutes(b.details.startTime!);
            return aTime - bTime;
          });
          
          if (prevDayNaps.length > 0 && dayNaps.length > 0) {
            const lastNapPrevDay = prevDayNaps[prevDayNaps.length - 1];
            const firstNapCurrentDay = dayNaps[0];
            
            const prevDayNapEnd = getTimeInMinutes(lastNapPrevDay.details.endTime!);
            const currentDayNapStart = getTimeInMinutes(firstNapCurrentDay.details.startTime!);
            
            // Calculate cross-day wake window (add 24 hours for next day)
            let crossDayWakeTime = (24 * 60) - prevDayNapEnd + currentDayNapStart;
            
            // Only include reasonable cross-day wake windows (4 to 18 hours)
            if (crossDayWakeTime >= 240 && crossDayWakeTime <= 1080) {
              wakeWindows.push({
                duration: crossDayWakeTime,
                afterNap: lastNapPrevDay,
                beforeNap: firstNapCurrentDay
              });
            }
          }
        }
      }

      if (wakeWindows.length >= 1) {
        const avgWakeWindow = wakeWindows.reduce((sum, w) => sum + w.duration, 0) / wakeWindows.length;
        const hours = Math.floor(avgWakeWindow / 60);
        const minutes = Math.round(avgWakeWindow % 60);
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        insights.push({
          icon: Clock,
          text: `${t('yourBabyStaysAwake')} ~${timeText} ${t('betweenNaps')}`,
          confidence: wakeWindows.length >= 3 ? 'high' : 'medium',
          type: 'sleep',
          details: {
            description: t('wakeWindowPattern').replace('{count}', wakeWindows.length.toString()).replace('{time}', timeText),
            data: wakeWindows.map(({ duration, afterNap, beforeNap }) => {
              const wHours = Math.floor(duration / 60);
              const wMinutes = Math.round(duration % 60);
              const wTimeText = wHours > 0 ? `${wHours}h ${wMinutes}m` : `${wMinutes}m`;
              
              const afterDate = afterNap.loggedAt ? new Date(afterNap.loggedAt).toLocaleDateString() : 'Recent';
              const beforeDate = beforeNap.loggedAt ? new Date(beforeNap.loggedAt).toLocaleDateString() : 'Recent';
              const isCrossDay = afterDate !== beforeDate;
              
              return {
                activity: beforeNap,
                value: wTimeText,
                calculation: isCrossDay 
                  ? `Cross-day: ${afterDate} ${afterNap.details.endTime} to ${beforeDate} ${beforeNap.details.startTime}`
                  : `Same day: ${afterNap.details.endTime} to ${beforeNap.details.startTime}`
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
          const direction = isGettingLater ? t('later') : t('earlier');
          insights.push({
            icon: Moon,
            text: `${t('bedtimeTrending')} ${direction} ${t('nowAround')} ~${bedtimeText}`,
            confidence: 'medium',
            type: 'sleep',
            details: {
              description: t('bedtimeOver')
                .replace('{days}', bedtimes.length.toString())
                .replace('{direction}', direction)
                .replace('{time}', bedtimeText)
                .replace('{minutes}', Math.round(timeDiff).toString())
                .replace('{direction}', direction),
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
            text: `${t('consistentBedtime')} ~${bedtimeText}`,
            confidence: 'high',
            type: 'sleep',
            details: {
              description: t('consistentBedtimeDesc').replace('{time}', bedtimeText),
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
          text: `${t('averageBedtime')} ~${bedtimeText}`,
          confidence: 'medium',
          type: 'sleep',
          details: {
            description: t('avgBedtimeDesc')
              .replace('{days}', bedtimes.length.toString())
              .replace('{time}', bedtimeText),
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

    if (recentFeeds.length >= 10) {
      const feedCounts = Array.from(feedCountsByDate.values());
      const totalFeeds = feedCounts.reduce((sum, count) => sum + count, 0);
      const avgFeeds = Math.round(totalFeeds / 7 * 10) / 10;
      
      // Check for consistency - only show if there's something meaningful
      const variance = feedCounts.reduce((sum, count) => sum + Math.pow(count - avgFeeds, 2), 0) / feedCounts.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev <= 1) {
        insights.push({
          icon: Baby,
          text: `${avgFeeds} feeds/day (±0.${Math.round(stdDev * 10)} variation)`,
          confidence: 'high',
          type: 'feeding',
          details: {
            description: `Consistent daily intake pattern established. Daily feed count varies by less than 1 feed.`,
            data: Array.from(feedCountsByDate.entries()).slice(-5).map(([date, count]) => ({
              activity: feeds[0],
              value: `${count} feeds`,
              calculation: `${new Date(date).toLocaleDateString()}`
            })),
            calculation: `Standard deviation: ${Math.round(stdDev * 100)/100}`
          }
        });
      }
    }

    // Additional pattern insights (rotating selection)
    const additionalInsights: PatternInsight[] = [];

    // 3. Sweet Dreams Pattern - Only show if naps have interesting qualities
    const napsWithDuration = naps.filter(nap => nap.details.startTime && nap.details.endTime);
    if (napsWithDuration.length >= 4) {
      const napDurations = napsWithDuration.map(nap => {
        const start = getTimeInMinutes(nap.details.startTime!);
        const end = getTimeInMinutes(nap.details.endTime!);
        let duration = end - start;
        if (duration < 0) duration += 24 * 60; // Handle overnight
        return { duration, activity: nap };
      }).filter(n => n.duration <= 4 * 60 && n.duration >= 10); // Reasonable nap lengths

      if (napDurations.length >= 3) {
        const avgDuration = napDurations.reduce((sum, n) => sum + n.duration, 0) / napDurations.length;
        const hours = Math.floor(avgDuration / 60);
        const minutes = Math.round(avgDuration % 60);
        
        // Only show if naps are notably short (power naps) or notably long (deep sleeper)
        if (avgDuration <= 30) {
          additionalInsights.push({
            icon: Moon,
            text: `Brief naps: ${minutes}min average`,
            confidence: 'medium',
            type: 'sleep',
            details: {
              description: `Short nap pattern detected. Average duration ${minutes} minutes suggests possible sleep cycle interruption.`,
              data: napDurations.slice(-5).map(({ duration, activity }) => {
                const m = Math.round(duration);
                return {
                  activity,
                  value: `${m}min`,
                  calculation: `${activity.details.startTime} - ${activity.details.endTime}`
                };
              }),
              calculation: `${napDurations.length} naps analyzed`
            }
          });
        } else if (avgDuration >= 90) {
          const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          additionalInsights.push({
            icon: Moon,
            text: `Extended naps: ${durationText} average`,
            confidence: 'medium',
            type: 'sleep',
            details: {
              description: `Long nap pattern detected. ${durationText} duration indicates complete sleep cycles.`,
              data: napDurations.slice(-5).map(({ duration, activity }) => {
                const h = Math.floor(duration / 60);
                const m = Math.round(duration % 60);
                const durText = h > 0 ? `${h}h ${m}m` : `${m}m`;
                return {
                  activity,
                  value: durText,
                  calculation: `${activity.details.startTime} - ${activity.details.endTime}`
                };
              }),
              calculation: `${napDurations.length} naps analyzed`
            }
          });
        }
      }
    }


    // 8. Nursing Rhythm - Only show if there's something special about their pattern
    const nursingFeeds = feeds.filter(feed => 
      feed.details.feedType === 'nursing' && 
      (feed.details.minutesLeft || feed.details.minutesRight)
    );
    
    if (nursingFeeds.length >= 5) {
      const durations = nursingFeeds.map(feed => {
        const left = parseInt(feed.details.minutesLeft) || 0;
        const right = parseInt(feed.details.minutesRight) || 0;
        return { total: left + right, left, right, activity: feed };
      }).filter(d => d.total > 0 && d.total <= 60);

      if (durations.length >= 3) {
        const avgTotal = durations.reduce((sum, d) => sum + d.total, 0) / durations.length;
        const leftSideFeeds = durations.filter(d => d.left > d.right);
        const rightSideFeeds = durations.filter(d => d.right > d.left);
        
        // Show insights about nursing preferences or efficiency
        if (leftSideFeeds.length > rightSideFeeds.length * 1.5) {
          additionalInsights.push({
            icon: Baby,
            text: `Left side preference: ${leftSideFeeds.length}/${durations.length} sessions`,
            confidence: 'medium',
            type: 'feeding',
            details: {
              description: `Strong left side nursing preference detected in ${Math.round(leftSideFeeds.length/durations.length*100)}% of sessions.`,
              data: leftSideFeeds.slice(-5).map(({ left, right, activity }) => ({
                activity,
                value: `L:${left}min R:${right}min`,
                calculation: `Left side dominance`
              })),
              calculation: `${leftSideFeeds.length} left-dominant sessions`
            }
          });
        } else if (rightSideFeeds.length > leftSideFeeds.length * 1.5) {
          additionalInsights.push({
            icon: Baby,
            text: `Right side preference: ${rightSideFeeds.length}/${durations.length} sessions`,
            confidence: 'medium',
            type: 'feeding',
            details: {
              description: `Strong right side nursing preference detected in ${Math.round(rightSideFeeds.length/durations.length*100)}% of sessions.`,
              data: rightSideFeeds.slice(-5).map(({ left, right, activity }) => ({
                activity,
                value: `L:${left}min R:${right}min`,
                calculation: `Right side dominance`
              })),
              calculation: `${rightSideFeeds.length} right-dominant sessions`
            }
          });
        } else if (avgTotal <= 10) {
          additionalInsights.push({
            icon: Baby,
            text: `Efficient nursing: ${Math.round(avgTotal)}min average`,
            confidence: 'medium',
            type: 'feeding',
            details: {
              description: `Brief nursing pattern detected. ${Math.round(avgTotal)}-minute sessions indicate efficient milk transfer.`,
              data: durations.slice(-5).map(({ total, left, right, activity }) => ({
                activity,
                value: `${total}min (L:${left} R:${right})`,
                calculation: `Session duration`
              })),
              calculation: `${durations.length} sessions analyzed`
            }
          });
        }
      }
    }

    // 14. Weekend vs Weekday Patterns
    const activitiesWithDates = activities.filter(a => a.loggedAt);
    if (activitiesWithDates.length >= 10) {
      const weekdayActivities = activitiesWithDates.filter(a => {
        const day = new Date(a.loggedAt!).getDay();
        return day >= 1 && day <= 5; // Monday-Friday
      });
      
      const weekendActivities = activitiesWithDates.filter(a => {
        const day = new Date(a.loggedAt!).getDay();
        return day === 0 || day === 6; // Saturday-Sunday
      });

      if (weekdayActivities.length >= 5 && weekendActivities.length >= 3) {
        const weekdayFeeds = weekdayActivities.filter(a => a.type === 'feed').length;
        const weekendFeeds = weekendActivities.filter(a => a.type === 'feed').length;
        const weekdayAvg = weekdayFeeds / Math.min(5, weekdayActivities.length / 3); // Rough daily average
        const weekendAvg = weekendFeeds / Math.min(2, weekendActivities.length / 3);
        
        if (Math.abs(weekendAvg - weekdayAvg) >= 1) {
          const more = weekendAvg > weekdayAvg ? t('moreFeeds') : t('lessFeeds');
          const diff = Math.round(Math.abs(weekendAvg - weekdayAvg) * 10) / 10;
          
          additionalInsights.push({
            icon: Clock,
            text: `${diff} ${more} ${t('onWeekends')}`,
            confidence: 'medium',
            type: 'general',
            details: {
              description: t('weekendFeedsDesc')
                .replace('{weekend}', (Math.round(weekendAvg * 10) / 10).toString())
                .replace('{weekday}', (Math.round(weekdayAvg * 10) / 10).toString()),
              data: [
                ...weekdayActivities.filter(a => a.type === 'feed').slice(-3).map(a => ({
                  activity: a,
                  value: a.time,
                  calculation: `Weekday feeding`
                })),
                ...weekendActivities.filter(a => a.type === 'feed').slice(-2).map(a => ({
                  activity: a,
                  value: a.time,
                  calculation: `Weekend feeding`
                }))
              ],
              calculation: `Weekday avg: ${Math.round(weekdayAvg * 10) / 10}, Weekend avg: ${Math.round(weekendAvg * 10) / 10}`
            }
          });
        }
      }
    }


    // Group insights by type for sensible organization
    const allInsights = [...insights, ...additionalInsights];
    
    // Remove duplicates
    const uniqueInsights = allInsights.filter((insight, index, arr) => 
      arr.findIndex(i => i.text === insight.text) === index
    );
    
    // Group by type
    const feedingInsights = uniqueInsights.filter(i => i.type === 'feeding');
    const sleepInsights = uniqueInsights.filter(i => i.type === 'sleep');
    const generalInsights = uniqueInsights.filter(i => i.type === 'general');
    
    // Create day-based rotation for each group
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Select insights from each group with rotation
    const selectedFeeding = feedingInsights.length > 0 
      ? feedingInsights.slice(0, Math.min(3, feedingInsights.length))
      : [];
    
    const selectedSleep = sleepInsights.length > 0 
      ? sleepInsights.slice(0, Math.min(2, sleepInsights.length))
      : [];
    
    const rotationIndex = dayOfYear % Math.max(1, generalInsights.length);
    const selectedGeneral = generalInsights.length > 0 
      ? generalInsights.slice(rotationIndex, rotationIndex + 1).concat(
          generalInsights.slice(0, Math.max(0, (rotationIndex + 1) - generalInsights.length))
        ).slice(0, 1)
      : [];
    
    // Combine groups in logical order: feeding, sleep, then general
    const finalInsights = [...selectedFeeding, ...selectedSleep, ...selectedGeneral];
    
    return finalInsights;
  };

  return {
    insights: analyzePatterns(),
    getTimeInMinutes
  };
};