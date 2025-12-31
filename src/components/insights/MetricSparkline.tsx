import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface MetricSparklineProps {
  data: number[];
  color?: string;
}

export const MetricSparkline = ({ data, color = "hsl(var(--primary))" }: MetricSparklineProps) => {
  const chartData = data.map((value, index) => ({ week: index, value }));
  
  // Calculate domain with padding for better visualization
  const validData = data.filter(v => v > 0);
  if (validData.length === 0) {
    return null;
  }
  
  const minValue = Math.min(...validData);
  const maxValue = Math.max(...validData);
  const range = maxValue - minValue;
  const padding = range * 0.3; // 30% padding on each side
  
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;
  
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={`sparklineGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <YAxis hide domain={[yMin, yMax]} />
        <Line
          type="monotoneX"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={{ r: 2, fill: color, stroke: color, strokeWidth: 0 }}
          activeDot={{ r: 3, fill: color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
          isAnimationActive={false}
          fill={`url(#sparklineGradient-${color})`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};