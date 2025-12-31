import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";
import { useMemo } from "react";

interface TomorrowPreviewProps {
  activities: Activity[];
  babyName?: string;
  onClick: () => void;
}

export const TomorrowPreview = ({ 
  activities, 
  babyName,
  onClick 
}: TomorrowPreviewProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  // Get today's activities
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    return format(activityDate, 'yyyy-MM-dd') === todayStr;
  });

  // Check if current time is within "story time" window (bedtime to wake-up time)
  const currentHour = today.getHours();
  const isStoryTime = currentHour >= nightSleepStartHour || currentHour < nightSleepEndHour;

  // Count feeds and naps
  const feedCount = todayActivities.filter(a => a.type === 'feed').length;
  const napCount = todayActivities.filter(a => 
    a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
  ).length;
  const hasMinimumForStory = feedCount >= 1 && napCount >= 1;

  // Generate tomorrow's preview text based on today's patterns
  const tomorrowInsight = useMemo(() => {
    if (todayActivities.length === 0) return null;

    // Find first nap time
    const firstNap = todayActivities
      .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.startTime)
      .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())[0];

    // Calculate total nap time
    const totalNapMinutes = todayActivities
      .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour))
      .reduce((sum, a) => {
        if (a.details?.startTime && a.details?.endTime) {
          const parseTime = (timeStr: string) => {
            const [time, period] = timeStr.split(' ');
            const [hStr, mStr] = time.split(':');
            let h = parseInt(hStr, 10);
            const m = parseInt(mStr || '0', 10);
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
          };
          const startMinutes = parseTime(a.details.startTime);
          const endMinutes = parseTime(a.details.endTime);
          const duration = endMinutes >= startMinutes 
            ? endMinutes - startMinutes 
            : (24 * 60) - startMinutes + endMinutes;
          return sum + duration;
        }
        return sum;
      }, 0);

    // Generate insight based on patterns
    if (totalNapMinutes < 120 && napCount >= 2) {
      return "Shorter naps today — tomorrow may need an earlier first nap";
    }
    if (feedCount >= 7) {
      return "Higher feeds today — tomorrow's rhythm may shift slightly";
    }
    if (firstNap?.details?.startTime) {
      return `First nap was ${firstNap.details.startTime} — similar timing likely tomorrow`;
    }
    if (napCount === 2 && totalNapMinutes > 150) {
      return "Consolidated naps today — this pattern may continue";
    }
    return "Today's rhythm sets the stage for tomorrow";
  }, [todayActivities, feedCount, napCount, nightSleepStartHour, nightSleepEndHour]);

  // Don't show if no activities today OR if it's not story time OR insufficient data
  if (todayActivities.length === 0 || !isStoryTime || !hasMinimumForStory) {
    return null;
  }

  return (
    <div className="px-4 py-4 bg-card border-y border-border">
      <button
        onClick={onClick}
        className="group w-full text-left"
      >
        {/* Minimal typographic treatment */}
        <p className="text-xs font-semibold uppercase tracking-caps text-muted-foreground mb-2">
          Tomorrow Preview
        </p>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground/80 leading-relaxed pr-4">
            {tomorrowInsight}
          </p>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    </div>
  );
};
