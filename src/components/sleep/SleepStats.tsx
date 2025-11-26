import { AverageDailySummary } from "@/types/sleep";

interface SleepStatsProps {
  averageDailySummary: AverageDailySummary;
}

export const SleepStats = ({ averageDailySummary }: SleepStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card rounded-xl p-4 shadow-card border border-border">
        <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Feeds</h4>
        <div className="text-3xl font-num font-bold text-foreground dark:text-primary">
          {averageDailySummary.feeds}
        </div>
      </div>
      <div className="bg-card rounded-xl p-4 shadow-card border border-border">
        <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Diapers</h4>
        <div className="text-3xl font-num font-bold text-foreground dark:text-primary">
          {averageDailySummary.diapers}
        </div>
      </div>
    </div>
  );
};