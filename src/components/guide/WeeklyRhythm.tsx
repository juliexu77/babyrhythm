import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay } from "date-fns";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";
import { supabase } from "@/integrations/supabase/client";
import { generateRhythmSubtitle } from "@/utils/rhythmSubtitleGenerator";

interface NapData {
  date: string;
  naps: { startMinutes: number; durationMinutes: number; startTime: string; endTime: string }[];
}

interface WeeklyRhythmProps {
  activities: any[];
  babyName: string;
  travelDayDates?: string[];
}

export const WeeklyRhythm = ({ activities, babyName, travelDayDates = [] }: WeeklyRhythmProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedNap, setSelectedNap] = useState<{ startTime: string; endTime: string } | null>(null);
  const [subtitle, setSubtitle] = useState<string>("");
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();

  // Helper to check if a date is a travel day
  const isTravelDay = (dateStr: string): boolean => {
    return travelDayDates.includes(dateStr);
  };

  // Get last 7 days of nap data, excluding travel days
  const getLast7DaysNaps = (): NapData[] => {
    const today = startOfDay(new Date());
    const days: NapData[] = [];

    // Start from today (i=0) and go back 6 days
    for (let i = 0; i <= 6; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Skip travel days - show them as empty
      if (isTravelDay(dateStr)) {
        days.push({ date: dateStr, naps: [] });
        continue;
      }
      
      // Filter naps for this day using actual nap start time - only show daytime naps
      const dayNaps = activities
        .filter(a => {
          try {
            if (a.type !== 'nap' || !a.details?.startTime || !a.details?.endTime) return false;
            
            // Validate logged_at exists
            if (!a.logged_at && !a.loggedAt) return false;
            
            // Only include daytime naps (exclude night sleep)
            if (!isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)) return false;
            
            // Parse the start time to get the date
            // startTime format is like "7:30 AM" - we need to combine with logged_at date
            const loggedAtStr = a.logged_at || a.loggedAt;
            const loggedDate = new Date(loggedAtStr);
            
            // Validate the date is valid
            if (isNaN(loggedDate.getTime())) return false;
            
            const startTimeParts = a.details.startTime.split(' ');
            if (startTimeParts.length !== 2) return false;
            
            const [time, period] = startTimeParts;
            const timeParts = time.split(':');
            if (timeParts.length !== 2) return false;
            
            const [hours, minutes] = timeParts.map(Number);
            if (isNaN(hours) || isNaN(minutes)) return false;
            
            let hour24 = hours;
            if (period === 'PM' && hours !== 12) hour24 += 12;
            if (period === 'AM' && hours === 12) hour24 = 0;
            
            const napStartDate = new Date(loggedDate);
            napStartDate.setHours(hour24, minutes, 0, 0);
            
            // Validate napStartDate is valid before formatting
            if (isNaN(napStartDate.getTime())) return false;
            
            const napYear = napStartDate.getFullYear();
            const napMonth = String(napStartDate.getMonth() + 1).padStart(2, '0');
            const napDay = String(napStartDate.getDate()).padStart(2, '0');
            const napDateStr = `${napYear}-${napMonth}-${napDay}`;
            
            return napDateStr === dateStr;
          } catch {
            return false;
          }
        })
        .map(a => {
          try {
            // Parse actual start time for positioning
            const startParts = a.details.startTime.split(' ');
            const [time, period] = startParts;
            const timeParts = time.split(':');
            const hours = parseInt(timeParts[0], 10) || 0;
            const minutes = parseInt(timeParts[1], 10) || 0;
            let hour24 = hours;
            if (period === 'PM' && hours !== 12) hour24 += 12;
            if (period === 'AM' && hours === 12) hour24 = 0;
            const startMinutes = hour24 * 60 + minutes;
            
            // Parse end time for duration
            const endParts = a.details.endTime.split(' ');
            const [endTime, endPeriod] = endParts;
            const endTimeParts = endTime.split(':');
            const endHours = parseInt(endTimeParts[0], 10) || 0;
            const endMins = parseInt(endTimeParts[1], 10) || 0;
            let endHour24 = endHours;
            if (endPeriod === 'PM' && endHours !== 12) endHour24 += 12;
            if (endPeriod === 'AM' && endHours === 12) endHour24 = 0;
            const endTimeMinutes = endHour24 * 60 + endMins;
            
            // Calculate duration (handle overnight naps)
            let durationMinutes = endTimeMinutes - startMinutes;
            if (durationMinutes < 0) durationMinutes += 24 * 60;
            
            return { 
              startMinutes, 
              durationMinutes,
              startTime: a.details.startTime,
              endTime: a.details.endTime
            };
          } catch {
            return null;
          }
        })
        .filter((nap): nap is { startMinutes: number; durationMinutes: number; startTime: string; endTime: string } => nap !== null)
        .sort((a, b) => a.startMinutes - b.startMinutes);

      days.push({ date: dateStr, naps: dayNaps });
    }

    return days;
  };

  const weekData = getLast7DaysNaps();

  // Generate template-based subtitle (instant, no loading)
  useEffect(() => {
    if (weekData.length === 0) {
      setSubtitle("");
      return;
    }
    
    // Convert weekData to format expected by template generator
    const formattedData = weekData.map(day => ({
      date: day.date,
      naps: day.naps.map(nap => ({
        duration: nap.durationMinutes,
        startTime: nap.startTime
      }))
    }));
    
    const generated = generateRhythmSubtitle(formattedData);
    setSubtitle(generated);
  }, [weekData.length]);

  // Timeline matches user's night sleep window (daytime window)
  const timelineStart = nightSleepEndHour * 60; // Night sleep end (e.g., 7am)
  const timelineEnd = nightSleepStartHour * 60; // Night sleep start (e.g., 7pm)
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
    <div className="mb-0 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header - Strava style */}
        <div className="px-4 py-2">
          <CollapsibleTrigger className="w-full" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-left">
                <h3 className="text-label-xs uppercase tracking-caps text-muted-foreground/60">
                  This Week
                </h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground/50 mt-0.5 leading-tight">{subtitle}</p>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </div>
          </CollapsibleTrigger>
        </div>

        {/* Nap Barcode Visualization - tighter */}
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-1">
            {/* Time markers - subtle grid lines */}
            <div className="flex items-center mb-2">
              <span className="w-10 flex-shrink-0"></span>
              <div className="flex-1 relative h-3">
                {[0, 0.25, 0.5, 0.75, 1].map((pos) => {
                  const minutes = timelineStart + (timelineRange * pos);
                  const hour = Math.floor(minutes / 60);
                  const displayHour = hour % 12 || 12;
                  const period = hour >= 12 ? 'p' : 'a';
                  const label = `${displayHour}${period}`;
                  
                  return (
                    <span
                      key={pos}
                      className="absolute text-[8px] font-medium text-muted-foreground/40 tracking-wide"
                      style={{ left: pos === 1 ? 'auto' : `${pos * 100}%`, right: pos === 1 ? '0' : 'auto' }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Days with naps - tighter rows, sharper bars */}
            <div className="space-y-1.5">
              {weekData.map((day, dayIndex) => {
                const isToday = dayIndex === 0;
                let dayLabel = 'Day';
                try {
                  if (isToday) {
                    dayLabel = 'Today';
                  } else if (day.date && typeof day.date === 'string' && day.date.includes('-')) {
                    const parts = day.date.split('-');
                    if (parts.length === 3) {
                      const year = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10);
                      const dayNum = parseInt(parts[2], 10);
                      if (!isNaN(year) && !isNaN(month) && !isNaN(dayNum)) {
                        const parsedDate = new Date(year, month - 1, dayNum);
                        if (!isNaN(parsedDate.getTime())) {
                          dayLabel = format(parsedDate, 'EEE');
                        }
                      }
                    }
                  }
                } catch {
                  dayLabel = isToday ? 'Today' : 'Day';
                }
                const hasNaps = day.naps.length > 0;
                const dayIsTravelDay = isTravelDay(day.date);
                
                return (
                  <div key={day.date} className="flex items-center gap-2">
                    <span className={`text-[9px] font-semibold tracking-wide w-10 flex-shrink-0 ${isToday ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                      {dayLabel}
                    </span>
                    {/* Bar track with subtle grid lines */}
                    <div className={`flex-1 relative h-[10px] rounded-strava-sm ${dayIsTravelDay ? 'bg-muted/10' : 'bg-muted/15'}`}
                         style={{
                           backgroundImage: 'linear-gradient(90deg, transparent 24.9%, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.03) 25.1%, transparent 25.2%, transparent 49.9%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.03) 50.1%, transparent 50.2%, transparent 74.9%, rgba(0,0,0,0.03) 75%, rgba(0,0,0,0.03) 75.1%, transparent 75.2%)'
                         }}>
                      {dayIsTravelDay ? (
                        <span className="absolute left-1.5 top-0 text-[8px] text-muted-foreground/30 leading-[10px] tracking-wide flex items-center gap-0.5">
                          <span>✈</span>
                          <span className="uppercase">Travel</span>
                        </span>
                      ) : hasNaps ? (
                        day.naps.map((nap, idx) => {
                          const leftPos = getPositionPercent(nap.startMinutes);
                          const width = getWidthPercent(nap.durationMinutes);
                          
                          return (
                            <Popover key={idx}>
                              <PopoverTrigger asChild>
                                <div
                                  className="absolute h-full bg-primary/80 rounded-strava-sm transition-all cursor-pointer hover:bg-primary"
                                  style={{ 
                                    left: `${leftPos}%`, 
                                    width: `${width}%`,
                                    minWidth: '4px'
                                  }}
                                  onClick={() => setSelectedNap({ startTime: nap.startTime, endTime: nap.endTime })}
                                />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2 rounded-strava shadow-strava">
                                <div className="text-xs">
                                  <div className="text-[10px] font-medium text-foreground mb-0.5">Nap</div>
                                  <div className="text-muted-foreground tabular-nums text-[11px]">
                                    {nap.startTime} – {nap.endTime}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/50 mt-0.5 tabular-nums">
                                    {Math.round(nap.durationMinutes)}m
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })
                      ) : (
                        <span className="absolute left-1.5 top-0 text-[8px] text-muted-foreground/25 leading-[10px] tracking-wide">No naps</span>
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
