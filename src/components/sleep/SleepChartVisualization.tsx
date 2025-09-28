interface SleepDataDay {
  date: string;
  fullDate: Date;
  sleepBlocks: boolean[];
  hasData: boolean;
  startHour: number;
  totalHours: number;
}

interface SleepChartVisualizationProps {
  sleepData: SleepDataDay[];
  showFullDay: boolean;
}

export const SleepChartVisualization = ({ sleepData, showFullDay }: SleepChartVisualizationProps) => {
  return (
    <>
      {/* Day headers */}
      <div className="grid grid-cols-[60px_1fr] gap-4 mb-2">
        <div></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
          {sleepData.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-foreground">
              {day.date}
            </div>
          ))}
        </div>
      </div>

      {/* Sleep chart grid with hour lines */}
      <div className="grid grid-cols-[60px_1fr] gap-4 relative">
        {/* Time labels */}
        <div className="flex flex-col justify-between py-2" style={{ height: showFullDay ? '480px' : '360px' }}>
          {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => {
            const hour = showFullDay ? i : i + 6;
            let timeLabel = '';
            if (hour === 0) timeLabel = '12am';
            else if (hour < 12) timeLabel = `${hour}am`;
            else if (hour === 12) timeLabel = '12pm';
            else timeLabel = `${hour - 12}pm`;
            
            return (
              <div key={i} className="text-xs text-muted-foreground text-right">
                {timeLabel}
              </div>
            );
          })}
        </div>

        {/* Sleep blocks with hour grid lines */}
        <div className="relative" style={{ height: showFullDay ? '480px' : '360px' }}>
          {/* Hour grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => (
              <div key={i} className="h-px bg-border/20" />
            ))}
          </div>
          
          {/* Sleep blocks */}
          <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
            {sleepData.map((day, dayIndex) => (
              <div key={dayIndex} className="relative">
                {/* Sleep bars */}
                {day.sleepBlocks.map((isAsleep, hourIndex) => {
                  if (!isAsleep) return null;
                  
                  // Find continuous sleep blocks
                  let blockStart = hourIndex;
                  let blockEnd = hourIndex;
                  while (blockEnd < day.sleepBlocks.length - 1 && day.sleepBlocks[blockEnd + 1]) {
                    blockEnd++;
                  }
                  
                  // Only render if this is the start of a block
                  if (blockStart !== hourIndex) return null;
                  
                  const blockHeight = ((blockEnd - blockStart + 1) / day.totalHours) * 100;
                  const blockTop = (blockStart / day.totalHours) * 100;
                  
                  return (
                    <div
                      key={`${hourIndex}-block`}
                      className="absolute w-full bg-primary rounded-sm"
                      style={{
                        top: `${blockTop}%`,
                        height: `${blockHeight}%`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};