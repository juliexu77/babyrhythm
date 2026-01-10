import { useMemo } from "react";
import { Moon, Milk, Clock, TrendingDown, TrendingUp, Minus, Baby, Lightbulb } from "lucide-react";
import { isDaytimeNap } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getActivityEventDateString } from "@/utils/activityDate";
import { getMilestonesForAge } from "@/data/developmentalMilestones";
import { getWakeWindowForAge, getFeedingGuidanceForAge } from "@/utils/ageAppropriateBaselines";
import { differenceInWeeks } from "date-fns";
interface TodaysPulseProps {
  activities: any[];
  babyName: string;
  babyAge?: number;
  babyBirthday?: string;
}

export const TodaysPulse = ({
  activities,
  babyName,
  babyAge,
  babyBirthday
}: TodaysPulseProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();

  // Calculate pattern trends and stability over past 7 days
  const rhythmAnalysis = useMemo(() => {
    const now = new Date();
    
    // Get baby age in months
    let babyAgeMonths = babyAge || 0;
    if (!babyAge && babyBirthday) {
      const birthDate = new Date(babyBirthday);
      babyAgeMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }

    // Get last 7 days of activities grouped by day
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysActivities = activities.filter(a => 
      new Date(a.loggedAt) >= sevenDaysAgo
    );

    // Group activities by date
    const byDate: Record<string, any[]> = {};
    last7DaysActivities.forEach(a => {
      const date = getActivityEventDateString(a as any);
      if (date) {
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(a);
      }
    });

    const dates = Object.keys(byDate).sort();
    const numDays = dates.length;

    // Calculate daily nap counts
    const dailyNapCounts = dates.map(date => 
      byDate[date].filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)).length
    );

    // Calculate daily feed counts
    const dailyFeedCounts = dates.map(date => 
      byDate[date].filter(a => a.type === 'feed').length
    );

    // Analyze nap trend (consolidating/expanding/stable)
    let napTrend: 'consolidating' | 'expanding' | 'stable' = 'stable';
    let napTrendText = 'Naps: Stable pattern';
    
    if (dailyNapCounts.length >= 3) {
      const firstHalf = dailyNapCounts.slice(0, Math.ceil(dailyNapCounts.length / 2));
      const secondHalf = dailyNapCounts.slice(Math.ceil(dailyNapCounts.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg < firstAvg - 0.5) {
        napTrend = 'consolidating';
        napTrendText = 'Consolidating to fewer naps';
      } else if (secondAvg > firstAvg + 0.5) {
        napTrend = 'expanding';
        napTrendText = 'Taking more naps lately';
      }
    }

    // Calculate sleep timing consistency (variance in first nap start times)
    const parseTimeToMinutes = (timeStr: string): number | null => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return null;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    // Get first nap start time for each day
    const firstNapTimes: number[] = [];
    dates.forEach(date => {
      const naps = byDate[date]
        .filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.startTime)
        .sort((a, b) => {
          const aTime = parseTimeToMinutes(a.details.startTime) || 0;
          const bTime = parseTimeToMinutes(b.details.startTime) || 0;
          return aTime - bTime;
        });
      
      if (naps[0]?.details?.startTime) {
        const mins = parseTimeToMinutes(naps[0].details.startTime);
        if (mins !== null) firstNapTimes.push(mins);
      }
    });

    // Calculate variance in first nap times
    let sleepConsistency: 'consistent' | 'variable' | 'emerging' = 'emerging';
    let sleepConsistencyText = 'Sleep timing: Building pattern';
    
    if (firstNapTimes.length >= 3) {
      const avg = firstNapTimes.reduce((a, b) => a + b, 0) / firstNapTimes.length;
      const variance = firstNapTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / firstNapTimes.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev <= 30) { // Within 30 mins
        sleepConsistency = 'consistent';
        sleepConsistencyText = 'Sleep timing: Consistent';
      } else if (stdDev <= 60) {
        sleepConsistency = 'variable';
        sleepConsistencyText = 'Sleep timing: Somewhat variable';
      } else {
        sleepConsistency = 'variable';
        sleepConsistencyText = 'Sleep timing: Variable';
      }
    }

    // Calculate feeding pattern stability
    let feedingConsistency: 'consistent' | 'variable' | 'emerging' = 'emerging';
    let feedingConsistencyText = 'Feeding: Building pattern';
    
    if (dailyFeedCounts.length >= 3) {
      const avg = dailyFeedCounts.reduce((a, b) => a + b, 0) / dailyFeedCounts.length;
      const variance = dailyFeedCounts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / dailyFeedCounts.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev <= 1) {
        feedingConsistency = 'consistent';
        feedingConsistencyText = 'Feeding: Consistent';
      } else if (stdDev <= 2) {
        feedingConsistency = 'variable';
        feedingConsistencyText = 'Feeding: Somewhat variable';
      } else {
        feedingConsistency = 'variable';
        feedingConsistencyText = 'Feeding: Variable';
      }
    }

    // Developmental phase with detailed guidance
    const getPhaseWithGuidance = (months: number, birthday?: string) => {
      const ageWeeks = birthday ? differenceInWeeks(now, new Date(birthday)) : months * 4.33;
      const wakeWindowData = getWakeWindowForAge(ageWeeks);
      const feedingData = getFeedingGuidanceForAge(ageWeeks);
      const milestones = getMilestonesForAge(ageWeeks);
      
      // Get phase name
      let phase = 'Growing';
      if (months < 3) phase = 'Newborn phase';
      else if (months < 4) phase = '4-month transition';
      else if (months < 6) phase = 'Infant phase';
      else if (months < 9) phase = '6-9 month window';
      else if (months < 12) phase = 'Late infant phase';
      else if (months < 15) phase = '12-15 month window';
      else if (months < 18) phase = 'Toddler transition';
      else phase = 'Toddler phase';

      // Build guidance from real data
      const guidance: string[] = [];
      
      if (wakeWindowData) {
        guidance.push(`Wake windows: ${wakeWindowData.wakeWindows[0]}`);
        guidance.push(`Typical naps: ${wakeWindowData.napCount}`);
      }
      
      if (feedingData) {
        guidance.push(`Feeds: ${feedingData.dailyTotal}`);
      }

      // Get tribal tip from milestones if available
      const tip = milestones?.tribalTip || milestones?.reminder;

      return { phase, guidance, tip, ageWeeks };
    };

    const phase = getPhaseWithGuidance(babyAgeMonths, babyBirthday);

    return {
      napTrend,
      napTrendText,
      sleepConsistency,
      sleepConsistencyText,
      feedingConsistency,
      feedingConsistencyText,
      phase,
      numDays,
      babyAgeMonths
    };
  }, [activities, babyAge, babyBirthday, nightSleepStartHour, nightSleepEndHour]);

  const getTrendIcon = (trend: 'consolidating' | 'expanding' | 'stable') => {
    switch (trend) {
      case 'consolidating': return <TrendingDown className="w-3.5 h-3.5" />;
      case 'expanding': return <TrendingUp className="w-3.5 h-3.5" />;
      default: return <Minus className="w-3.5 h-3.5" />;
    }
  };

  const getConsistencyColor = (consistency: 'consistent' | 'variable' | 'emerging') => {
    switch (consistency) {
      case 'consistent': return 'text-primary';
      case 'variable': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  // Don't show if not enough data
  if (rhythmAnalysis.numDays < 2) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-section-header">
            Rhythm Status
          </h3>
        </div>

        {/* Pattern insights */}
        <div className="divide-y divide-border">
          {/* Recent trend */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <Moon className="w-4 h-4" />
              </div>
              <span className="text-sm text-foreground">Nap Trend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`${
                rhythmAnalysis.napTrend === 'consolidating' ? 'text-primary' :
                rhythmAnalysis.napTrend === 'expanding' ? 'text-amber-600 dark:text-amber-400' :
                'text-muted-foreground'
              }`}>
                {getTrendIcon(rhythmAnalysis.napTrend)}
              </span>
              <span className="text-xs text-muted-foreground">
                {rhythmAnalysis.napTrendText}
              </span>
            </div>
          </div>

          {/* Sleep timing consistency */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm text-foreground">Timing</span>
            </div>
            <span className={`text-label-xs ${getConsistencyColor(rhythmAnalysis.sleepConsistency)}`}>
              {rhythmAnalysis.sleepConsistencyText}
            </span>
          </div>

          {/* Feeding pattern */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <Milk className="w-4 h-4" />
              </div>
              <span className="text-sm text-foreground">Feeding</span>
            </div>
            <span className={`text-label-xs ${getConsistencyColor(rhythmAnalysis.feedingConsistency)}`}>
              {rhythmAnalysis.feedingConsistencyText}
            </span>
          </div>

          {/* Developmental phase - expanded */}
          <div className="px-3 py-3 bg-accent/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-primary">
                <Baby className="w-4 h-4" />
              </div>
              <span className="text-label-sm text-foreground">{rhythmAnalysis.phase.phase}</span>
              <span className="text-label-xs text-muted-foreground ml-auto">
                ~{Math.round(rhythmAnalysis.phase.ageWeeks)} weeks
              </span>
            </div>
            
            {/* Guidance grid */}
            {rhythmAnalysis.phase.guidance.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 ml-6">
                {rhythmAnalysis.phase.guidance.map((item, idx) => (
                  <span key={idx} className="text-xs text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
            )}
            
            {/* Tip from milestones */}
            {rhythmAnalysis.phase.tip && (
              <div className="flex items-start gap-2 mt-2 ml-6 p-2 bg-primary/5 rounded-md">
                <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rhythmAnalysis.phase.tip}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};