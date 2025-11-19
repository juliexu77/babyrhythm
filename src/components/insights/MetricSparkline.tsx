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
        <YAxis hide domain={[yMin, yMax]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};