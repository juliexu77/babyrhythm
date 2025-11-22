import { Activity } from "./ActivityCard";
import { useState, useMemo } from "react";
import { Moon, Milk, Clock, Sun, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { normalizeVolume } from "@/utils/unitConversion";
import { Button } from "@/components/ui/button";
import { TimelineChart } from "@/components/trends/TimelineChart";
import { CollectivePulse } from "@/components/home/CollectivePulse";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

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

  // Generate summary narrative
  const generateSummary = () => {
    const recentMetrics = overviewMetrics;
    const nightSleep = recentMetrics[0];
    const naps = recentMetrics[1];
    
    let narrative = `Over the past couple months, ${household?.baby_name || 'your baby'}'s rhythm has been `;
    
    // Analyze trends
    const nightTrend = Math.abs(nightSleep.change) < 5 ? 'steady' : nightSleep.change > 0 ? 'improving' : 'adjusting';
    const napsTrend = Math.abs(naps.change) < 10 ? 'stable' : 'consolidating';
    
    narrative += `${nightTrend === 'steady' ? 'settling' : 'evolving'}. `;
    narrative += `Night sleep has been ${nightTrend}, `;
    narrative += `naps are gradually ${napsTrend}, `;
    narrative += `and wake windows are lengthening — all expected for this age. `;
    narrative += `Nothing here suggests anything you need to fix.`;
    
    return narrative;
  };

  const toggleChart = (chartId: string) => {
    setExpandedCharts(prev => ({ ...prev, [chartId]: !prev[chartId] }));
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
      {/* Collective Pulse */}
      <div className="pt-4 px-2">
        <CollectivePulse babyBirthday={household?.baby_birthday} />
      </div>

      {/* Evolution Summary */}
      <div className="px-2">
        <div className="rounded-xl bg-gradient-to-b from-card to-card/50 shadow-sm border border-border/40 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            How things have been evolving
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {generateSummary()}
          </p>
        </div>
      </div>

      {/* Time Range Switcher + Baseline Toggle */}
      <div className="mx-2 space-y-2">
        <div className="flex justify-center gap-2">
        {(['6weeks', '3months', '6months'] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
            className="text-xs"
          >
            {range === '6weeks' && '6 Weeks'}
            {range === '3months' && '3 Months'}
            {range === '6months' && '6 Months'}
          </Button>
        ))}
        </div>
        
        {/* Baseline Toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBaseline(!showBaseline)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showBaseline ? '✓ ' : ''}Show typical range
          </Button>
        </div>
      </div>

      {/* Chart Legend - Only show when baseline is visible */}
      {showBaseline && (
        <div className="mx-2 rounded-lg bg-muted/30 border border-border/40 p-3">
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <h4 className="text-xs font-semibold text-foreground">Chart Guide</h4>
        </div>
        <div className="space-y-2 ml-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-secondary rounded-full" />
            <span className="text-xs text-muted-foreground">Your baby's weekly average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 border-t-2 border-primary/50" />
              <div className="w-4 h-3 bg-primary/15 border-y border-primary/50" />
              <div className="w-3 h-0.5 border-t-2 border-primary/50" />
            </div>
            <span className="text-xs text-muted-foreground">Age-appropriate baseline range</span>
          </div>
        </div>
        </div>
      )}

      {/* Collapsible Chart Sections */}
      <div className="space-y-3 px-2">
        {/* Night Sleep */}
        <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
          <button
            onClick={() => toggleChart('nightSleep')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-primary" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-foreground">Night Sleep</h3>
                <p className="text-xs text-muted-foreground">See how night sleep has shifted over time</p>
              </div>
            </div>
            {expandedCharts['nightSleep'] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedCharts['nightSleep'] && (
            <div className="px-2 pb-4">
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
            </div>
          )}
        </div>

        {/* Day Naps */}
        <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
          <button
            onClick={() => toggleChart('dayNaps')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-primary" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-foreground">Day Naps</h3>
                <p className="text-xs text-muted-foreground">See the gradual consolidation that happens with age</p>
              </div>
            </div>
            {expandedCharts['dayNaps'] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedCharts['dayNaps'] && (
            <div className="px-2 pb-4">
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
            </div>
          )}
        </div>

        {/* Feed Volume */}
        <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
          <button
            onClick={() => toggleChart('feedVolume')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Milk className="w-4 h-4 text-primary" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-foreground">Feed Volume</h3>
                <p className="text-xs text-muted-foreground">Feeding amounts stabilize naturally in the mid-months</p>
              </div>
            </div>
            {expandedCharts['feedVolume'] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedCharts['feedVolume'] && (
            <div className="px-2 pb-4">
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
            </div>
          )}
        </div>

        {/* Wake Windows */}
        <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
          <button
            onClick={() => toggleChart('wakeWindows')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-foreground">Wake Windows</h3>
                <p className="text-xs text-muted-foreground">Wake times stretch as babies grow</p>
              </div>
            </div>
            {expandedCharts['wakeWindows'] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedCharts['wakeWindows'] && (
            <div className="px-2 pb-4">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};