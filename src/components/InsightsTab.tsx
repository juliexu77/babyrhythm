import { Activity } from "./ActivityCard";
import { useState, useMemo } from "react";
import { Moon, Milk, Clock, Sun } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { normalizeVolume } from "@/utils/unitConversion";
import { TimelineChart } from "@/components/trends/TimelineChart";
import { CollectivePulse } from "@/components/home/CollectivePulse";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface InsightsTabProps {
  activities: Activity[];
}

type TimeRange = '6weeks' | '3months' | '6months';

export const InsightsTab = ({ activities }: InsightsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const [timeRange, setTimeRange] = useState<TimeRange>('6weeks');
  const [showBaseline, setShowBaseline] = useState(false);

  // Helper to parse time to minutes
  const parseTimeToMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Calculate metrics for overview strip
  const overviewMetrics = useMemo(() => {
    // Exclude today - use yesterday as the end date
    const now = new Date();
    const yesterday = startOfDay(subDays(now, 1));
    
    // Get data for different time periods
    const getMetricsForPeriod = (daysBack: number) => {
      const startDate = startOfDay(subDays(yesterday, daysBack));
      const days = eachDayOfInterval({ start: startDate, end: yesterday });
      
      const dailyData = days.map(day => {
        const dayActivities = getActivitiesByDate(activities, day);
        
        // Night sleep (hours)
        const nightSleeps = dayActivities.filter(a => 
          a.type === 'nap' && !isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
        );
        let nightSleepMinutes = 0;
        nightSleeps.forEach(sleep => {
          if (sleep.details?.startTime && sleep.details?.endTime) {
            const start = parseTimeToMinutes(sleep.details.startTime);
            let end = parseTimeToMinutes(sleep.details.endTime);
            if (end < start) end += 24 * 60;
            nightSleepMinutes += (end - start);
          }
        });
        
        // Day naps (count)
        const dayNaps = dayActivities.filter(a => 
          a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
        );
        
        // Feed volume (oz) - cap individual feeds at reasonable max (20oz per feed)
        const feeds = dayActivities.filter(a => a.type === 'feed');
        let totalVolume = 0;
        feeds.forEach(feed => {
          if (feed.details?.quantity) {
            const normalized = normalizeVolume(
              feed.details.quantity,
              feed.details.unit
            );
            // Cap individual feed at 20oz to avoid outliers
            const cappedValue = Math.min(normalized.value, 20);
            totalVolume += cappedValue;
          }
        });
        
        // Wake windows (average hours)
        const daytimeNapsWithTimes = dayNaps.filter(n => n.details?.startTime && n.details?.endTime);
        const wakeWindows: number[] = [];
        
        for (let i = 1; i < daytimeNapsWithTimes.length; i++) {
          const prevEnd = parseTimeToMinutes(daytimeNapsWithTimes[i - 1].details.endTime!);
          const currStart = parseTimeToMinutes(daytimeNapsWithTimes[i].details.startTime!);
          const window = currStart - prevEnd;
          if (window > 0 && window < 360) wakeWindows.push(window);
        }
        
        const avgWakeWindow = wakeWindows.length > 0 
          ? wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length / 60
          : 0;
        
        return {
          nightSleep: nightSleepMinutes / 60,
          dayNaps: dayNaps.length,
          feedVolume: totalVolume,
          wakeWindow: avgWakeWindow
        };
      });
      
      const validDays = dailyData.filter(d => d.nightSleep > 0 || d.dayNaps > 0 || d.feedVolume > 0);
      
      return {
        avgNightSleep: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.nightSleep, 0) / validDays.length 
          : 0,
        avgDayNaps: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.dayNaps, 0) / validDays.length 
          : 0,
        avgFeedVolume: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.feedVolume, 0) / validDays.length 
          : 0,
        avgWakeWindow: validDays.length > 0 
          ? validDays.reduce((sum, d) => sum + d.wakeWindow, 0) / validDays.length 
          : 0,
        sparkline: dailyData.slice(-14).map(d => d.nightSleep) // Last 2 weeks for sparkline
      };
    };
    
    const oneMonth = getMetricsForPeriod(30);
    const threeMonths = getMetricsForPeriod(90);
    
    // Calculate % change (1 month vs 3 month)
    const calcChange = (current: number, baseline: number) => {
      if (baseline === 0) return 0;
      return ((current - baseline) / baseline) * 100;
    };
    
    return [
      {
        label: 'Night Sleep',
        currentValue: oneMonth.avgNightSleep.toFixed(1),
        unit: 'h',
        change: calcChange(oneMonth.avgNightSleep, threeMonths.avgNightSleep),
        threeMonthAvg: threeMonths.avgNightSleep.toFixed(1),
        sparklineData: oneMonth.sparkline
      },
      {
        label: 'Day Naps',
        currentValue: oneMonth.avgDayNaps.toFixed(1),
        unit: '/day',
        change: calcChange(oneMonth.avgDayNaps, threeMonths.avgDayNaps),
        threeMonthAvg: threeMonths.avgDayNaps.toFixed(1),
        sparklineData: getMetricsForPeriod(30).sparkline.slice(0, 14).map((_, i) => 
          getMetricsForPeriod(30).sparkline.length > i ? 
          getActivitiesByDate(activities, subDays(yesterday, 13 - i))
            .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)).length 
          : 0
        )
      },
      {
        label: 'Feed Volume',
        currentValue: oneMonth.avgFeedVolume.toFixed(0),
        unit: 'oz',
        change: calcChange(oneMonth.avgFeedVolume, threeMonths.avgFeedVolume),
        threeMonthAvg: threeMonths.avgFeedVolume.toFixed(0),
        sparklineData: eachDayOfInterval({ 
          start: subDays(yesterday, 13), 
          end: yesterday
        }).map(day => {
          const dayFeeds = getActivitiesByDate(activities, day).filter(a => a.type === 'feed');
          let total = 0;
          dayFeeds.forEach(f => {
            if (f.details?.quantity) {
              const normalized = normalizeVolume(f.details.quantity, f.details.unit);
              // Cap at 20oz per feed
              total += Math.min(normalized.value, 20);
            }
          });
          return total;
        })
      },
      {
        label: 'Wake Windows',
        currentValue: oneMonth.avgWakeWindow.toFixed(1),
        unit: 'h',
        change: calcChange(oneMonth.avgWakeWindow, threeMonths.avgWakeWindow),
        threeMonthAvg: threeMonths.avgWakeWindow.toFixed(1),
        sparklineData: eachDayOfInterval({ 
          start: subDays(yesterday, 13), 
          end: yesterday
        }).map(day => {
          const dayNaps = getActivitiesByDate(activities, day)
            .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.startTime && a.details?.endTime);
          
          const windows: number[] = [];
          for (let i = 1; i < dayNaps.length; i++) {
            const prevEnd = parseTimeToMinutes(dayNaps[i - 1].details.endTime!);
            const currStart = parseTimeToMinutes(dayNaps[i].details.startTime!);
            const window = currStart - prevEnd;
            if (window > 0 && window < 360) windows.push(window);
          }
          
          return windows.length > 0 ? windows.reduce((a, b) => a + b, 0) / windows.length / 60 : 0;
        })
      }
    ];
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

  // Data extractors for timeline charts
  const extractNightSleep = (activities: Activity[], date: Date) => {
    const dayActivities = getActivitiesByDate(activities, date);
    const nightSleeps = dayActivities.filter(a => 
      a.type === 'nap' && !isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    
    let totalMinutes = 0;
    nightSleeps.forEach(sleep => {
      if (sleep.details?.startTime && sleep.details?.endTime) {
        const start = parseTimeToMinutes(sleep.details.startTime);
        let end = parseTimeToMinutes(sleep.details.endTime);
        if (end < start) end += 24 * 60;
        totalMinutes += (end - start);
      }
    });
    
    return totalMinutes / 60;
  };

  const extractDayNaps = (activities: Activity[], date: Date) => {
    const dayActivities = getActivitiesByDate(activities, date);
    return dayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    ).length;
  };

  const extractFeedVolume = (activities: Activity[], date: Date) => {
    const dayActivities = getActivitiesByDate(activities, date);
    const feeds = dayActivities.filter(a => a.type === 'feed');
    
    let total = 0;
    feeds.forEach(feed => {
      if (feed.details?.quantity) {
        const normalized = normalizeVolume(
          feed.details.quantity,
          feed.details.unit
        );
        // Cap individual feed at 20oz to avoid data entry errors
        const cappedValue = Math.min(normalized.value, 20);
        total += cappedValue;
      }
    });
    
    return total;
  };

  const extractWakeWindows = (activities: Activity[], date: Date) => {
    const dayActivities = getActivitiesByDate(activities, date);
    const dayNaps = dayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && 
      a.details?.startTime && a.details?.endTime
    );
    
    const windows: number[] = [];
    for (let i = 1; i < dayNaps.length; i++) {
      const prevEnd = parseTimeToMinutes(dayNaps[i - 1].details.endTime!);
      const currStart = parseTimeToMinutes(dayNaps[i].details.startTime!);
      const window = currStart - prevEnd;
      if (window > 0 && window < 360) windows.push(window);
    }
    
    return windows.length > 0 ? windows.reduce((a, b) => a + b, 0) / windows.length / 60 : 0;
  };

  // Show loading state while household data is being fetched
  if (householdLoading || !household) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Purpose Statement */}
      <div className="pt-4 px-2">
        <p className="text-sm text-muted-foreground text-center">
          Here's how {household?.baby_name || 'your baby'}'s rhythm has been evolving over the past few weeks.
        </p>
      </div>

      {/* Reassurance Banner */}
      <div className="mx-2 rounded-lg bg-muted/30 border border-border/40 p-3">
        <p className="text-sm text-foreground/80 text-center">
          Long-term view: Babies change gradually over months. Ups and downs are normal — this isn't a scorecard.
        </p>
      </div>

      {/* Collective Pulse - Expanded by default */}
      <div className="px-2">
        <CollectivePulse babyBirthday={household?.baby_birthday} defaultOpen={true} />
      </div>

      {/* Summary Card - "How things have been evolving" */}
      <div className="mx-2 rounded-lg bg-card border border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-2">How things have been evolving</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Over the past couple months, your baby's rhythm has been settling. Night sleep has been steady, 
          naps are gradually consolidating, and wake windows are lengthening — all expected for this age. 
          Nothing here suggests anything you need to fix.
        </p>
      </div>

      {/* Collapsible Chart Sections */}
      <div className="space-y-2 px-2">
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-foreground/70" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-foreground">Night Sleep →</h4>
                  <p className="text-xs text-muted-foreground">See how night sleep has shifted over time.</p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <TimelineChart
              title="Night Sleep"
              icon={<Moon className="w-4 h-4 text-foreground/70" />}
              activities={activities}
              timeRange={timeRange}
              dataExtractor={extractNightSleep}
              unit="h"
              color="hsl(var(--secondary))"
              yAxisFormatter={(v) => `${v.toFixed(0)}h`}
              tooltipFormatter={(v) => v.toFixed(1)}
              babyBirthday={household?.baby_birthday}
              metricType="nightSleep"
              showBaseline={showBaseline}
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-foreground/70" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-foreground">Day Naps →</h4>
                  <p className="text-xs text-muted-foreground">See the gradual consolidation that happens with age.</p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <TimelineChart
              title="Day Naps"
              icon={<Sun className="w-4 h-4 text-foreground/70" />}
              activities={activities}
              timeRange={timeRange}
              dataExtractor={extractDayNaps}
              unit=" naps"
              color="hsl(var(--secondary))"
              yAxisFormatter={(v) => v.toFixed(0)}
              tooltipFormatter={(v) => v.toFixed(0)}
              babyBirthday={household?.baby_birthday}
              metricType="dayNaps"
              showBaseline={showBaseline}
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Milk className="w-4 h-4 text-foreground/70" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-foreground">Feed Volume →</h4>
                  <p className="text-xs text-muted-foreground">Feeding amounts stabilize naturally in the mid-months.</p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <TimelineChart
              title="Feed Volume"
              icon={<Milk className="w-4 h-4 text-foreground/70" />}
              activities={activities}
              timeRange={timeRange}
              dataExtractor={extractFeedVolume}
              unit="oz"
              color="hsl(var(--secondary))"
              yAxisFormatter={(v) => `${v.toFixed(0)}oz`}
              tooltipFormatter={(v) => v.toFixed(0)}
              babyBirthday={household?.baby_birthday}
              metricType="feedVolume"
              showBaseline={showBaseline}
            />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between w-full p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-foreground/70" />
                <div className="text-left">
                  <h4 className="text-sm font-medium text-foreground">Wake Windows →</h4>
                  <p className="text-xs text-muted-foreground">Wake times stretch as babies grow.</p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <TimelineChart
              title="Wake Windows"
              icon={<Clock className="w-4 h-4 text-foreground/70" />}
              activities={activities}
              timeRange={timeRange}
              dataExtractor={extractWakeWindows}
              unit="h"
              color="hsl(var(--secondary))"
              yAxisFormatter={(v) => `${v.toFixed(1)}h`}
              tooltipFormatter={(v) => v.toFixed(1)}
              babyBirthday={household?.baby_birthday}
              metricType="wakeWindows"
              showBaseline={showBaseline}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};