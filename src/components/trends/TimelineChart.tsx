import { Activity } from "@/components/ActivityCard";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval } from "date-fns";
import { useMemo } from "react";

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
  tooltipFormatter = (v) => v.toFixed(1)
}: TimelineChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    let daysBack = 42; // 6 weeks
    
    if (timeRange === '3months') daysBack = 90;
    if (timeRange === '6months') daysBack = 180;
    
    const startDate = startOfDay(subDays(now, daysBack));
    const endDate = endOfDay(now);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const data = days.map(day => {
      const value = dataExtractor(activities, day);
      return {
        date: day,
        value,
        label: format(day, 'MMM d')
      };
    });
    
    // Get week boundaries for visual markers
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    
    return { data, weeks, startDate, endDate };
  }, [activities, timeRange, dataExtractor]);

  const { data, weeks } = chartData;
  
  // Calculate chart dimensions
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = 0;
  const range = maxValue - minValue;
  const chartHeight = 240;
  const chartWidth = 100; // percentage
  
  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + (range * i) / tickCount;
      ticks.push(value);
    }
    return ticks.reverse();
  }, [minValue, range]);

  const getY = (value: number) => {
    return ((maxValue - value) / range) * (chartHeight - 40) + 20;
  };

  // Create line path
  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = getY(point.value);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [data, chartWidth, range]);

  return (
    <div className="mx-2 bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-6">
        {data.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
            No data available for this time range
          </div>
        ) : (
          <div className="relative">
            {/* Y-Axis */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-muted-foreground pr-2">
              {yTicks.map((tick, index) => (
                <div key={index} className="text-right">
                  {yAxisFormatter(tick)}
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="ml-14">
              <svg 
                className="w-full" 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                style={{ height: `${chartHeight}px` }}
              >
                {/* Week boundary lines */}
                {weeks.map((week, index) => {
                  const weekIndex = data.findIndex(d => 
                    format(d.date, 'yyyy-MM-dd') === format(week, 'yyyy-MM-dd')
                  );
                  if (weekIndex === -1) return null;
                  
                  const x = (weekIndex / (data.length - 1)) * chartWidth;
                  return (
                    <line
                      key={index}
                      x1={x}
                      y1={20}
                      x2={x}
                      y2={chartHeight - 20}
                      stroke="hsl(var(--border))"
                      strokeWidth="0.3"
                      strokeDasharray="2,2"
                      opacity="0.5"
                    />
                  );
                })}

                {/* Horizontal grid lines */}
                {yTicks.map((tick, index) => (
                  <line
                    key={index}
                    x1={0}
                    y1={getY(tick)}
                    x2={chartWidth}
                    y2={getY(tick)}
                    stroke="hsl(var(--border))"
                    strokeWidth="0.2"
                    opacity="0.3"
                  />
                ))}

                {/* Data line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Data points */}
                {data.map((point, index) => {
                  const x = (index / (data.length - 1)) * chartWidth;
                  const y = getY(point.value);
                  
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill={color}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="transparent"
                        className="cursor-pointer hover:fill-primary/10 transition-colors"
                      >
                        <title>{`${point.label}: ${tooltipFormatter(point.value)}${unit}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* X-Axis labels - show week starts only */}
              <div className="mt-2 relative h-6">
                {weeks.slice(0, -1).map((week, index) => {
                  const weekIndex = data.findIndex(d => 
                    format(d.date, 'yyyy-MM-dd') === format(week, 'yyyy-MM-dd')
                  );
                  if (weekIndex === -1) return null;
                  
                  const x = (weekIndex / (data.length - 1)) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute text-xs text-muted-foreground"
                      style={{ left: `${x}%`, transform: 'translateX(-50%)' }}
                    >
                      {format(week, 'MMM d')}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};