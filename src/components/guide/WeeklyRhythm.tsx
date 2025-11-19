import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, subDays, startOfDay } from "date-fns";

interface NapData {
  date: string;
  naps: { startMinutes: number; durationMinutes: number }[];
}

interface WeeklyRhythmProps {
  activities: any[];
  babyName: string;
}

export const WeeklyRhythm = ({ activities, babyName }: WeeklyRhythmProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Get last 7 days of nap data
  const getLast7DaysNaps = (): NapData[] => {
    const today = startOfDay(new Date());
    const days: NapData[] = [];

    // Start from today (i=0) and go back 6 days
    for (let i = 0; i <= 6; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filter naps for this day using actual nap start time
      const dayNaps = activities
        .filter(a => {
          if (a.type !== 'nap' || !a.details?.startTime || !a.details?.endTime) return false;
          
          // Parse the start time to get the date
          // startTime format is like "7:30 AM" - we need to combine with logged_at date
          const loggedDate = new Date(a.logged_at);
          const [time, period] = a.details.startTime.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          
          const napStartDate = new Date(loggedDate);
          napStartDate.setHours(hour24, minutes, 0, 0);
          
          const napDateStr = format(napStartDate, 'yyyy-MM-dd');
          return napDateStr === dateStr;
        })
        .map(a => {
          // Parse actual start time for positioning
          const [time, period] = a.details.startTime.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          const startMinutes = hour24 * 60 + minutes;
          
          // Parse end time for duration
          const [endTime, endPeriod] = a.details.endTime.split(' ');
          const [endHours, endMinutes] = endTime.split(':').map(Number);
          let endHour24 = endHours;
          if (endPeriod === 'PM' && endHours !== 12) endHour24 += 12;
          if (endPeriod === 'AM' && endHours === 12) endHour24 = 0;
          const endTimeMinutes = endHour24 * 60 + endMinutes;
          
          // Calculate duration (handle overnight naps)
          let durationMinutes = endTimeMinutes - startMinutes;
          if (durationMinutes < 0) durationMinutes += 24 * 60;
          
          return { startMinutes, durationMinutes };
        })
        .sort((a, b) => a.startMinutes - b.startMinutes);

      days.push({ date: dateStr, naps: dayNaps });
    }

    return days;
  };

  const weekData = getLast7DaysNaps();

  // Timeline from 6am (360 min) to 9pm (1260 min) = 900 minutes total
  const timelineStart = 6 * 60; // 6am
  const timelineEnd = 21 * 60; // 9pm
  const timelineRange = timelineEnd - timelineStart;

  // Convert time in minutes to percentage position on timeline
  const getPositionPercent = (minutes: number) => {
    const clampedMinutes = Math.max(timelineStart, Math.min(timelineEnd, minutes));
    return ((clampedMinutes - timelineStart) / timelineRange) * 100;
  };

  // Convert duration to width percentage
  const getWidthPercent = (durationMinutes: number) => {
    return (durationMinutes / timelineRange) * 100;
  };

  return (
    <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-3-dark to-card-ombre-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/20 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="px-4 py-5 border-b border-border/30">
          <CollapsibleTrigger className="w-full" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
                This Week&apos;s Rhythm
              </h3>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
        </div>

        {/* Nap Barcode Visualization */}
        <CollapsibleContent>
          <div className="px-4 pb-5 pt-3">
            {/* Time markers */}
            <div className="flex items-center mb-3">
              <span className="w-12 flex-shrink-0"></span>
              <div className="flex-1 relative h-4">
                <span className="absolute text-[9px] text-muted-foreground/60" style={{ left: '0%' }}>6am</span>
                <span className="absolute text-[9px] text-muted-foreground/60" style={{ left: '20%' }}>9am</span>
                <span className="absolute text-[9px] text-muted-foreground/60" style={{ left: '40%' }}>12pm</span>
                <span className="absolute text-[9px] text-muted-foreground/60" style={{ left: '60%' }}>3pm</span>
                <span className="absolute text-[9px] text-muted-foreground/60" style={{ left: '80%' }}>6pm</span>
                <span className="absolute text-[9px] text-muted-foreground/60 right-0">9pm</span>
              </div>
            </div>

            {/* Days with naps */}
            <div className="space-y-2.5">
              {weekData.map((day, dayIndex) => {
                const isToday = dayIndex === 0;
                const dayLabel = isToday ? 'Today' : format(new Date(day.date), 'EEE');
                const hasNaps = day.naps.length > 0;
                
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className={`text-xs font-medium w-12 flex-shrink-0 ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {dayLabel}
                    </span>
                    <div className="flex-1 relative h-[15px] bg-muted/20 rounded-full">
                      {hasNaps ? (
                        day.naps.map((nap, idx) => {
                          const leftPos = getPositionPercent(nap.startMinutes);
                          const width = getWidthPercent(nap.durationMinutes);
                          const startHour = Math.floor(nap.startMinutes / 60);
                          const startMin = nap.startMinutes % 60;
                          const timeLabel = `${startHour % 12 || 12}:${startMin.toString().padStart(2, '0')}${startHour >= 12 ? 'pm' : 'am'}`;
                          
                          return (
                            <div
                              key={idx}
                              className="absolute h-full bg-primary/80 rounded-full transition-all"
                              style={{ 
                                left: `${leftPos}%`, 
                                width: `${width}%`,
                                minWidth: '8px'
                              }}
                              title={`${timeLabel} • ${Math.round(nap.durationMinutes)} min`}
                            />
                          );
                        })
                      ) : (
                        <span className="absolute left-2 top-0 text-[9px] text-muted-foreground/40 leading-[15px]">No naps</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
