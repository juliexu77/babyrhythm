import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricData {
  label: string;
  currentValue: string;
  unit: string;
  change: number; // % change over 1 month
  threeMonthAvg: string;
  sparklineData: number[];
  color: string;
}

interface MetricOverviewStripProps {
  metrics: MetricData[];
}

export const MetricOverviewStrip = ({ metrics }: MetricOverviewStripProps) => {
  const renderSparkline = (data: number[], color: string) => {
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
      <svg className="w-full h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((value - min) / range) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    );
  };

  const renderChangeIndicator = (change: number) => {
    if (Math.abs(change) < 0.5) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="w-3 h-3" />
          <span className="text-xs">—</span>
        </div>
      );
    }
    
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-emerald-600' : 'text-rose-600';
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="mx-2 bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="grid grid-cols-4 divide-x divide-border/30">
        {metrics.map((metric, index) => (
          <div key={index} className="p-4">
            {/* Label */}
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {metric.label}
            </div>
            
            {/* Sparkline */}
            <div className="mb-3">
              {renderSparkline(metric.sparklineData, metric.color)}
            </div>
            
            {/* Current Value */}
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-semibold text-foreground tracking-tight">
                {metric.currentValue}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                {metric.unit}
              </span>
            </div>
            
            {/* Change Indicator */}
            <div className="mb-2">
              {renderChangeIndicator(metric.change)}
            </div>
            
            {/* 3-Month Average */}
            <div className="text-[11px] text-muted-foreground">
              3-mo avg: <span className="font-medium text-foreground">{metric.threeMonthAvg}{metric.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};