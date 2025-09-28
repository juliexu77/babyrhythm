import { DaySleepData } from "@/hooks/useSleepData";

interface SleepChartVisualizationProps {
  data: DaySleepData[];
  showFullDay: boolean;
  ageInWeeks: number;
  currentWeekOffset?: number;
}

export const SleepChartVisualization = ({ data, showFullDay, ageInWeeks, currentWeekOffset = 0 }: SleepChartVisualizationProps) => {
  const startHour = showFullDay ? 0 : 6;
  const endHour = showFullDay ? 24 : 21;
  const totalHours = endHour - startHour;

  const getTimePosition = (time: Date) => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    
    const relativeMinutes = totalMinutes - startMinutes;
    return Math.max(0, Math.min(100, (relativeMinutes / (endMinutes - startMinutes)) * 100));
  };

  const getSleepBarColor = (type: 'nap' | 'overnight') => {
    return type === 'overnight' 
      ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
      : 'bg-gradient-to-r from-blue-400 to-cyan-500';
  };

  return (
    <div className="space-y-3">
      {/* Time axis */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        {Array.from({ length: Math.ceil(totalHours / 3) + 1 }, (_, i) => {
          const hour = startHour + (i * 3);
          if (hour > endHour) return null;
          return (
            <span key={hour}>
              {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </span>
          );
        })}
      </div>

      {/* Sleep chart */}
      <div className="space-y-2">
        {data.map((day) => (
          <div key={day.date} className="flex items-center gap-3">
            <div className="w-12 text-xs text-muted-foreground font-medium">
              {day.dayOfWeek}
            </div>
            
            <div className="flex-1 relative h-8 bg-muted/30 rounded-md overflow-hidden">
              {day.sleepPeriods.map((period, index) => {
                const startPos = getTimePosition(period.start);
                const endPos = getTimePosition(period.end);
                const width = Math.max(1, endPos - startPos);
                
                return (
                  <div
                    key={index}
                    className={`absolute h-full rounded-sm ${getSleepBarColor(period.type)} opacity-80 hover:opacity-100 transition-opacity`}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`
                    }}
                    title={`${period.type === 'nap' ? 'Nap' : 'Sleep'}: ${period.start.toLocaleTimeString('en', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })} - ${period.end.toLocaleTimeString('en', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}`}
                  />
                );
              })}
              
              {/* Current time indicator */}
              {currentWeekOffset === 0 && day.date === new Date().toISOString().split('T')[0] && (
                (() => {
                  const now = new Date();
                  const currentPos = getTimePosition(now);
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${currentPos}%` }}
                      title={`Current time: ${now.toLocaleTimeString('en', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}`}
                    />
                  );
                })()
              )}
            </div>
            
            <div className="w-16 text-xs text-muted-foreground text-right">
              {day.totalSleepMinutes > 0 ? (
                `${Math.floor(day.totalSleepMinutes / 60)}h ${Math.round(day.totalSleepMinutes % 60)}m`
              ) : (
                '-'
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};