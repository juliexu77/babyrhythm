import { useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { format, startOfDay, differenceInMinutes, isAfter } from "date-fns";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { Milk } from "lucide-react";

interface FeedFrequencyProps {
  activities: Activity[];
}

export const FeedFrequency = ({ activities }: FeedFrequencyProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  const feedData = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const currentHour = now.getHours();
    
    // Determine if we're currently in night or day
    const isCurrentlyNight = currentHour >= nightSleepStartHour || currentHour < nightSleepEndHour;
    
    // Get today's feeds
    const todayFeeds = activities.filter(a => {
      if (a.type !== 'feed') return false;
      const activityDate = new Date(a.loggedAt);
      return activityDate >= todayStart;
    }).sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    
    // Convert feeds to time markers (minutes since midnight)
    const feedMarkers = todayFeeds.map(feed => {
      const feedTime = new Date(feed.loggedAt);
      return differenceInMinutes(feedTime, todayStart);
    });
    
    // Define day segments based on sleep windows
    const morningStart = nightSleepEndHour * 60;
    const nightStart = nightSleepStartHour * 60;
    const dayDuration = nightStart - morningStart;
    const nightDuration = (24 * 60) - dayDuration;
    
    // Categorize feeds into day/night
    const dayFeeds = feedMarkers.filter(m => m >= morningStart && m < nightStart);
    const nightFeeds = feedMarkers.filter(m => m < morningStart || m >= nightStart);
    
    return {
      dayFeeds,
      nightFeeds,
      morningStart,
      nightStart,
      dayDuration,
      nightDuration,
      totalFeeds: todayFeeds.length,
      isCurrentlyNight
    };
  }, [activities, nightSleepStartHour, nightSleepEndHour]);
  
  // Calculate position percentage along the timeline
  const getPositionPercent = (minutes: number, segmentStart: number, segmentDuration: number) => {
    const relativeMinutes = minutes - segmentStart;
    return Math.max(0, Math.min(100, (relativeMinutes / segmentDuration) * 100));
  };
  
  const currentFeeds = feedData.isCurrentlyNight ? feedData.nightFeeds : feedData.dayFeeds;
  const segmentStart = feedData.isCurrentlyNight ? feedData.nightStart : feedData.morningStart;
  const segmentDuration = feedData.isCurrentlyNight ? feedData.nightDuration : feedData.dayDuration;
  
  return (
    <div className="w-full px-4 py-3">
      {/* Scrollable container - scroll right to see earlier times */}
      <div 
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="relative min-w-[500px]">
          {/* Quiet horizontal line */}
          <div className="relative h-[2px] w-full bg-border/30">
            {currentFeeds.map((feedTime, idx) => {
              let position;
              if (feedData.isCurrentlyNight) {
                // For night feeds, calculate position within night window
                let relativeTime = feedTime;
                if (feedTime >= feedData.nightStart) {
                  relativeTime = feedTime - feedData.nightStart;
                } else {
                  relativeTime = feedTime + (24 * 60 - feedData.nightStart);
                }
                position = (relativeTime / feedData.nightDuration) * 100;
              } else {
                position = getPositionPercent(feedTime, feedData.morningStart, feedData.dayDuration);
              }
              
              return (
                <div
                  key={`feed-${idx}`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                </div>
              );
            })}
          </div>
          
          {/* Subtle time labels */}
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground/60">
            <span>
              {feedData.isCurrentlyNight 
                ? format(new Date().setHours(feedData.nightStart / 60, 0), 'h a')
                : format(new Date().setHours(feedData.morningStart / 60, 0), 'h a')
              }
            </span>
            <span className="font-medium text-foreground/40">
              {feedData.totalFeeds} {feedData.totalFeeds === 1 ? 'feed' : 'feeds'}
            </span>
            <span>
              {feedData.isCurrentlyNight 
                ? format(new Date().setHours(feedData.morningStart / 60, 0), 'h a')
                : format(new Date().setHours(feedData.nightStart / 60, 0), 'h a')
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
