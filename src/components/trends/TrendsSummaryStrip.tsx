import { OverviewMetric } from "@/hooks/useTrendsMetrics";

interface TrendsSummaryStripProps {
  metrics: OverviewMetric[];
}

export const TrendsSummaryStrip = ({ metrics }: TrendsSummaryStripProps) => {
  return (
    <div className="bg-card px-5 py-6">
      <h2 className="text-lg text-strong mb-4">This Week</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-stat-label mb-1">Night Sleep</p>
          <p className="text-xl text-stat">
            {metrics[0].currentValue}
            <span className="text-sm font-normal text-muted-foreground ml-0.5">h</span>
          </p>
        </div>
        <div>
          <p className="text-stat-label mb-1">Naps</p>
          <p className="text-xl text-stat">
            {metrics[1].currentValue}
            <span className="text-sm font-normal text-muted-foreground ml-0.5">/day</span>
          </p>
        </div>
        <div>
          <p className="text-stat-label mb-1">Feeds</p>
          <p className="text-xl text-stat">
            {metrics[2].currentValue}
            <span className="text-sm font-normal text-muted-foreground ml-0.5">oz</span>
          </p>
        </div>
      </div>
    </div>
  );
};
