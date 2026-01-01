import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { isDaytimeNap, isNightSleep } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getTodayActivities, getYesterdayActivities } from "@/utils/activityDateFilters";
import { DailyStatsHistory } from "./DailyStatsHistory";

interface DailyStatsBarProps {
  activities: Activity[];
}

export const DailyStatsBar = ({ activities }: DailyStatsBarProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const [showHistory, setShowHistory] = useState(false);
  
  const stats = useMemo(() => {
    const todayActivities = getTodayActivities(activities);
    const yesterdayActivities = getYesterdayActivities(activities);
    
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
    
    // Day sleep
    const todayNaps = todayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    const yesterdayNaps = yesterdayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime
    );
    
    const daySleepMinutes = calculateNapMinutes(todayNaps);
    const yesterdayDaySleepMinutes = calculateNapMinutes(yesterdayNaps);
    
    // Feeds
    const todayFeeds = todayActivities.filter(a => a.type === 'feed');
    const yesterdayFeeds = yesterdayActivities.filter(a => a.type === 'feed');
    
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
    
    const totalFeedVolume = calculateFeedVolume(todayFeeds);
    const yesterdayFeedVolume = calculateFeedVolume(yesterdayFeeds);
    
    // Night sleep
    const allNaps = [...todayActivities, ...yesterdayActivities];
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
    
    // Calculate differences
    const daySleepDiff = daySleepMinutes - yesterdayDaySleepMinutes;
    const feedVolumeDiff = totalFeedVolume - yesterdayFeedVolume;
    const feedCountDiff = todayFeeds.length - yesterdayFeeds.length;

    return {
      daySleep: {
        hours: Math.floor(daySleepMinutes / 60),
        mins: daySleepMinutes % 60,
        hasData: daySleepMinutes > 0 || todayNaps.length > 0,
        diff: daySleepDiff,
        diffHours: Math.floor(Math.abs(daySleepDiff) / 60),
        diffMins: Math.abs(daySleepDiff) % 60
      },
      feeds: {
        volume: Math.round(totalFeedVolume),
        count: todayFeeds.length,
        hasVolume: totalFeedVolume > 0,
        yesterdayHasVolume: yesterdayFeedVolume > 0,
        volumeDiff: Math.round(feedVolumeDiff),
        countDiff: feedCountDiff
      },
      nightSleep: {
        hours: Math.floor(nightSleepMinutes / 60),
        mins: nightSleepMinutes % 60,
        hasData: nightSleepMinutes > 0
      }
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

  const getTrendIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-3 h-3" />;
    if (diff < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = (diff: number) => {
    if (diff > 0) return "text-emerald-500";
    if (diff < 0) return "text-rose-400";
    return "text-muted-foreground";
  };

  return (
    <>
      <div className="px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">Today's Snapshot</h3>
          <button 
            className="text-sm font-semibold text-primary"
            onClick={() => setShowHistory(true)}
          >
            See More
          </button>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Day Sleep */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Day Sleep</div>
            <div className="text-xl font-bold tabular-nums text-foreground mb-2">
              {stats.daySleep.hasData ? (
                <>{stats.daySleep.hours}h {stats.daySleep.mins}m</>
              ) : (
                <span className="text-muted-foreground/50">0h 0m</span>
              )}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 ${getTrendColor(stats.daySleep.diff)}`}>
              {getTrendIcon(stats.daySleep.diff)}
              <span className="text-xs tabular-nums">
                {stats.daySleep.diff !== 0 ? (
                  <>{stats.daySleep.diff > 0 ? '+' : '-'}{stats.daySleep.diffHours > 0 ? `${stats.daySleep.diffHours}h ` : ''}{stats.daySleep.diffMins}m</>
                ) : (
                  "same"
                )}
              </span>
            </div>
          </div>
          
          {/* Feeds */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Feeds</div>
            <div className="text-xl font-bold tabular-nums text-foreground mb-2">
              {stats.feeds.hasVolume ? (
                <>{stats.feeds.volume} oz</>
              ) : stats.feeds.count > 0 ? (
                <>{stats.feeds.count}</>
              ) : (
                <span className="text-muted-foreground/50">0</span>
              )}
            </div>
            {stats.feeds.hasVolume || stats.feeds.yesterdayHasVolume ? (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 ${getTrendColor(stats.feeds.volumeDiff)}`}>
                {getTrendIcon(stats.feeds.volumeDiff)}
                <span className="text-xs tabular-nums">
                  {stats.feeds.volumeDiff !== 0 ? (
                    <>{stats.feeds.volumeDiff > 0 ? '+' : ''}{stats.feeds.volumeDiff} oz</>
                  ) : (
                    "same"
                  )}
                </span>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 ${getTrendColor(stats.feeds.countDiff)}`}>
                {getTrendIcon(stats.feeds.countDiff)}
                <span className="text-xs tabular-nums">
                  {stats.feeds.countDiff !== 0 ? (
                    <>{stats.feeds.countDiff > 0 ? '+' : ''}{stats.feeds.countDiff}</>
                  ) : (
                    "same"
                  )}
                </span>
              </div>
            )}
          </div>
          
          {/* Night Sleep */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Last Night</div>
            <div className="text-xl font-bold tabular-nums text-foreground mb-2">
              {stats.nightSleep.hasData ? (
                <>{stats.nightSleep.hours}h {stats.nightSleep.mins}m</>
              ) : (
                <span className="text-muted-foreground/50">0h 0m</span>
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-muted-foreground">
              <Minus className="w-3 h-3" />
              <span className="text-xs tabular-nums">vs prior</span>
            </div>
          </div>
        </div>
      </div>
      
      <DailyStatsHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        activities={activities}
        nightSleepStartHour={nightSleepStartHour}
        nightSleepEndHour={nightSleepEndHour}
      />
    </>
  );
};
