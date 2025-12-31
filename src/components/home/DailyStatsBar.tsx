import { useMemo } from "react";
import { Moon, Milk, Droplet } from "lucide-react";
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
        if (duration < 0) duration += 24 * 60; // Handle overnight
        daySleepMinutes += duration;
      }
    });
    
    const daySleepHours = Math.floor(daySleepMinutes / 60);
    const daySleepMins = daySleepMinutes % 60;
    const daySleepText = daySleepMinutes > 0 
      ? `${daySleepHours}h ${daySleepMins}m` 
      : '0m';
    
    // Feed volume: sum today's feed quantities
    const todayFeeds = todayActivities.filter(a => a.type === 'feed');
    let totalFeedVolume = 0;
    let feedUnit = 'oz';
    
    todayFeeds.forEach(feed => {
      if (feed.details?.quantity) {
        const qty = parseFloat(feed.details.quantity);
        if (!isNaN(qty)) {
          // Normalize to oz (assume ml if unit is ml)
          if (feed.details.unit === 'ml') {
            totalFeedVolume += qty / 29.5735; // Convert ml to oz
          } else {
            totalFeedVolume += qty;
          }
        }
      }
    });
    
    const feedVolumeText = totalFeedVolume > 0 
      ? `${Math.round(totalFeedVolume)} oz` 
      : `${todayFeeds.length}`;
    
    // Previous night sleep: find night sleep that ended today (started yesterday evening)
    const allNaps = [...todayActivities, ...yesterdayActivities];
    const nightSleeps = allNaps.filter(a => 
      a.type === 'nap' && isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    // Sort by logged_at descending to get most recent
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
      
      // Night sleep typically crosses midnight
      let duration = endMins - startMins;
      if (duration <= 0) duration += 24 * 60; // Handle overnight
      nightSleepMinutes = duration;
    }
    
    const nightHours = Math.floor(nightSleepMinutes / 60);
    const nightMins = nightSleepMinutes % 60;
    const nightSleepText = nightSleepMinutes > 0 
      ? `${nightHours}h ${nightMins}m` 
      : '—';
    
    return {
      daySleep: {
        text: daySleepText,
        count: todayNaps.length,
        hasData: daySleepMinutes > 0 || todayNaps.length > 0
      },
      feeds: {
        text: feedVolumeText,
        count: todayFeeds.length,
        hasVolume: totalFeedVolume > 0
      },
      nightSleep: {
        text: nightSleepText,
        hasData: nightSleepMinutes > 0
      }
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="mx-4 mb-3">
      <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg bg-card border border-border">
        {/* Day Sleep */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Moon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {stats.daySleep.text}
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats.daySleep.count})
            </span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-px h-4 bg-border flex-shrink-0" />
        
        {/* Feeds */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
          <Milk className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {stats.feeds.text}
            </span>
            {stats.feeds.hasVolume && (
              <span className="text-xs text-muted-foreground">
                ({stats.feeds.count})
              </span>
            )}
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-px h-4 bg-border flex-shrink-0" />
        
        {/* Night Sleep */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <Moon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {stats.nightSleep.text}
          </span>
        </div>
      </div>
    </div>
  );
};
