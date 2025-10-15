import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby, Droplet, Moon, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isToday, differenceInMinutes, differenceInHours } from "date-fns";
import { usePredictionEngine } from "@/hooks/usePredictionEngine";
import { Activity } from "@/components/ActivityCard";

interface HomeTabProps {
  activities: Activity[];
  babyName?: string;
  userName?: string;
  babyBirthday?: string;
  onAddActivity: () => void;
  onEndNap?: () => void;
}

export const HomeTab = ({ activities, babyName, userName, babyBirthday, onAddActivity, onEndNap }: HomeTabProps) => {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimeline, setShowTimeline] = useState(false);
  const { prediction, getIntentCopy, getProgressText } = usePredictionEngine(activities);

  // Calculate baby's age in months and weeks
  const getBabyAge = () => {
    if (!babyBirthday) return null;
    const birthDate = new Date(babyBirthday);
    const today = new Date();
    const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    const months = Math.max(0, totalMonths);
    
    // Calculate remaining weeks
    const monthsDate = new Date(birthDate);
    monthsDate.setMonth(monthsDate.getMonth() + totalMonths);
    const daysDiff = Math.floor((today.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysDiff / 7);
    
    return { months, weeks };
  };

  const babyAge = getBabyAge();
  const babyAgeMonths = babyAge?.months || null;

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get today's activities only
  const todayActivities = activities.filter(a => 
    a.loggedAt && isToday(new Date(a.loggedAt))
  );

  // Get yesterday's activities for context when today is empty
  const yesterdayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return activityDate.toDateString() === yesterday.toDateString();
  });

  // Use yesterday's data as context if nothing logged today
  const displayActivities = todayActivities.length > 0 ? todayActivities : yesterdayActivities;
  const showingYesterday = todayActivities.length === 0 && yesterdayActivities.length > 0;

  // Find ongoing nap (check today and yesterday for naps that haven't ended)
  const ongoingNap = [...todayActivities, ...yesterdayActivities].find(
    a => a.type === 'nap' && a.details?.startTime && !a.details?.endTime
  );

  // Calculate awake time
  const getAwakeTime = () => {
    if (ongoingNap) return null;
    
    const lastNap = displayActivities
      .filter(a => a.type === 'nap' && a.details?.endTime)
      .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
    
    if (!lastNap || !lastNap.details?.endTime) return null;
    
    // Parse end time
    const [time, period] = lastNap.details.endTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const wakeTime = new Date(lastNap.loggedAt!);
    wakeTime.setHours(hour24, minutes, 0, 0);
    
    const awakeMinutes = differenceInMinutes(currentTime, wakeTime);
    const awakeHours = Math.floor(awakeMinutes / 60);
    const remainingMinutes = awakeMinutes % 60;
    
    if (awakeHours > 0) {
      return `${awakeHours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Get last feed
  const lastFeed = displayActivities
    .filter(a => a.type === 'feed')
    .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];

  // Get last diaper
  const lastDiaper = displayActivities
    .filter(a => a.type === 'diaper')
    .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];

  // Get sleep status message with duration
  const getSleepStatus = () => {
    if (ongoingNap) {
      const startTime = ongoingNap.details?.startTime || ongoingNap.time;
      
      // Calculate sleep duration
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const napStart = new Date(ongoingNap.loggedAt!);
      napStart.setHours(hour24, minutes, 0, 0);
      
      const sleepMinutes = differenceInMinutes(currentTime, napStart);
      const sleepHours = Math.floor(sleepMinutes / 60);
      const remainingMinutes = sleepMinutes % 60;
      
      const durationText = sleepHours > 0 
        ? `${sleepHours}h ${remainingMinutes}m` 
        : `${remainingMinutes}m`;
      
      const qualityText = sleepHours >= 2 
        ? 'a strong, restorative nap' 
        : sleepHours >= 1 
          ? 'resting deeply'
          : 'settling in';
      
      return {
        main: `${babyName || 'Baby'} has been sleeping since ${startTime}`,
        sub: `${babyName?.split(' ')[0] || 'Baby'} has been resting for ${durationText} — ${qualityText}.`
      };
    }
    
    // If showing yesterday's data, adapt the message
    if (showingYesterday) {
      return {
        main: `Starting a new day with ${babyName || 'Baby'}`,
        sub: "Yesterday's rhythm shows below — ready to log today's first moment?"
      };
    }
    
    const awakeTime = getAwakeTime();
    if (awakeTime) {
      return {
        main: `${babyName || 'Baby'} has been awake for ${awakeTime}`,
        sub: null
      };
    }
    
    return {
      main: `${babyName || 'Baby'} is ready to start the day`,
      sub: null
    };
  };

  // Get daily sentiment based on patterns
  const getDailySentiment = () => {
    const summary = getDailySummary();
    const expected = getExpectedFeeds(babyAgeMonths);
    const expectedNaps = getExpectedNaps(babyAgeMonths);
    
    // Growth spurt indicators: more frequent feeds than typical
    if (expected && summary.feedCount > expected.max + 2) {
      return { emoji: "🌱", text: "Growth spurt week" };
    }
    
    // Smooth transition: feeds and naps in range
    if (expected && expectedNaps && 
        summary.feedCount >= expected.min && summary.feedCount <= expected.max &&
        summary.napCount >= expectedNaps.min && summary.napCount <= expectedNaps.max) {
      return { emoji: "☀️", text: "Smooth transition" };
    }
    
    // Settled rhythm: consistent patterns
    if (summary.feedCount >= 3 && summary.napCount >= 2) {
      return { emoji: "✨", text: "Settled rhythm day" };
    }
    
    // Default: building routine
    return { emoji: "🌿", text: "Building rhythm together" };
  };

  // Get developmental phase description
  const getDevelopmentalPhase = () => {
    if (!babyAge) return null;
    
    const { months, weeks } = babyAge;
    
    if (months < 3) return "in the sleepy newborn phase";
    if (months < 6) return "discovering the world around them";
    if (months < 9) return "in the curious, exploratory phase";
    if (months < 12) return "becoming more mobile and independent";
    if (months < 18) return "learning to communicate and express";
    return "growing into their own little person";
  };

  // Activity summary data
  const getDailySummary = () => {
    const feedCount = displayActivities.filter(a => a.type === 'feed').length;
    const napCount = displayActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;
    const diaperCount = displayActivities.filter(a => a.type === 'diaper').length;

    return { feedCount, napCount, diaperCount };
  };

  // Get age-appropriate expectations
  const getExpectedFeeds = (months: number | null) => {
    if (months === null) return null;
    if (months < 1) return { min: 8, max: 12, typical: "8-12" };
    if (months < 3) return { min: 6, max: 8, typical: "6-8" };
    if (months < 6) return { min: 5, max: 7, typical: "5-7" };
    if (months < 9) return { min: 4, max: 6, typical: "4-6" };
    if (months < 12) return { min: 3, max: 5, typical: "3-5" };
    return { min: 3, max: 4, typical: "3-4" };
  };

  const getExpectedNaps = (months: number | null) => {
    if (months === null) return null;
    if (months < 3) return { min: 4, max: 6, typical: "4-6" };
    if (months < 6) return { min: 3, max: 4, typical: "3-4" };
    if (months < 9) return { min: 2, max: 3, typical: "2-3" };
    if (months < 12) return { min: 2, max: 3, typical: "2-3" };
    if (months < 18) return { min: 1, max: 2, typical: "1-2" };
    return { min: 1, max: 2, typical: "1-2" };
  };

  const getFeedComparison = (count: number, months: number | null) => {
    const expected = getExpectedFeeds(months);
    if (!expected) return "Feeds are consistent — steady days help build confident nights.";
    
    if (count >= expected.min && count <= expected.max) {
      return `Right on rhythm for ${months} months — steady days help build confident nights.`;
    } else if (count < expected.min && count === 0) {
      return "Just getting started today — every feed adds to your routine.";
    } else if (count < expected.min) {
      return `Light feeding day — still within healthy range for ${months} months.`;
    } else {
      return `Extra feeds today — often a sign of growth spurt or comfort needs.`;
    }
  };

  const getNapComparison = (count: number, months: number | null) => {
    const expected = getExpectedNaps(months);
    if (!expected) return "Every nap is progress — building healthy sleep habits.";
    
    if (count >= expected.min && count <= expected.max) {
      return `Solid nap rhythm — ${babyName?.split(' ')[0] || 'baby'} is practicing self-regulation beautifully.`;
    } else if (count < expected.min && count === 0) {
      return "Working on today's first nap — every rest counts.";
    } else if (count < expected.min) {
      return `Shorter nap day — normal during transitions and growth spurts.`;
    } else {
      return `Extra restful day — sometimes babies need more recovery time.`;
    }
  };

  // Use unified prediction engine
  const nextAction = prediction ? getIntentCopy(prediction, babyName) : null;
  
  // Legacy helper for backward compatibility
  const getNextPredictedAction_LEGACY = () => {
    const expectedNaps = getExpectedNaps(babyAgeMonths);
    
    if (ongoingNap) {
      // Baby is sleeping - predict wake time and next feed
      const startTime = ongoingNap.details?.startTime || ongoingNap.time;
      const [time, period] = startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const napStart = new Date(ongoingNap.loggedAt!);
      napStart.setHours(hour24, minutes, 0, 0);
      
      // Calculate average nap duration based on age
      let expectedNapDuration = 90; // default 90 minutes
      if (babyAgeMonths !== null) {
        if (babyAgeMonths < 3) expectedNapDuration = 120; // 2 hours for newborns
        else if (babyAgeMonths < 6) expectedNapDuration = 90; // 1.5 hours
        else if (babyAgeMonths < 12) expectedNapDuration = 75; // 1h 15m
        else expectedNapDuration = 60; // 1 hour for older babies
      }
      
      const currentDuration = differenceInMinutes(currentTime, napStart);
      const expectedWakeTime = new Date(napStart.getTime() + expectedNapDuration * 60000);
      const expectedFeedTime = new Date(expectedWakeTime.getTime() + 10 * 60000); // 10 min after wake
      
      const wakeTimeStr = expectedWakeTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const feedTimeStr = expectedFeedTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Get last feed to estimate amount
      const recentFeeds = todayActivities
        .filter(a => a.type === 'feed' && a.details?.quantity)
        .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime());
      const avgAmount = recentFeeds.length > 0 
        ? Math.round(recentFeeds.slice(0, 3).reduce((sum, f) => sum + (parseFloat(f.details.quantity!) || 0), 0) / Math.min(3, recentFeeds.length))
        : 180;
      
      // If nap is longer than expected, adjust message
      if (currentDuration > expectedNapDuration + 20) {
        return `${babyName?.split(' ')[0] || 'Baby'} has been asleep ${Math.floor(currentDuration / 60)}h ${currentDuration % 60}m — might be ready to wake soon.`;
      }
      
      return `May wake around ${wakeTimeStr} — consider offering feed around ${feedTimeStr} (typically ${avgAmount} ml).`;
    } else {
      // Baby is awake - predict next nap
      const awakeMinutes = awakeTime ? parseInt(awakeTime) : 0;
      let expectedAwakeWindow = 120; // default 2 hours
      
      if (babyAgeMonths !== null) {
        if (babyAgeMonths < 3) expectedAwakeWindow = 90; // 1.5 hours
        else if (babyAgeMonths < 6) expectedAwakeWindow = 120; // 2 hours
        else if (babyAgeMonths < 9) expectedAwakeWindow = 150; // 2.5 hours
        else expectedAwakeWindow = 180; // 3 hours
      }
      
      const lastNap = todayActivities
        .filter(a => a.type === 'nap' && a.details?.endTime)
        .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];
      
      if (lastNap && lastNap.details?.endTime) {
        const [time, period] = lastNap.details.endTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        const wakeTime = new Date(lastNap.loggedAt!);
        wakeTime.setHours(hour24, minutes, 0, 0);
        
        const expectedNapTime = new Date(wakeTime.getTime() + expectedAwakeWindow * 60000);
        const napTimeStr = expectedNapTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        
        const minutesUntilNap = differenceInMinutes(expectedNapTime, currentTime);
        
        if (minutesUntilNap < 15 && minutesUntilNap > 0) {
          return `Next nap expected around ${napTimeStr} — watch for sleepy cues soon.`;
        } else if (awakeMinutes > expectedAwakeWindow + 30) {
          return `Awake for ${awakeTime} — consider starting wind-down routine.`;
        } else {
          return `Next nap expected around ${napTimeStr} — watch for sleepy cues.`;
        }
      }
      
      return `Watch for sleepy cues — typical wake window is ${Math.floor(expectedAwakeWindow / 60)}h ${expectedAwakeWindow % 60}m.`;
    }
  };

  const summary = getDailySummary();
  const awakeTime = getAwakeTime();
  const sleepStatus = getSleepStatus();
  const sentiment = getDailySentiment();
  const developmentalPhase = getDevelopmentalPhase();

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      {/* Greeting + Phase */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-foreground">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        {babyAge && (
          <p className="text-sm text-muted-foreground">
            {babyAge.months} month{babyAge.months !== 1 ? 's' : ''}{babyAge.weeks > 0 ? `, ${babyAge.weeks} week${babyAge.weeks !== 1 ? 's' : ''}` : ''} — {developmentalPhase}
          </p>
        )}
      </div>

      {/* Status Card - Current State */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sentiment.emoji}</span>
          <span className="text-sm font-medium text-foreground/80">{sentiment.text}</span>
        </div>
        <p className="text-base text-foreground leading-relaxed">
          {sleepStatus.main}
        </p>
        {sleepStatus.sub && (
          <p className="text-sm text-muted-foreground/80 italic">
            {sleepStatus.sub}
          </p>
        )}
      </div>

      {/* What's Next - Predictive Card (High Priority) */}
      {(nextAction && !showingYesterday) || ongoingNap ? (
        <Card className="p-4 space-y-3 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">What's next</h2>
          </div>
          {nextAction && (
            <p className="text-base text-foreground leading-relaxed">
              {nextAction}
            </p>
          )}
          
          {/* Wake-up button if sleeping */}
          {ongoingNap && onEndNap && (
            <Button
              onClick={() => {
                console.log('Wake up button clicked in HomeTab');
                console.log('onEndNap exists:', !!onEndNap);
                console.log('ongoingNap:', ongoingNap);
                onEndNap();
              }}
              className="w-full mt-2"
              size="sm"
            >
              {babyName?.split(' ')[0] || 'Baby'} woke up
            </Button>
          )}
        </Card>
      ) : null}

      {/* Today's Flow - Rhythm Summary */}
      <Card className="p-4 space-y-4 bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            🌿 {showingYesterday ? "Yesterday's Flow" : "Today's Flow"}
          </h2>
          {showingYesterday && (
            <span className="text-xs text-muted-foreground italic">
              showing recent context
            </span>
          )}
        </div>
        
        {/* Current Activity Status */}
        <div className="space-y-2.5 pb-3 border-b border-border/50">
          {/* Last Feed */}
          {lastFeed && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Baby className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Last feed: <span className="font-medium">{lastFeed.time}</span>
                  {lastFeed.details?.quantity && (
                    <span className="text-muted-foreground ml-1">
                      • {lastFeed.details.quantity} {lastFeed.details.unit || 'ml'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Last Diaper */}
          {lastDiaper && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Droplet className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Last diaper: <span className="font-medium">{lastDiaper.time}</span>
                  {lastDiaper.details?.diaperType && (
                    <span className="text-muted-foreground ml-1">
                      • {lastDiaper.details.diaperType}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Awake Window */}
          {!ongoingNap && awakeTime && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Awake window: <span className="font-medium">{awakeTime}</span>
                </p>
              </div>
            </div>
          )}

          {/* Currently Sleeping Status */}
          {ongoingNap && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Sleeping since <span className="font-medium">{ongoingNap.details?.startTime || ongoingNap.time}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subtle Add Prompt */}
        {!showingYesterday && todayActivities.length === 0 && (
          <button
            onClick={onAddActivity}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg"
          >
            Tap the green + below to log your first event
          </button>
        )}

        {/* Daily Progress & Comparisons */}
        {displayActivities.length > 0 && (
        <div className="space-y-2.5 pt-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🌤️</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">Feeds:</span> {summary.feedCount} logged {showingYesterday ? 'yesterday' : 'today'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prediction ? getProgressText(prediction, 'feeds') : getFeedComparison(summary.feedCount, babyAgeMonths)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">🌈</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">Sleep:</span> {summary.napCount} nap{summary.napCount !== 1 ? 's' : ''} completed
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prediction ? getProgressText(prediction, 'naps') : getNapComparison(summary.napCount, babyAgeMonths)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">💫</span>
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">Overall:</span> Calm and steady
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You're building confidence, one small rhythm at a time.
              </p>
            </div>
          </div>
        </div>
        )}
      </Card>

      {/* Affirmation Footer */}
      {displayActivities.length > 0 && (
        <div className="flex items-start gap-2 px-2">
          <span className="text-lg">💚</span>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            You're doing great{userName ? `, ${userName}` : ''}. These small rhythms are adding up.
          </p>
        </div>
      )}

      {/* Recent Activity Summary - Tappable */}
      {displayActivities.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full text-left space-y-2"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                {showingYesterday ? "Yesterday's activity" : "Recent activity"}
              </h2>
              {showTimeline ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm text-foreground font-medium">
              {summary.feedCount} feed{summary.feedCount !== 1 ? 's' : ''} • {' '}
              {summary.napCount} nap{summary.napCount !== 1 ? 's' : ''} • {' '}
              {summary.diaperCount} diaper{summary.diaperCount !== 1 ? 's' : ''}
            </div>
            {!showTimeline && (
              <p className="text-xs text-muted-foreground">
                Tap to see {showingYesterday ? "yesterday's" : "today's"} rhythm
              </p>
            )}
          </button>
          
          {showTimeline && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {displayActivities
                .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())
                .slice(0, 8)
                .map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-16">{activity.time}</span>
                    <div className="flex-1 flex items-center gap-2">
                      {activity.type === 'feed' && <Baby className="w-3 h-3 text-primary" />}
                      {activity.type === 'diaper' && <Droplet className="w-3 h-3 text-primary" />}
                      {activity.type === 'nap' && <Moon className="w-3 h-3 text-primary" />}
                      <span className="capitalize text-foreground">{activity.type}</span>
                      {activity.details?.quantity && (
                        <span className="text-muted-foreground text-xs">
                          {activity.details.quantity} {activity.details.unit || 'ml'}
                        </span>
                      )}
                      {activity.type === 'nap' && activity.details?.endTime && (
                        <span className="text-muted-foreground text-xs">
                          → {activity.details.endTime}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
