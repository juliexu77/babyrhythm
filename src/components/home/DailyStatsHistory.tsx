import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { Activity } from "@/components/ActivityCard";
import { isDaytimeNap, isNightSleep } from "@/utils/napClassification";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface DailyStatsHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  travelDayDates: string[];
}

interface DayStats {
  date: Date;
  daySleep: { hours: number; mins: number; hasData: boolean };
  feeds: { volume: number; count: number; hasVolume: boolean };
  nightSleep: { hours: number; mins: number; hasData: boolean };
}

export const DailyStatsHistory = ({ 
  open, 
  onOpenChange, 
  activities,
  nightSleepStartHour,
  nightSleepEndHour,
  travelDayDates
}: DailyStatsHistoryProps) => {
  
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const calculateNapMinutes = (naps: Activity[]) => {
    let minutes = 0;
    naps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
        const startMins = parseTime(nap.details.startTime);
        const endMins = parseTime(nap.details.endTime);
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60;
        minutes += duration;
      }
    });
    return minutes;
  };

  const calculateFeedVolume = (feeds: Activity[]) => {
    let volume = 0;
    feeds.forEach(feed => {
      if (feed.details?.quantity) {
        const qty = parseFloat(feed.details.quantity);
        if (!isNaN(qty)) {
          if (feed.details.unit === 'ml') {
            volume += qty / 29.5735;
          } else {
            volume += qty;
          }
        }
      }
    });
    return volume;
  };

  const getActivitiesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return activities.filter(a => {
      const activityDate = format(new Date(a.loggedAt), 'yyyy-MM-dd');
      return activityDate === dateStr;
    });
  };

  const historyDays = useMemo(() => {
    const days: DayStats[] = [];
    let daysChecked = 0;
    let i = 0;
    
    // Get up to 7 non-travel days
    while (days.length < 7 && daysChecked < 30) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      i++;
      daysChecked++;
      
      // Skip travel days
      if (travelDayDates.includes(dateStr)) {
        continue;
      }
      
      const dayActivities = getActivitiesForDate(date);
      const prevDayActivities = getActivitiesForDate(subDays(date, 1));
      
      // Day sleep
      const naps = dayActivities.filter(a => 
        a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
      );
      const daySleepMinutes = calculateNapMinutes(naps);
      
      // Feeds
      const feeds = dayActivities.filter(a => a.type === 'feed');
      const totalFeedVolume = calculateFeedVolume(feeds);
      
      // Night sleep (from activities around this date)
      const allNaps = [...dayActivities, ...prevDayActivities];
      const nightSleeps = allNaps.filter(a => 
        a.type === 'nap' && isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
      );
      
      const recentNightSleep = nightSleeps.sort((a, b) => 
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      )[0];
      
      let nightSleepMinutes = 0;
      if (recentNightSleep?.details?.startTime && recentNightSleep?.details?.endTime) {
        const startMins = parseTime(recentNightSleep.details.startTime);
        const endMins = parseTime(recentNightSleep.details.endTime);
        let duration = endMins - startMins;
        if (duration <= 0) duration += 24 * 60;
        nightSleepMinutes = duration;
      }
      
      days.push({
        date,
        daySleep: {
          hours: Math.floor(daySleepMinutes / 60),
          mins: daySleepMinutes % 60,
          hasData: daySleepMinutes > 0 || naps.length > 0
        },
        feeds: {
          volume: Math.round(totalFeedVolume),
          count: feeds.length,
          hasVolume: totalFeedVolume > 0
        },
        nightSleep: {
          hours: Math.floor(nightSleepMinutes / 60),
          mins: nightSleepMinutes % 60,
          hasData: nightSleepMinutes > 0
        }
      });
    }
    
    return days;
  }, [activities, nightSleepStartHour, nightSleepEndHour, travelDayDates]);

  const formatDateLabel = (date: Date, index: number) => {
    if (index === 0) return "Today";
    if (index === 1) return "Yesterday";
    return format(date, "EEEE");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-semibold">Daily Snapshots</SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-full pb-8 space-y-1">
          {historyDays.map((day, index) => (
            <div 
              key={index} 
              className="bg-muted/30 px-5 py-5"
            >
              {/* Date Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  {formatDateLabel(day.date, index)}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {format(day.date, "MMM d")}
                </span>
              </div>
              
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Day Sleep */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Day Sleep</div>
                  <div className="text-lg font-bold tabular-nums text-foreground">
                    {day.daySleep.hasData ? (
                      <>{day.daySleep.hours}h {day.daySleep.mins}m</>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                </div>
                
                {/* Feeds */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Feeds</div>
                  <div className="text-lg font-bold tabular-nums text-foreground">
                    {day.feeds.hasVolume ? (
                      <>{day.feeds.volume} oz</>
                    ) : day.feeds.count > 0 ? (
                      <>{day.feeds.count}</>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                </div>
                
                {/* Night Sleep */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Night</div>
                  <div className="text-lg font-bold tabular-nums text-foreground">
                    {day.nightSleep.hasData ? (
                      <>{day.nightSleep.hours}h {day.nightSleep.mins}m</>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
