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
    <div className="px-4 mb-8">
      {/* Stats row - Strava style: label on top, big value below, left-aligned */}
      <div className="flex gap-8">
        {/* Day Naps */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Day Sleep
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.daySleep.hasData ? (
              <>{stats.daySleep.hours}h {stats.daySleep.mins}m</>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </div>
        </div>
        
        {/* Feeds */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Feeds
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.feeds.hasVolume ? (
              <>{stats.feeds.volume} oz</>
            ) : stats.feeds.count > 0 ? (
              <>{stats.feeds.count}</>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </div>
        </div>
        
        {/* Night Sleep */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Last Night
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {stats.nightSleep.hasData ? (
              <>{stats.nightSleep.hours}h {stats.nightSleep.mins}m</>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};