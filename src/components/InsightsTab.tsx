import { Activity } from "./ActivityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Clock, Milk, Moon, Lightbulb, Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { calculateAgeInWeeks, getWakeWindowForAge, getFeedingGuidanceForAge } from "@/utils/huckleberrySchedules";
import { useHousehold } from "@/hooks/useHousehold";
import { useActivityPercentile } from "@/hooks/useActivityPercentile";
import { useGuideSections } from "@/hooks/useGuideSections";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePatternAnalysis } from "@/hooks/usePatternAnalysis";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";

interface InsightsTabProps {
  activities: Activity[];
}

export const InsightsTab = ({ activities }: InsightsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { t } = useLanguage();
  const { insights } = usePatternAnalysis(activities);
  const { guideSections, loading: guideSectionsLoading } = useGuideSections(activities.length);
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  // Show loading state while household data is being fetched
  if (householdLoading || !household) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }
  
  const ageInWeeks = household?.baby_birthday ? calculateAgeInWeeks(household.baby_birthday) : 0;
  const wakeWindowData = getWakeWindowForAge(ageInWeeks);
  const feedingGuidance = getFeedingGuidanceForAge(ageInWeeks);
  
  // Categorize insights by type
  const sleepInsights = insights.filter(i => i.type === 'sleep');
  const feedingInsights = insights.filter(i => i.type === 'feeding');
  
  // Calculate actual sleep metrics from activities (daytime naps only)
  const calculateSleepMetrics = () => {
    const naps = activities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details.startTime && a.details.endTime);
    
    // Helper to parse time to minutes
    const parseTimeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    };
    
    // Get date from loggedAt timestamp
    const getDateKey = (activity: Activity) => {
      if (activity.loggedAt) {
        return new Date(activity.loggedAt).toDateString();
      }
      return new Date().toDateString(); // Fallback to today
    };
    
    // Filter for daytime naps only (7 AM - 7 PM)
    const daytimeNaps = naps.filter(nap => {
      const startMinutes = parseTimeToMinutes(nap.details.startTime!);
      return startMinutes >= 7 * 60 && startMinutes < 19 * 60; // 7 AM to 7 PM
    });
    
    // Group naps by date
    const napsByDate = daytimeNaps.reduce((acc, nap) => {
      const dateKey = getDateKey(nap);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(nap);
      return acc;
    }, {} as Record<string, Activity[]>);
    
    // Count naps per day
    const daysWithNaps = Object.keys(napsByDate).length;
    const napsPerDay = daysWithNaps > 0 ? Math.round(daytimeNaps.length / daysWithNaps) : 0;
    
    // Calculate wake windows only within the same day
    const wakeWindows: number[] = [];
    
    Object.values(napsByDate).forEach(dayNaps => {
      const sortedDayNaps = [...dayNaps].sort((a, b) => 
        parseTimeToMinutes(a.details.startTime!) - parseTimeToMinutes(b.details.startTime!)
      );
      
      for (let i = 1; i < sortedDayNaps.length; i++) {
        const prevNapEnd = parseTimeToMinutes(sortedDayNaps[i - 1].details.endTime!);
        const currentNapStart = parseTimeToMinutes(sortedDayNaps[i].details.startTime!);
        const wakeWindow = currentNapStart - prevNapEnd;
        if (wakeWindow > 0 && wakeWindow < 360) { // Valid wake window (< 6 hours)
          wakeWindows.push(wakeWindow);
        }
      }
    });
    
    const avgWakeWindow = wakeWindows.length > 0 
      ? wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length 
      : 0;
    
    return {
      napsPerDay,
      avgWakeWindowHours: avgWakeWindow > 0 ? (avgWakeWindow / 60).toFixed(1) : null
    };
  };
  
  // Calculate feeding metrics from activities
  const calculateFeedingMetrics = () => {
    const feeds = activities.filter(a => a.type === 'feed');
    
    // Calculate frequency
    const parseTimeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    };
    
    const intervals: number[] = [];
    for (let i = 1; i < feeds.length; i++) {
      const current = parseTimeToMinutes(feeds[i-1].time);
      const previous = parseTimeToMinutes(feeds[i].time);
      const interval = Math.abs(current - previous);
      if (interval > 30 && interval < 360) {
        intervals.push(interval);
      }
    }
    
    const avgFrequency = intervals.length > 0 
      ? (intervals.reduce((a, b) => a + b, 0) / intervals.length / 60).toFixed(1)
      : null;
    
    // Calculate average amount per feed
    const bottleFeeds = feeds.filter(f => f.details.feedType === 'bottle' && f.details.quantity);
    const amounts = bottleFeeds.map(f => {
      const qty = parseFloat(f.details.quantity!);
      // Convert ml to oz if needed (1 oz = 29.57 ml)
      return f.details.unit === 'ml' ? qty / 29.57 : qty;
    });
    
    const avgAmount = amounts.length > 0 
      ? (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(1)
      : null;
    
    return { avgFrequency, avgAmount };
  };
  
  const sleepMetrics = calculateSleepMetrics();
  const feedingMetrics = calculateFeedingMetrics();
  
  // Helper to match patterns to guidelines and get trend
  const getPatternMatch = (insight: any, expectedRange: string, type: 'wake' | 'feed') => {
    // Extract hours from insight text (e.g., "~6h 43m" or "2.8h")
    const insightMatch = insight.text.match(/(\d+\.?\d*)h/);
    if (!insightMatch) return null;
    const actualValue = parseFloat(insightMatch[1]);
    
    // Parse expected range (e.g., "2.5-3.5hrs" or "Every 4-5 hours")
    const rangeMatch = expectedRange.match(/(\d+\.?\d*)\s*-?\s*(\d+\.?\d*)/);
    if (!rangeMatch) return null;
    
    const minExpected = parseFloat(rangeMatch[1]);
    const maxExpected = parseFloat(rangeMatch[2] || rangeMatch[1]);
    
    // Determine trend
    let trend: 'up' | 'down' | 'normal' = 'normal';
    let comparison = '';
    
    if (actualValue > maxExpected) {
      trend = 'up';
      const diff = (actualValue - maxExpected).toFixed(1);
      comparison = `+${diff}h above expected`;
    } else if (actualValue < minExpected) {
      trend = 'down';
      const diff = (minExpected - actualValue).toFixed(1);
      comparison = `-${diff}h below expected`;
    } else {
      trend = 'normal';
      comparison = 'within expected range';
    }
    
    return { trend, comparison, actualValue, minExpected, maxExpected };
  };

  const getAgeStage = (weeks: number) => {
    if (weeks < 4) return t('newborn');
    if (weeks < 12) return t('youngInfant');
    if (weeks < 26) return t('olderInfant');
    if (weeks < 52) return t('mobileInfant');
    return t('toddler');
  };

  const getDevelopmentFocus = (weeks: number) => {
    if (weeks < 4) return t('devFocus0to4');
    if (weeks >= 4 && weeks < 12) return t('devFocus4to12');
    if (weeks >= 12 && weeks < 26) return t('devFocus12to26');
    if (weeks >= 26 && weeks < 52) return t('devFocus26to52');
    return t('devFocus52plus');
  };

