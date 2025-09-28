interface SleepStatsProps {
  totalSleep: number;
  averageSleep: number;
  averageNaps: number;
  daysWithData: number;
  ageInWeeks: number;
  currentWeekOffset: number;
}

export const SleepStats = ({ 
  totalSleep, 
  averageSleep, 
  averageNaps, 
  daysWithData, 
  ageInWeeks,
  currentWeekOffset 
}: SleepStatsProps) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return "This Week";
    if (currentWeekOffset === 1) return "Last Week";
    return `${currentWeekOffset} weeks ago`;
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <h3 className="font-medium text-sm text-foreground">{getWeekLabel()} Summary</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Total Sleep</div>
          <div className="font-semibold text-foreground">{formatDuration(totalSleep)}</div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Daily Average</div>
          <div className="font-semibold text-foreground">{formatDuration(averageSleep)}</div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Avg Naps/Day</div>
          <div className="font-semibold text-foreground">{averageNaps}</div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Days Tracked</div>
          <div className="font-semibold text-foreground">{daysWithData}/7</div>
        </div>
      </div>

      {ageInWeeks > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Expected for {Math.floor(ageInWeeks)} weeks: 14-17h total sleep
          </div>
        </div>
      )}
    </div>
  );
};