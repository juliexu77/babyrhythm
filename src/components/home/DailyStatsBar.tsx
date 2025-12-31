import { useMemo } from "react";
import { Moon, Milk } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { isDaytimeNap, isNightSleep } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getTodayActivities, getYesterdayActivities } from "@/utils/activityDateFilters";

interface DailyStatsBarProps {
  activities: Activity[];
}

export const DailyStatsBar = ({ activities }: DailyStatsBarProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  const stats = useMemo(() => {
    const todayActivities = getTodayActivities(activities);
    const yesterdayActivities = getYesterdayActivities(activities);
    
    // Day sleep: count today's daytime naps and total duration
    const todayNaps = todayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    let daySleepMinutes = 0;
    todayNaps.forEach(nap => {
      if (nap.details?.startTime && nap.details?.endTime) {
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
        
        const startMins = parseTime(nap.details.startTime);
        const endMins = parseTime(nap.details.endTime);
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60;
        daySleepMinutes += duration;
      }
    });
    
    const daySleepHours = Math.floor(daySleepMinutes / 60);
    const daySleepMins = daySleepMinutes % 60;
    
    // Feed volume: sum today's feed quantities
    const todayFeeds = todayActivities.filter(a => a.type === 'feed');
    let totalFeedVolume = 0;
    
    todayFeeds.forEach(feed => {
      if (feed.details?.quantity) {
        const qty = parseFloat(feed.details.quantity);
        if (!isNaN(qty)) {
          if (feed.details.unit === 'ml') {
            totalFeedVolume += qty / 29.5735;
          } else {
            totalFeedVolume += qty;
          }
        }
      }
    });
    
    // Previous night sleep
    const allNaps = [...todayActivities, ...yesterdayActivities];
    const nightSleeps = allNaps.filter(a => 
      a.type === 'nap' && isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    const recentNightSleep = nightSleeps.sort((a, b) => 
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    )[0];
    
    let nightSleepMinutes = 0;
    if (recentNightSleep?.details?.startTime && recentNightSleep?.details?.endTime) {
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
      
      const startMins = parseTime(recentNightSleep.details.startTime);
      const endMins = parseTime(recentNightSleep.details.endTime);
      
      let duration = endMins - startMins;
      if (duration <= 0) duration += 24 * 60;
      nightSleepMinutes = duration;
    }
    
    const nightHours = Math.floor(nightSleepMinutes / 60);
    const nightMins = nightSleepMinutes % 60;
    
    return {
      daySleep: {
        hours: daySleepHours,
        mins: daySleepMins,
        count: todayNaps.length,
        hasData: daySleepMinutes > 0 || todayNaps.length > 0
      },
      feeds: {
        volume: Math.round(totalFeedVolume),
        count: todayFeeds.length,
        hasVolume: totalFeedVolume > 0
      },
      nightSleep: {
        hours: nightHours,
        mins: nightMins,
        hasData: nightSleepMinutes > 0
      }
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="mx-4 mb-6">
      {/* Section label */}
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
        Today's Stats
      </h2>
      
      {/* Stats grid - prominent scorecard style */}
      <div className="grid grid-cols-3 gap-4">
        {/* Day Naps */}
        <div className="text-center py-3 px-2 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Moon className="w-4 h-4 text-muted-foreground/80" />
          </div>
          <div className="mb-0.5">
            {stats.daySleep.hasData ? (
              <span className="text-xl font-bold tabular-nums text-foreground">
                {stats.daySleep.hours}h {stats.daySleep.mins}m
              </span>
            ) : (
              <span className="text-xl font-bold text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Day Sleep {stats.daySleep.count > 0 && `(${stats.daySleep.count})`}
          </div>
        </div>
        
        {/* Feeds */}
        <div className="text-center py-3 px-2 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Milk className="w-4 h-4 text-muted-foreground/80" />
          </div>
          <div className="mb-0.5">
            {stats.feeds.hasVolume ? (
              <span className="text-xl font-bold tabular-nums text-foreground">
                {stats.feeds.volume} oz
              </span>
            ) : stats.feeds.count > 0 ? (
              <span className="text-xl font-bold tabular-nums text-foreground">
                {stats.feeds.count}
              </span>
            ) : (
              <span className="text-xl font-bold text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Feeds {stats.feeds.count > 0 && stats.feeds.hasVolume && `(${stats.feeds.count})`}
          </div>
        </div>
        
        {/* Night Sleep */}
        <div className="text-center py-3 px-2 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Moon className="w-4 h-4 text-muted-foreground/80" />
          </div>
          <div className="mb-0.5">
            {stats.nightSleep.hasData ? (
              <span className="text-xl font-bold tabular-nums text-foreground">
                {stats.nightSleep.hours}h {stats.nightSleep.mins}m
              </span>
            ) : (
              <span className="text-xl font-bold text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Last Night
          </div>
        </div>
      </div>
    </div>
  );
};