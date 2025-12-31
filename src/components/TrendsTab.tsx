import { Activity } from "./ActivityCard";
import { useState, useMemo } from "react";
import { Moon, Milk, Clock, Sun, Info, ChevronDown, ChevronUp } from "lucide-react";
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

interface TrendsTabProps {
  activities: Activity[];
  travelDayDates?: string[];
}

type TimeRange = '1week' | '6weeks' | '3months';

export const TrendsTab = ({ activities, travelDayDates = [] }: TrendsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

  // Helper to check if a date is a travel day
  const isTravelDay = (date: Date): boolean => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return travelDayDates.includes(dateKey);
  };

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
      const days = eachDayOfInterval({ start: startDate, end: yesterday })
        .filter(day => !isTravelDay(day)); // Exclude travel days
      
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
    const nightSleep = overviewMetrics[0];
    const naps = overviewMetrics[1];
    const feedVolume = overviewMetrics[2];
    const wakeWindows = overviewMetrics[3];
    
    const babyName = household?.baby_name || 'your baby';
    let narrative = '';
    
    // Analyze night sleep trend
    const nightValue = parseFloat(nightSleep.currentValue);
    const nightChange = nightSleep.change;
    if (Math.abs(nightChange) < 3) {
      narrative += `${babyName}'s night sleep has been consistent at around ${nightValue}h. `;
    } else if (nightChange > 0) {
      narrative += `${babyName}'s night sleep has improved by ${Math.abs(nightChange).toFixed(1)} hours to ${nightValue}h. `;
    } else {
      narrative += `${babyName}'s night sleep has decreased slightly by ${Math.abs(nightChange).toFixed(1)} hours to ${nightValue}h. `;
    }
    
    // Analyze naps trend
    const napsValue = parseFloat(naps.currentValue);
    const napsChange = naps.change;
    if (Math.abs(napsChange) < 5) {
      narrative += `Naps remain steady at ${napsValue} per day. `;
    } else if (napsChange < 0) {
      narrative += `Nap frequency is consolidating (down ${Math.abs(napsChange).toFixed(1)} naps), a typical developmental shift. `;
    } else {
      narrative += `Nap frequency has increased to ${napsValue} per day. `;
    }
    
    // Analyze wake windows
    const wakeValue = parseFloat(wakeWindows.currentValue);
    const wakeChange = wakeWindows.change;
    if (wakeChange > 5) {
      narrative += `Wake windows are lengthening to ${wakeValue}h as ${babyName} matures. `;
    } else if (Math.abs(wakeChange) < 5) {
      narrative += `Wake windows are holding steady at ${wakeValue}h. `;
    }
    
    // Add contextual ending
    if (Math.abs(nightChange) < 5 && Math.abs(napsChange) < 10) {
      narrative += `Overall rhythm is stable—no adjustments needed.`;
    } else {
      narrative += `These changes are normal developmental progressions.`;
    }
    
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
    <div className="space-y-0 pb-6 pt-2">
      {/* Time Range Switcher - compact segmented control */}
      <div className="flex justify-center px-4 pb-3">
        <div className="inline-flex bg-muted rounded-strava-sm p-0.5">
          {(['1week', '6weeks', '3months'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded-strava-sm transition-all duration-200
                ${timeRange === range 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {range === '1week' && '1W'}
              {range === '6weeks' && '6W'}
              {range === '3months' && '3M'}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Chart Sections - tighter spacing */}
      <div className="space-y-0">
        {/* Night Sleep */}
        <div className="bg-card border-y border-border/50 overflow-hidden">
          <button
            onClick={() => toggleChart('nightSleep')}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Moon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-foreground">Night Sleep</h3>
                <p className="text-[10px] text-muted-foreground/70">Hours per night</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${expandedCharts['nightSleep'] ? 'rotate-180' : ''}`} />
          </button>
          {expandedCharts['nightSleep'] && (
            <div className="px-3 pb-3 border-t border-border/30">
              <TimelineChart
                title="Night Sleep"
                icon={<Moon className="w-3.5 h-3.5 text-foreground/70" />}
                activities={activities}
                timeRange={timeRange}
                dataExtractor={extractNightSleep}
                unit="h"
                color="hsl(var(--primary))"
                yAxisFormatter={(v) => `${v.toFixed(0)}h`}
                tooltipFormatter={(v) => v.toFixed(1)}
                babyBirthday={household?.baby_birthday}
                metricType="nightSleep"
                showBaseline={false}
                travelDayDates={travelDayDates}
              />
            </div>
          )}
        </div>

        {/* Day Naps */}
        <div className="bg-card border-b border-border/50 overflow-hidden">
          <button
            onClick={() => toggleChart('dayNaps')}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-foreground">Day Naps</h3>
                <p className="text-[10px] text-muted-foreground/70">Naps per day</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${expandedCharts['dayNaps'] ? 'rotate-180' : ''}`} />
          </button>
          {expandedCharts['dayNaps'] && (
            <div className="px-3 pb-3 border-t border-border/30">
              <TimelineChart
                title="Day Naps"
                icon={<Sun className="w-3.5 h-3.5 text-foreground/70" />}
                activities={activities}
                timeRange={timeRange}
                dataExtractor={extractDayNaps}
                unit="naps"
                color="hsl(var(--accent-foreground))"
                yAxisFormatter={(v) => v.toFixed(0)}
                tooltipFormatter={(v) => v.toFixed(0)}
                babyBirthday={household?.baby_birthday}
                metricType="dayNaps"
                showBaseline={false}
                travelDayDates={travelDayDates}
              />
            </div>
          )}
        </div>

        {/* Feed Volume */}
        <div className="bg-card border-b border-border/50 overflow-hidden">
          <button
            onClick={() => toggleChart('feedVolume')}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-secondary/50 flex items-center justify-center">
                <Milk className="w-3.5 h-3.5 text-secondary-foreground" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-foreground">Feed Volume</h3>
                <p className="text-[10px] text-muted-foreground/70">Daily intake</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${expandedCharts['feedVolume'] ? 'rotate-180' : ''}`} />
          </button>
          {expandedCharts['feedVolume'] && (
            <div className="px-3 pb-3 border-t border-border/30">
              <TimelineChart
                title="Feed Volume"
                icon={<Milk className="w-3.5 h-3.5 text-foreground/70" />}
                activities={activities}
                timeRange={timeRange}
                dataExtractor={extractFeedVolume}
                unit="oz"
                color="hsl(var(--secondary-foreground))"
                yAxisFormatter={(v) => `${v.toFixed(0)}oz`}
                tooltipFormatter={(v) => v.toFixed(0)}
                babyBirthday={household?.baby_birthday}
                metricType="feedVolume"
                showBaseline={false}
                travelDayDates={travelDayDates}
              />
            </div>
          )}
        </div>

        {/* Wake Windows */}
        <div className="bg-card border-b border-border/50 overflow-hidden">
          <button
            onClick={() => toggleChart('wakeWindows')}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-foreground">Wake Windows</h3>
                <p className="text-[10px] text-muted-foreground/70">Avg awake time</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${expandedCharts['wakeWindows'] ? 'rotate-180' : ''}`} />
          </button>
          {expandedCharts['wakeWindows'] && (
            <div className="px-3 pb-3 border-t border-border/30">
              <TimelineChart
                title="Wake Windows"
                icon={<Clock className="w-3.5 h-3.5 text-foreground/70" />}
                activities={activities}
                timeRange={timeRange}
                dataExtractor={extractWakeWindows}
                unit="h"
                color="hsl(var(--muted-foreground))"
                yAxisFormatter={(v) => `${v.toFixed(1)}h`}
                tooltipFormatter={(v) => v.toFixed(1)}
                babyBirthday={household?.baby_birthday}
                metricType="wakeWindows"
                showBaseline={false}
                travelDayDates={travelDayDates}
              />
            </div>
          )}
        </div>
      </div>

      {/* Collective Pulse */}
      <CollectivePulse babyBirthday={household?.baby_birthday} />

      {/* Long Term Trends Summary - Compact */}
      <div className="bg-card border-y border-border/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/30">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </h3>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {generateSummary()}
          </p>
        </div>
      </div>
    </div>
  );
};