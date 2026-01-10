import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { isDaytimeNap, isNightSleep } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from "date-fns";

interface WeeklyStatsPageProps {
  activities: Activity[];
  babyName?: string;
}

export const WeeklyStatsPage = ({ activities, babyName }: WeeklyStatsPageProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Filter activities for this week
    const weekActivities = activities.filter(a => {
      try {
        const activityDate = parseISO(a.loggedAt);
        return isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });
    
    // Count naps
    const naps = weekActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    // Calculate total nap time
    let totalNapMinutes = 0;
    naps.forEach(nap => {
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
        totalNapMinutes += duration;
      }
    });
    
    const napHours = Math.floor(totalNapMinutes / 60);
    const napMins = totalNapMinutes % 60;
    
    // Count feeds and volume
    const feeds = weekActivities.filter(a => a.type === 'feed');
    let totalFeedVolume = 0;
    
    feeds.forEach(feed => {
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
    
    // Night sleep hours
    const nightSleeps = weekActivities.filter(a => 
      a.type === 'nap' && isNightSleep(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    let totalNightMinutes = 0;
    nightSleeps.forEach(sleep => {
      if (sleep.details?.startTime && sleep.details?.endTime) {
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
        
        const startMins = parseTime(sleep.details.startTime);
        const endMins = parseTime(sleep.details.endTime);
        let duration = endMins - startMins;
        if (duration <= 0) duration += 24 * 60;
        totalNightMinutes += duration;
      }
    });
    
    const nightHours = Math.floor(totalNightMinutes / 60);
    
    // Days with data
    const uniqueDays = new Set(
      weekActivities.map(a => format(parseISO(a.loggedAt), 'yyyy-MM-dd'))
    );
    
    return {
      napCount: naps.length,
      napTime: `${napHours}h ${napMins}m`,
      hasNapData: totalNapMinutes > 0,
      feedCount: feeds.length,
      feedVolume: Math.round(totalFeedVolume),
      hasFeedVolume: totalFeedVolume > 0,
      nightHours,
      hasNightData: totalNightMinutes > 0,
      daysTracked: uniqueDays.size
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-label-xs uppercase tracking-caps text-muted-foreground/60">
          This Week
        </p>
        <span className="text-xs text-muted-foreground/40">
          {stats.daysTracked} day{stats.daysTracked !== 1 ? 's' : ''} tracked
        </span>
      </div>
      
      {/* Stats grid - Strava style */}
      <div className="flex gap-6">
        {/* Day Naps */}
        <div>
          <div className="text-label-xs uppercase tracking-caps text-muted-foreground/60 mb-0.5">
            Naps
          </div>
          <div className="text-stat-sm tabular-nums text-foreground">
            {stats.hasNapData ? stats.napTime : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground/50 tabular-nums">
            {stats.napCount} nap{stats.napCount !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Feeds */}
        <div>
          <div className="text-label-xs uppercase tracking-caps text-muted-foreground/60 mb-0.5">
            Feeds
          </div>
          <div className="text-stat-sm tabular-nums text-foreground">
            {stats.hasFeedVolume ? (
              <>{stats.feedVolume} oz</>
            ) : stats.feedCount > 0 ? (
              <>{stats.feedCount}</>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground/50 tabular-nums">
            {stats.feedCount} feed{stats.feedCount !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Night Sleep */}
        <div>
          <div className="text-label-xs uppercase tracking-caps text-muted-foreground/60 mb-0.5">
            Nights
          </div>
          <div className="text-stat-sm tabular-nums text-foreground">
            {stats.hasNightData ? (
              <>{stats.nightHours}h avg</>
            ) : (
              <span className="text-muted-foreground/30">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
