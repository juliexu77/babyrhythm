import { useMemo, useState } from "react";
import { Activity } from "@/components/ActivityCard";
import { isDaytimeNap, isNightSleep } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { useTravelDays } from "@/hooks/useTravelDays";
import { getTodayActivities, getYesterdayActivities } from "@/utils/activityDateFilters";
import { DailyStatsHistory } from "./DailyStatsHistory";
import { ChevronLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DailyStatsBarProps {
  activities: Activity[];
}

export const DailyStatsBar = ({ activities }: DailyStatsBarProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const { travelDayDates } = useTravelDays();
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
    
    return {
      daySleep: {
        hours: Math.floor(daySleepMinutes / 60),
        mins: daySleepMinutes % 60,
        hasData: daySleepMinutes > 0 || todayNaps.length > 0,
        yesterdayHours: Math.floor(yesterdayDaySleepMinutes / 60),
        yesterdayMins: yesterdayDaySleepMinutes % 60
      },
      feeds: {
        volume: Math.round(totalFeedVolume),
        count: todayFeeds.length,
        hasVolume: totalFeedVolume > 0,
        yesterdayVolume: Math.round(yesterdayFeedVolume),
        yesterdayCount: yesterdayFeeds.length
      },
      nightSleep: {
        hours: Math.floor(nightSleepMinutes / 60),
        mins: nightSleepMinutes % 60,
        hasData: nightSleepMinutes > 0
      }
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 text-muted-foreground cursor-pointer">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="text-xs tabular-nums">
                      {stats.daySleep.yesterdayHours}h {stats.daySleep.yesterdayMins}m
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Yesterday
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 text-muted-foreground cursor-pointer">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="text-xs tabular-nums">
                      {stats.feeds.yesterdayVolume > 0 ? `${stats.feeds.yesterdayVolume} oz` : stats.feeds.yesterdayCount}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Yesterday
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 text-muted-foreground cursor-pointer">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="text-xs tabular-nums">—</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Yesterday
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <DailyStatsHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        activities={activities}
        nightSleepStartHour={nightSleepStartHour}
        nightSleepEndHour={nightSleepEndHour}
        travelDayDates={travelDayDates}
      />
    </>
  );
};