return (
  <div className="space-y-4">
    {/* Data Pulse - Show at the top */}
    {guideSections && guideSections.data_pulse && (
      <div className="mx-2 p-4 bg-accent/10 rounded-lg border border-border/40">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">Data Pulse</h3>
          </div>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Change vs Last 5 Days</span>
        </div>
        
        <div className="space-y-2">
          {guideSections.data_pulse.metrics.length > 0 ? (
            guideSections.data_pulse.metrics.map((metric, idx) => {
              const getMetricIcon = () => {
                if (metric.name === 'Total sleep') return <Moon className="w-4 h-4 text-primary" />;
                if (metric.name === 'Naps') return <Baby className="w-4 h-4 text-primary" />;
                if (metric.name === 'Feed volume') return <Milk className="w-4 h-4 text-primary" />;
                if (metric.name === 'Wake average') return <Clock className="w-4 h-4 text-primary" />;
                if (metric.name === 'Nap duration') return <Moon className="w-4 h-4 text-primary" />;
                return <TrendingUp className="w-4 h-4 text-primary" />;
              };
              
              const getTrendIcon = () => {
                if (metric.change.includes('+')) return <TrendingUp className="w-3 h-3 text-green-500" />;
                if (metric.change.includes('-')) return <TrendingDown className="w-3 h-3 text-red-500" />;
                return <Minus className="w-3 h-3 text-muted-foreground" />;
              };
              
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getMetricIcon()}
                    <span className="text-sm text-foreground">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className="text-sm font-medium text-foreground">
                      {metric.change}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No significant changes detected
            </p>
          )}
          
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/20">
            {guideSections.data_pulse.note}
          </p>
        </div>
      </div>
    )}

    {/* Age-Appropriate Guidance - NOW FIRST */}
    <div className="mx-2 bg-card rounded-xl p-4 shadow-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">
          {t('whatToExpectAt')} {Math.floor(ageInWeeks)} {t('weeks')}
        </h2>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        {getAgeStage(ageInWeeks)} {t('stage')}
      </div>

      <div className="grid gap-4">
        {/* Sleep Guidance with actual patterns nested */}
        {wakeWindowData && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-foreground uppercase tracking-wide">{t('sleepPatterns')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Wake Windows:</span>
                <span className="font-medium">{wakeWindowData.wakeWindows.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Naps per Day:</span>
                <span className="font-medium">{wakeWindowData.napCount} {t('perDay')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalSleepNeed')}:</span>
                <span className="font-medium">{wakeWindowData.totalSleep}</span>
              </div>
              
              {/* Nested actual patterns from baby's data OR ghost cards for new users */}
              <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-3 w-3 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {household.baby_name}'s Patterns
                  </span>
                </div>
                
                {/* Show actual patterns if we have data */}
                {(sleepInsights.length > 0 || sleepMetrics.napsPerDay > 0) ? (
                  <>
                    {sleepMetrics.napsPerDay > 0 && (
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex items-start gap-2 flex-1">
                          <Moon className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                          <span className="text-primary/90">Naps per day: {sleepMetrics.napsPerDay}</span>
                        </div>
                      </div>
                    )}
                    {sleepInsights.filter(insight => 
                      !insight.text.toLowerCase().includes('naps before noon') &&
                      !insight.text.toLowerCase().includes('naps per day')
                    ).map((insight, idx) => {
                      const IconComponent = insight.icon;
                      // Get min and max from wake window array for proper range
                      const wakeWindowValues = wakeWindowData.wakeWindows.map((w: string) => {
                        const match = w.match(/(\d+\.?\d*)/);
                        return match ? parseFloat(match[1]) : 0;
                      }).filter(v => v > 0);
                      const minWW = Math.min(...wakeWindowValues);
                      const maxWW = Math.max(...wakeWindowValues);
                      const wakeWindowRange = `${minWW}-${maxWW}hrs`;
                      const match = getPatternMatch(insight, wakeWindowRange, 'wake');
                      
                      const TrendIcon = match?.trend === 'up' ? TrendingUp : 
                                       match?.trend === 'down' ? TrendingDown : 
                                       Minus;
                      const trendColor = match?.trend === 'up' ? 'text-orange-500' : 
                                        match?.trend === 'down' ? 'text-blue-500' : 
                                        'text-muted-foreground/50';
                      
                      return (
                        <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2 flex-1">
                            <IconComponent className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                            <span className="text-primary/90">{insight.text}</span>
                          </div>
                          {match && match.trend !== 'normal' && (
                            <TrendIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${trendColor}`} />
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  /* Ghost cards previewing future predictions */
                  <div className="space-y-2 opacity-40">
                    <div className="flex items-start gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Wake windows: ~2.5h average</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Moon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Naps per day: 4 typical</span>
                    </div>
                    <div className="text-xs text-muted-foreground/70 italic mt-3">
                      Keep logging naps to see {household.baby_name}'s unique patterns
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feeding Guidance with actual patterns nested */}
        {feedingGuidance && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Milk className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-foreground uppercase tracking-wide">{t('feedingPatterns')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feed Frequency:</span>
                <span className="font-medium">{feedingGuidance.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount per Feed:</span>
                <span className="font-medium">{feedingGuidance.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dailyTotal')}:</span>
                <span className="font-medium">{feedingGuidance.dailyTotal}</span>
              </div>
              {feedingGuidance.notes && (
                <div className="pt-2 text-xs text-muted-foreground border-t border-border/50">
                  {feedingGuidance.notes === "Newborns need frequent small feeds. Follow baby's hunger cues." && t('newbornsFeedFrequent')}
                  {feedingGuidance.notes === "Feeding patterns are becoming more predictable." && t('feedingPatternsBecoming')}
                  {feedingGuidance.notes === "Baby can go longer between feeds now." && t('babyCanGoLonger')}
                  {feedingGuidance.notes === "Sleep periods are getting longer, affecting feeding schedule." && t('sleepPeriodsLonger')}
                  {feedingGuidance.notes === "May start showing interest in solid foods around 4-6 months." && t('mayStartSolids')}
                  {feedingGuidance.notes === "Solid foods are becoming a bigger part of nutrition." && t('solidsBecomingBigger')}
                </div>
              )}
              
              {/* Nested actual patterns from baby's data OR ghost cards for new users */}
              <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-3 w-3 text-primary/70" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {household.baby_name}'s Patterns
                  </span>
                </div>
                
                {/* Show actual patterns if we have data */}
                {(feedingInsights.length > 0 || feedingMetrics.avgAmount) ? (
                  <>
                    {feedingMetrics.avgAmount && (
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex items-start gap-2 flex-1">
                          <Milk className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                          <span className="text-primary/90">Amount per feed: {feedingMetrics.avgAmount} oz</span>
                        </div>
                      </div>
                    )}
                    {feedingInsights.map((insight, idx) => {
                      const IconComponent = insight.icon;
                      const match = getPatternMatch(insight, feedingGuidance.frequency, 'feed');
                      
                      const TrendIcon = match?.trend === 'up' ? TrendingUp : 
                                       match?.trend === 'down' ? TrendingDown : 
                                       Minus;
                      const trendColor = match?.trend === 'up' ? 'text-orange-500' : 
                                        match?.trend === 'down' ? 'text-blue-500' : 
                                        'text-muted-foreground/50';
                      
                      return (
                        <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2 flex-1">
                            <IconComponent className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                            <span className="text-primary/90">{insight.text}</span>
                          </div>
                          {match && match.trend !== 'normal' && (
                            <TrendIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${trendColor}`} />
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  /* Ghost cards previewing future predictions */
                  <div className="space-y-2 opacity-40">
                    <div className="flex items-start gap-2 text-xs">
                      <Milk className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Amount per feed: ~3.5 oz typical</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">Feed interval: Every 3-4h average</span>
                    </div>
                    <div className="text-xs text-muted-foreground/70 italic mt-3">
                      Keep logging feeds to see {household.baby_name}'s unique patterns
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Development Milestones */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-medium text-foreground uppercase tracking-wide">{t('developmentFocus')}</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {getDevelopmentFocus(ageInWeeks)}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};