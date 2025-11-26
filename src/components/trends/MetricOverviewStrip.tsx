import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricData {
  label: string;
  currentValue: string;
  unit: string;
  change: number; // % change over 1 month
  threeMonthAvg: string;
  sparklineData: number[];
}

interface MetricOverviewStripProps {
  metrics: MetricData[];
}

export const MetricOverviewStrip = ({ metrics }: MetricOverviewStripProps) => {
  const renderSparkline = (data: number[]) => {
    if (data.length === 0) return null;
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg className="w-full h-6" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity="0.4"
        />
      </svg>
    );
  };

  const renderChangeIndicator = (change: number) => {
    if (Math.abs(change) < 0.5) {
      return null;
    }
    
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    );
  };

  return (
    <div className="mx-2 bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="grid grid-cols-4 divide-x divide-border/30">
        {metrics.map((metric, index) => (
          <div key={index} className="p-4 space-y-2">
            {/* Current Value */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-num font-bold text-foreground tracking-tight">
                {metric.currentValue}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                {metric.unit}
              </span>
            </div>
            
            {/* Sparkline */}
            <div className="h-6">
              {renderSparkline(metric.sparklineData)}
            </div>
            
            {/* Change Indicator */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {metric.label}
              </span>
              {renderChangeIndicator(metric.change)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};