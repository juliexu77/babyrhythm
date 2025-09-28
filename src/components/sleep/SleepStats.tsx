interface SleepStatsProps {
  averageDailySummary: {
    feeds: number;
    diapers: number;
  };
}

export const SleepStats = ({ averageDailySummary }: SleepStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Feeds</h4>
        <div className="text-3xl font-serif font-bold text-foreground">
          {averageDailySummary.feeds}
        </div>
      </div>
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Diapers</h4>
        <div className="text-3xl font-serif font-bold text-foreground">
          {averageDailySummary.diapers}
        </div>
      </div>
    </div>
  );
};