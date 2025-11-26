import { Activity } from "@/components/ActivityCard";
import { format, subDays, startOfDay, endOfDay, startOfWeek, eachWeekOfInterval, endOfWeek, differenceInWeeks, eachDayOfInterval } from "date-fns";
import { useMemo, useState } from "react";
import { useTimelineCohortRanges } from "@/hooks/useTimelineCohortRanges";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { baselineWakeWindows, getFeedingGuidanceForAge } from "@/utils/ageAppropriateBaselines";
import { isDaytimeNap } from "@/utils/napClassification";
import { normalizeVolume } from "@/utils/unitConversion";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { Moon, Sun, Milk, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimelineChartProps {
  title: string;
  icon: React.ReactNode;
  activities: Activity[];
  timeRange: '1week' | '6weeks' | '3months';
  dataExtractor: (activities: Activity[], date: Date) => number;
  unit: string;
  color: string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  babyBirthday?: string;
  metricType?: 'nightSleep' | 'dayNaps' | 'feedVolume' | 'wakeWindows';
  showBaseline?: boolean;
}

// Helper to get warm, natural language explanation for each chart
const getChartExplanation = (
  metricType: string | undefined, 
  babyBirthday: string | undefined
): string => {
  if (!babyBirthday || !metricType) return '';
  
  const birthDate = new Date(babyBirthday);
  const ageInWeeks = differenceInWeeks(new Date(), birthDate);
  
  if (metricType === 'nightSleep') {
    const baseline = baselineWakeWindows.find(b => ageInWeeks >= b.ageStart && ageInWeeks <= b.ageEnd);
    if (!baseline) return '';
    
    if (ageInWeeks < 8) {
      return `Night sleep is usually around 8-10 hours at this age. Every baby is different.`;
    } else if (ageInWeeks < 16) {
      return `Night sleep typically settles around 9-11 hours now. You're doing great.`;
    } else if (ageInWeeks < 52) {
      return `Most babies sleep 10-12 hours at night by this age. Trust the rhythm you're building.`;
    }
    return `Night sleep is usually 10-12 hours at this age. Your routine is working.`;
  }
  
  if (metricType === 'dayNaps') {
    const baseline = baselineWakeWindows.find(b => ageInWeeks >= b.ageStart && ageInWeeks <= b.ageEnd);
    if (!baseline) return '';
    
    return `Most babies take ${baseline.napCount} naps at this age, but every baby's different.`;
  }
  
  if (metricType === 'feedVolume') {
    const guidance = getFeedingGuidanceForAge(ageInWeeks);
    return `Babies usually take ${guidance.dailyTotal.split(' ')[0]} feeds per day at this age. You're on track.`;
  }
  
  if (metricType === 'wakeWindows') {
    const baseline = baselineWakeWindows.find(b => ageInWeeks >= b.ageStart && ageInWeeks <= b.ageEnd);
    if (!baseline) return '';
    
    const ww = baseline.wakeWindows[0];
    if (ww === "All day") {
      return `Wake windows expand throughout the day now. Follow your baby's cues.`;
    }
    return `Wake windows are usually ${ww} at this age. Watch for sleepy cues.`;
  }
  
  return '';
};

export const TimelineChart = ({
  title,
  icon,
  activities,
  timeRange,
  dataExtractor,
  unit,
  color,
  yAxisFormatter = (v) => v.toFixed(1),
  tooltipFormatter = (v) => v.toFixed(1),
  babyBirthday,
  metricType,
  showBaseline = false
}: TimelineChartProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();

  const { chartData, weeks, days } = useMemo(() => {
    const now = new Date();
    // Exclude today - go back to yesterday
    const yesterday = startOfDay(subDays(now, 1));
    
    let daysBack = 7; // 1 week
    if (timeRange === '6weeks') daysBack = 42;
    if (timeRange === '3months') daysBack = 90;
    
    const startDate = startOfDay(subDays(yesterday, daysBack - 1)); // Include yesterday
    const endDate = endOfDay(yesterday);
    
    // For 1 week, show daily data; otherwise show weekly averages
    if (timeRange === '1week') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      const data = days.map(day => {
        const value = dataExtractor(activities, day);
        return {
          label: format(day, 'EEE'), // Mon, Tue, etc.
          value: value
        };
      });
      
      return { chartData: data, weeks: [], days };
    }
    
    // Get all weeks in the range
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    
    // Calculate weekly averages
    const data = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd > endDate ? endDate : weekEnd });
      
      // Get values for each day in the week
      const dailyValues = daysInWeek.map(day => dataExtractor(activities, day));
      
      // Filter out zeros and calculate average
      const nonZeroValues = dailyValues.filter(v => v > 0);
      const avgValue = nonZeroValues.length > 0 
        ? nonZeroValues.reduce((sum, v) => sum + v, 0) / nonZeroValues.length
        : 0;
      
      return {
        label: format(weekStart, 'M/d'),
        value: avgValue
      };
    });
    
    return { chartData: data, weeks, days: [] };
  }, [activities, timeRange, dataExtractor]);

  // Fetch cohort ranges for the timeline
  const { data: cohortRanges } = useTimelineCohortRanges(babyBirthday, weeks, metricType);

  const renderChart = (height: number) => {
    const chartHeight = height;
    const yAxisLabelWidth = 35;
    const chartWidth = 280;

    if (chartData.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No data available for this time period
        </div>
      );
    }

    const minValue = Math.min(...chartData.map(d => d.value));
    const maxValue = Math.max(...chartData.map(d => d.value));
    
    // Include cohort ranges in axis calculation if available
    const cohortMin = cohortRanges?.reduce((min, r) => Math.min(min, r.min || Infinity), Infinity) || minValue;
    const cohortMax = cohortRanges?.reduce((max, r) => Math.max(max, r.max || -Infinity), -Infinity) || maxValue;
    
    const rangeMin = Math.min(minValue, cohortMin);
    const rangeMax = Math.max(maxValue, cohortMax);
    const fullRange = rangeMax - rangeMin;
    
    const yAxisMin = Math.max(0, rangeMin - fullRange * 0.15);
    const yAxisMax = rangeMax + fullRange * 0.15;
    
    // Generate Y-axis ticks - ensure unique values and integer spacing for naps
    const yTicks = [];
    if (metricType === 'dayNaps') {
      // For naps, use integer increments
      const minTick = Math.floor(yAxisMin);
      const maxTick = Math.ceil(yAxisMax);
      for (let i = minTick; i <= maxTick; i++) {
        yTicks.push(i);
      }
    } else {
      const tickCount = 4;
      const uniqueValues = new Set<number>();
      for (let i = 0; i <= tickCount; i++) {
        const value = yAxisMin + (yAxisMax - yAxisMin) * (i / tickCount);
        uniqueValues.add(value);
      }
      yTicks.push(...Array.from(uniqueValues).sort((a, b) => a - b));
    }

    // Helper to create smooth curve through points
    const smoothCurve = (points: {x: number, y: number}[]) => {
      if (points.length === 0) return '';
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        
        // Control points for smooth curve
        const controlPointX = (current.x + next.x) / 2;
        
        path += ` Q ${controlPointX} ${current.y}, ${controlPointX} ${(current.y + next.y) / 2}`;
        path += ` Q ${controlPointX} ${next.y}, ${next.x} ${next.y}`;
      }
      
      return path;
    };

    // Generate line path - skip zero values to avoid connecting through missing data
    const pathSegments: string[] = [];
    let currentPoints: {x: number, y: number}[] = [];
    
    chartData.forEach((d, i) => {
      if (d.value === 0) {
        // End current segment if we have one
        if (currentPoints.length > 0) {
          pathSegments.push(smoothCurve(currentPoints));
          currentPoints = [];
        }
      } else {
        const x = yAxisLabelWidth + (i / (chartData.length - 1)) * chartWidth;
        const y = (1 - (d.value - yAxisMin) / (yAxisMax - yAxisMin)) * chartHeight;
        currentPoints.push({ x, y });
      }
    });
    
    // Add final segment if exists
    if (currentPoints.length > 0) {
      pathSegments.push(smoothCurve(currentPoints));
    }
    
    const pathData = pathSegments.join(' ');

    // Generate cohort range paths
    const cohortRangePath = cohortRanges && cohortRanges.length > 0 ? (() => {
      const validRanges = cohortRanges.filter(r => r.min !== null && r.max !== null);
      if (validRanges.length === 0) return null;

      // Create top line (max values) and bottom line (min values)
      const topPoints: {x: number, y: number}[] = [];
      const bottomPoints: {x: number, y: number}[] = [];

      validRanges.forEach((range, i) => {
        const dataIndex = cohortRanges.indexOf(range);
        const x = yAxisLabelWidth + (dataIndex / (chartData.length - 1)) * chartWidth;
        const yMax = (1 - ((range.max || 0) - yAxisMin) / (yAxisMax - yAxisMin)) * height;
        const yMin = (1 - ((range.min || 0) - yAxisMin) / (yAxisMax - yAxisMin)) * height;
        
        topPoints.push({ x, y: yMax });
        bottomPoints.push({ x, y: yMin });
      });

      // Create filled area path
      const topPath = smoothCurve(topPoints);
      const bottomPath = smoothCurve([...bottomPoints].reverse());
      
      return { topPath, bottomPath, topPoints, bottomPoints };
    })() : null;

    return (
      <TooltipProvider>
        <div className="p-4">
          <svg width="100%" height={height + 40} className="overflow-visible">
            {/* Cohort range filled area - only show if showBaseline is true */}
            {showBaseline && cohortRangePath && (
              <>
                <path
                  d={`${cohortRangePath.topPath} L ${cohortRangePath.bottomPoints[cohortRangePath.bottomPoints.length - 1].x} ${cohortRangePath.bottomPoints[cohortRangePath.bottomPoints.length - 1].y} ${cohortRangePath.bottomPath.replace('M', 'L')} Z`}
                  fill="hsl(var(--primary))"
                  opacity={0.15}
                />
              {/* Top line */}
              <path
                d={cohortRangePath.topPath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                opacity="0.5"
              />
              {/* Bottom line */}
              <path
                d={smoothCurve(cohortRangePath.bottomPoints)}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                opacity="0.5"
              />
              </>
            )}

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = (1 - (tick - yAxisMin) / (yAxisMax - yAxisMin)) * chartHeight;
            return (
              <g key={`y-${i}`}>
                <text
                  x={yAxisLabelWidth - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-muted-foreground"
                >
                  {yAxisFormatter(tick)}
                </text>
                <line
                  x1={yAxisLabelWidth}
                  y1={y}
                  x2={yAxisLabelWidth + chartWidth}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </g>
            );
          })}

          {/* Data line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points with tooltips - only show non-zero values */}
          {chartData.map((d, i) => {
            // Skip rendering if no data
            if (d.value === 0) return null;
            
            const x = yAxisLabelWidth + (i / (chartData.length - 1)) * chartWidth;
            const y = (1 - (d.value - yAxisMin) / (yAxisMax - yAxisMin)) * chartHeight;
            const isHovered = hoveredPoint === i;

            return (
              <Tooltip key={`point-${i}`} open={isHovered}>
                <TooltipTrigger asChild>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? "6" : "4"}
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => {
                      setSelectedWeekIndex(i);
                      setPopoverOpen(true);
                    }}
                    style={{ pointerEvents: 'all' }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-semibold">{d.label}</div>
                    <div>{tooltipFormatter(d.value)} {unit}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* X-axis labels - show every other week */}
          {chartData.map((d, i) => {
            if (i % 2 !== 0) return null;
            const x = yAxisLabelWidth + (i / (chartData.length - 1)) * chartWidth;
            return (
              <text
                key={`x-${i}`}
                x={x}
                y={height + 25}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
      </TooltipProvider>
    );
  };

  // Handle both weekly and daily selections
  const selectedDate = selectedWeekIndex !== null 
    ? (timeRange === '1week' ? days[selectedWeekIndex] : weeks[selectedWeekIndex])
    : null;

  // Get daily data for popover
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

  const getDailyData = (date: Date) => {
    const dayActivities = getActivitiesByDate(activities, date);
    
    switch (metricType) {
      case 'nightSleep': {
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
        return { value: totalMinutes / 60, unit: 'h', icon: Moon, activities: nightSleeps };
      }
      
      case 'dayNaps': {
        const dayNaps = dayActivities.filter(a => 
          a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
        );
        return { value: dayNaps.length, unit: ' naps', icon: Sun, activities: dayNaps };
      }
      
      case 'feedVolume': {
        const feeds = dayActivities.filter(a => a.type === 'feed');
        let total = 0;
        feeds.forEach(feed => {
          if (feed.details?.quantity) {
            const normalized = normalizeVolume(feed.details.quantity, feed.details.unit);
            total += Math.min(normalized.value, 20);
          }
        });
        return { value: total, unit: 'oz', icon: Milk, activities: feeds };
      }
      
      case 'wakeWindows': {
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
        const avgWindow = windows.length > 0 ? windows.reduce((a, b) => a + b, 0) / windows.length / 60 : 0;
        return { value: avgWindow, unit: 'h', icon: Clock, activities: dayNaps };
      }
      
      default:
        return { value: 0, unit: '', icon: Clock, activities: [] };
    }
  };

  const selectedData = selectedDate ? getDailyData(selectedDate) : null;
  const SelectedIcon = selectedData?.icon;
  
  // Get warm explanation
  const explanation = getChartExplanation(metricType, babyBirthday);

  return (
    <>
      <div className="mx-2 rounded-xl bg-card shadow-sm border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {renderChart(180)}
        
        {/* Warm explanation */}
        {explanation && (
          <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
            <p className="text-xs text-muted-foreground italic text-center">
              {explanation}
            </p>
          </div>
        )}
      </div>
      
      <Popover open={popoverOpen && selectedData !== null} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="absolute inset-0 pointer-events-none" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="center" side="top">
          {selectedDate && selectedData && SelectedIcon && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SelectedIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{format(selectedDate, 'EEE, MMM d')}</span>
                </div>
                <span className="text-sm font-semibold">
                  {selectedData.value > 0 ? `${selectedData.value.toFixed(1)}${selectedData.unit}` : '-'}
                </span>
              </div>
              
              {selectedData.activities.length > 0 && (
                <div className="space-y-1 pl-6 pt-1 border-t border-border">
                  {selectedData.activities.map((activity, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {activity.details?.startTime && activity.details?.endTime && (
                        <span>{activity.details.startTime} - {activity.details.endTime}</span>
                      )}
                      {activity.type === 'feed' && activity.details?.quantity && (
                        <span> • {activity.details.quantity} {activity.details.unit}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
};
