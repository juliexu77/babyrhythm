import { Activity } from "@/components/ActivityCard";
import { format, subDays, startOfDay, endOfDay, startOfWeek, eachWeekOfInterval, endOfWeek, differenceInWeeks, eachDayOfInterval } from "date-fns";
import { useMemo } from "react";
import { baselineWakeWindows } from "@/utils/ageAppropriateBaselines";

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
  

  // Calculate expected range based on baby's age
  const expectedRange = useMemo(() => {
    if (!babyBirthday || !metricType) return null;
    
    const birthDate = new Date(babyBirthday);
    const ageInWeeks = differenceInWeeks(new Date(), birthDate);
    
    // Find matching baseline
    const baseline = baselineWakeWindows.find(
      b => ageInWeeks >= b.ageStart && ageInWeeks <= b.ageEnd
    );
    
    if (!baseline) return null;
    
    // Parse ranges based on metric type
    if (metricType === 'nightSleep') {
      // Parse totalSleep "14-17hrs" -> extract just night portion (rough estimate: 70% of total)
      const match = baseline.totalSleep.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]) * 0.6; // Rough night sleep portion
        const max = parseInt(match[2]) * 0.75;
        return { min, max };
      }
    } else if (metricType === 'dayNaps') {
      // Parse napCount "3-4" or "3"
      const match = baseline.napCount.match(/(\d+)(?:-(\d+))?/);
      if (match) {
        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : min;
        return { min, max };
      }
    } else if (metricType === 'wakeWindows') {
      // Parse wakeWindows "2-2.5hrs"
      const ww = baseline.wakeWindows[0];
      const match = ww.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
      if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        return { min, max };
      }
    } else if (metricType === 'feedVolume') {
      // Age-based estimates (oz per day)
      if (ageInWeeks < 4) return { min: 18, max: 26 };
      if (ageInWeeks < 8) return { min: 22, max: 30 };
      if (ageInWeeks < 16) return { min: 24, max: 32 };
      if (ageInWeeks < 24) return { min: 26, max: 34 };
      if (ageInWeeks < 52) return { min: 24, max: 32 };
      return { min: 20, max: 28 };
    }
    
    return null;
  }, [babyBirthday, metricType]);

  const chartData = useMemo(() => {
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
    
    return data;
  }, [activities, timeRange, dataExtractor]);

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
    const valueRange = maxValue - minValue;
    
    // Include expected range in axis calculation if available
    const rangeMin = expectedRange ? Math.min(minValue, expectedRange.min) : minValue;
    const rangeMax = expectedRange ? Math.max(maxValue, expectedRange.max) : maxValue;
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

    return (
      <div className="p-4">
        <svg width="100%" height={height + 40} className="overflow-visible">
          {/* Expected range band */}
          {expectedRange && (
            <>
              <rect
                x={yAxisLabelWidth}
                y={(1 - (expectedRange.max - yAxisMin) / (yAxisMax - yAxisMin)) * height}
                width={chartWidth}
                height={((expectedRange.max - expectedRange.min) / (yAxisMax - yAxisMin)) * height}
                fill="hsl(var(--primary))"
                opacity={0.15}
              />
              {/* Top and bottom border lines for the expected range */}
              <line
                x1={yAxisLabelWidth}
                y1={(1 - (expectedRange.max - yAxisMin) / (yAxisMax - yAxisMin)) * height}
                x2={yAxisLabelWidth + chartWidth}
                y2={(1 - (expectedRange.max - yAxisMin) / (yAxisMax - yAxisMin)) * height}
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="4 2"
              />
              <line
                x1={yAxisLabelWidth}
                y1={(1 - (expectedRange.min - yAxisMin) / (yAxisMax - yAxisMin)) * height}
                x2={yAxisLabelWidth + chartWidth}
                y2={(1 - (expectedRange.min - yAxisMin) / (yAxisMax - yAxisMin)) * height}
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                opacity="0.3"
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

            return (
              <g key={`point-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color}
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-6 transition-all"
                />
                <title>
                  {d.label}: {tooltipFormatter(d.value)}{unit}
                </title>
              </g>
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
