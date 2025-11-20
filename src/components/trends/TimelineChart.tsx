import { Activity } from "@/components/ActivityCard";
import { format, subDays, startOfDay, endOfDay, startOfWeek, eachWeekOfInterval, endOfWeek, differenceInWeeks, eachDayOfInterval } from "date-fns";
import { useMemo, useState } from "react";
import { useTimelineCohortRanges } from "@/hooks/useTimelineCohortRanges";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimelineChartProps {
  title: string;
  icon: React.ReactNode;
  activities: Activity[];
  timeRange: '6weeks' | '3months' | '6months';
  dataExtractor: (activities: Activity[], date: Date) => number;
  unit: string;
  color: string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  babyBirthday?: string;
  metricType?: 'nightSleep' | 'dayNaps' | 'feedVolume' | 'wakeWindows';
}

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
  metricType
}: TimelineChartProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const { chartData, weeks } = useMemo(() => {
    const now = new Date();
    // Exclude today - go back to yesterday
    const yesterday = startOfDay(subDays(now, 1));
    
    let daysBack = 42; // 6 weeks
    if (timeRange === '3months') daysBack = 90;
    if (timeRange === '6months') daysBack = 180;
    
    const startDate = startOfDay(subDays(yesterday, daysBack));
    const endDate = endOfDay(yesterday);
    
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
    
    return { chartData: data, weeks };
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
            {/* Cohort range filled area */}
            {cohortRangePath && (
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
                  opacity="0.4"
                  strokeDasharray="4 2"
                />
                {/* Bottom line */}
                <path
                  d={smoothCurve(cohortRangePath.bottomPoints)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  opacity="0.4"
                  strokeDasharray="4 2"
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
                    onClick={() => setHoveredPoint(isHovered ? null : i)}
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

  return (
    <div className="mx-2 rounded-xl bg-card shadow-sm border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {renderChart(180)}
    </div>
  );
};
