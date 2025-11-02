import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Milk, Moon, Clock, Baby, Utensils, CircleDot, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { differenceInMinutes } from "date-fns";
import { Activity } from "@/components/ActivityCard";
import { useHousehold } from "@/hooks/useHousehold";
import { BabyCarePredictionEngine } from "@/utils/predictionEngine";
import { getTodayActivities } from "@/utils/activityDateFilters";
import { cn } from "@/lib/utils";

interface HomeTabProps {
  activities: Activity[];
  babyName?: string;
  userName?: string;
  babyBirthday?: string;
  onAddActivity: (type?: 'feed' | 'nap' | 'diaper', prefillActivity?: Activity) => void;
  onEditActivity: (activity: Activity) => void;
  onEndNap?: () => void;
  ongoingNap?: Activity | null;
  userRole?: string;
  showBadge?: boolean;
  percentile?: number | null;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
}

export const HomeTab = ({ activities, babyName, userName, onAddActivity, onEndNap, ongoingNap }: HomeTabProps) => {
  const { t } = useLanguage();
  const { household } = useHousehold();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Get today's activities
  const todayActivities = getTodayActivities(activities);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  // Helper: parse time string to minutes
  const parseTimeToMinutes = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  // Calculate awake time
  const getAwakeTime = () => {
    if (ongoingNap) return null;

    const recentNaps = todayActivities.filter(a =>
      a.type === 'nap' && a.details?.endTime
    );

    if (recentNaps.length === 0) return null;

    const napsWithEndDate = recentNaps.map(nap => {
      const loggedDate = nap.loggedAt ? new Date(nap.loggedAt) : new Date();
      const baseDate = new Date(loggedDate.toDateString());
      const endMinutes = parseTimeToMinutes(nap.details!.endTime!);
      const startMinutes = nap.details?.startTime ? parseTimeToMinutes(nap.details.startTime) : null;

      const endDate = new Date(baseDate);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      endDate.setHours(endHours, endMins, 0, 0);

      if (startMinutes !== null && endMinutes < startMinutes) {
        endDate.setDate(endDate.getDate() + 1);
      }

      return { nap, endDate };
    });

    const last = napsWithEndDate.sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];

    const awakeMinutes = differenceInMinutes(currentTime, last.endDate);
    if (awakeMinutes < 0) return null;
    const awakeHours = Math.floor(awakeMinutes / 60);
    const remainingMinutes = awakeMinutes % 60;

    return awakeHours > 0 ? `${awakeHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  // Get sleep duration for ongoing nap
  const getSleepDuration = () => {
    if (!ongoingNap) return null;
    
    const startTime = ongoingNap.details?.startTime || ongoingNap.time;
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const today = new Date();
    const napStart = new Date(today.toDateString());
    napStart.setHours(hour24, minutes, 0, 0);
    
    const sleepMinutes = differenceInMinutes(currentTime, napStart);
    const sleepHours = Math.floor(sleepMinutes / 60);
    const remainingMinutes = sleepMinutes % 60;
    
    return sleepHours > 0 
      ? `${sleepHours}h ${remainingMinutes}m` 
      : `${remainingMinutes}m`;
  };

  // Get last feed
  const feedsToday = todayActivities.filter(a => a.type === 'feed');
  const lastFeed = feedsToday.sort((a, b) => {
    const aTime = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
    const bTime = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
    return bTime - aTime;
  })[0];

  // Get prediction
  const engine = activities.length > 0 ? new BabyCarePredictionEngine(activities, household?.baby_birthday || undefined) : null;
  const prediction = engine?.getNextAction();

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Get what's next message
  const getWhatsNextMessage = () => {
    if (ongoingNap) {
      const wakeTime = prediction?.timing?.nextWakeAt;
      return {
        text: wakeTime ? `Currently sleeping — may wake around ${formatTime(wakeTime)}` : "Currently sleeping",
        action: `${babyName || 'Baby'} woke up`,
        actionType: "wakeup" as const
      };
    }

    if (prediction?.intent === "FEED_SOON") {
      const feedTime = prediction.timing?.nextFeedAt;
      return {
        text: feedTime ? `Next feed expected around ${formatTime(feedTime)}` : "Next feed expected soon",
        action: "Log feed",
        actionType: "feed" as const
      };
    }

    if (prediction?.intent === "START_WIND_DOWN") {
      const napTime = prediction.timing?.nextNapWindowStart;
      return {
        text: napTime ? `Next nap likely around ${formatTime(napTime)}` : "Next nap likely soon",
        action: "Log nap now",
        actionType: "nap" as const
      };
    }

    return {
      text: "Building rhythm — log activities to see predictions",
      action: null,
      actionType: null
    };
  };

  const whatsNext = getWhatsNextMessage();
  const awakeTime = getAwakeTime();
  const sleepDuration = getSleepDuration();

  // Get tone/sentiment
  const getTone = () => {
    const feedCount = feedsToday.length;
    const napCount = todayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
    
    if (!household?.baby_birthday) return { emoji: "🌱", text: "Building Rhythm" };
    
    const ageMonths = Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    // Expected ranges
    const expectedFeeds = ageMonths < 3 ? { min: 6, max: 10 } :
                         ageMonths < 6 ? { min: 5, max: 7 } :
                         ageMonths < 9 ? { min: 4, max: 6 } :
                         { min: 3, max: 5 };
    
    const expectedNaps = ageMonths < 3 ? { min: 4, max: 6 } :
                        ageMonths < 6 ? { min: 3, max: 5 } :
                        ageMonths < 9 ? { min: 2, max: 3 } :
                        { min: 1, max: 2 };
    
    if (feedCount >= expectedFeeds.min && feedCount <= expectedFeeds.max &&
        napCount >= expectedNaps.min && napCount <= expectedNaps.max) {
      return { emoji: "☀️", text: "Smooth Flow" };
    }
    
    if (feedCount > expectedFeeds.max + 1) {
      return { emoji: "🌿", text: "Growth Transition" };
    }
    
    return { emoji: "🔄", text: "Adjusting Rhythm" };
  };

  const tone = getTone();

  // Calculate daily summary
  const feedCount = feedsToday.length;
  const napCount = todayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
  const totalNapMinutes = todayActivities
    .filter(a => a.type === 'nap' && a.details?.endTime)
    .reduce((total, nap) => {
      const startMinutes = parseTimeToMinutes(nap.details?.startTime || nap.time);
      const endMinutes = parseTimeToMinutes(nap.details!.endTime!);
      const duration = endMinutes >= startMinutes 
        ? endMinutes - startMinutes 
        : (24 * 60) - startMinutes + endMinutes;
      return total + duration;
    }, 0);
  
  const napHours = Math.floor(totalNapMinutes / 60);
  const napMins = totalNapMinutes % 60;

  // Get growth status
  const getGrowthStatus = () => {
    if (!household?.baby_birthday) return "Building data";
    
    const ageMonths = Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 30));
    const expectedFeeds = ageMonths < 3 ? { min: 6, max: 10 } :
                         ageMonths < 6 ? { min: 5, max: 7 } :
                         ageMonths < 9 ? { min: 4, max: 6 } :
                         { min: 3, max: 5 };
    
    if (feedCount > expectedFeeds.max) {
      return "Growing strong — tracking above average";
    }
    if (feedCount >= expectedFeeds.min) {
      return "On track — healthy rhythm";
    }
    return "Building pattern — keep logging";
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Greeting */}
      <div className="px-1">
        <h1 className="text-2xl font-semibold text-foreground">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
      </div>

      {/* What's Next Card */}
      <Card className="p-6 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              What's Next
            </h2>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-base text-foreground font-medium flex-1">
              {whatsNext.text}
            </p>
          </div>

          {whatsNext.action && (
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => {
                if (whatsNext.actionType === "wakeup" && onEndNap) {
                  onEndNap();
                } else if (whatsNext.actionType === "feed" || whatsNext.actionType === "nap") {
                  onAddActivity(whatsNext.actionType);
                }
              }}
            >
              {whatsNext.action}
            </Button>
          )}
        </div>
      </Card>

      {/* Tone Chip */}
      <div className="px-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
          <span className="text-lg">{tone.emoji}</span>
          <span className="text-sm font-medium text-foreground">{tone.text}</span>
        </div>
      </div>

      {/* Snapshot Stats */}
      <div className="space-y-3 px-1">
        {lastFeed && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-2xl">🍼</span>
            <span className="text-sm">
              Last feed — <span className="text-foreground font-medium">{lastFeed.time}</span>
              {lastFeed.details?.quantity && (
                <span className="text-foreground font-medium"> {lastFeed.details.quantity} {lastFeed.details.unit || 'ml'}</span>
              )}
            </span>
          </div>
        )}
        
        {ongoingNap ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-2xl">🌙</span>
            <span className="text-sm">
              Sleeping since — <span className="text-foreground font-medium">{ongoingNap.details?.startTime || ongoingNap.time}</span>
            </span>
          </div>
        ) : awakeTime && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-2xl">🕐</span>
            <span className="text-sm">
              Awake for — <span className="text-foreground font-medium">{awakeTime}</span>
            </span>
          </div>
        )}
      </div>

      {/* Daily Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Daily Summary
          </h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-3 px-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--feed-color))]"></div>
            <span className="text-sm text-foreground">
              <span className="font-semibold">Feeds:</span> {feedCount} total
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--nap-color))]"></div>
            <span className="text-sm text-foreground">
              <span className="font-semibold">Sleep:</span> {napCount} naps ({napHours}h {napMins}m)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-sm text-foreground">
              <span className="font-semibold">Growth:</span> {getGrowthStatus()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};