import { useState, useEffect, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Moon, Milk, Sun, ChevronDown, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isDaytimeNap } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getTodayActivities } from "@/utils/activityDateFilters";
import { getActivityEventDateString } from "@/utils/activityDate";

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
  const [explanation, setExplanation] = useState<string>('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [meaningOpen, setMeaningOpen] = useState(false);

  // Calculate comparative stats with variance from averages
  const comparativeStats = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayActivities = getTodayActivities(activities);
    
    // Get baby age in months
    let babyAgeMonths = babyAge || 0;
    if (!babyAge && babyBirthday) {
      const birthDate = new Date(babyBirthday);
      babyAgeMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    }

    // Age-appropriate baselines
    const getExpectedRanges = (ageMonths: number) => {
      if (ageMonths < 1) return { feeds: [8, 12], naps: [4, 6] };
      if (ageMonths < 3) return { feeds: [7, 10], naps: [4, 5] };
      if (ageMonths < 6) return { feeds: [6, 8], naps: [3, 4] };
      if (ageMonths < 9) return { feeds: [5, 7], naps: [3, 3] };
      if (ageMonths < 12) return { feeds: [4, 6], naps: [2, 3] };
      return { feeds: [3, 5], naps: [1, 2] };
    };
    const expected = getExpectedRanges(babyAgeMonths);

    // Get last 7 days for averages
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysActivities = activities.filter(a => 
      new Date(a.loggedAt) >= sevenDaysAgo
    );

    // Calculate 7-day averages
    const last7DaysNaps = last7DaysActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    const last7DaysFeeds = last7DaysActivities.filter(a => a.type === 'feed');
    
    // Count days with data
    const daysWithNapData = new Set<string>();
    last7DaysActivities.filter(a => a.type === 'nap').forEach(a => {
      const date = getActivityEventDateString(a as any);
      if (date) daysWithNapData.add(date);
    });
    const numDaysForNaps = Math.max(1, daysWithNapData.size);
    
    const daysWithFeedData = new Set<string>();
    last7DaysActivities.filter(a => a.type === 'feed').forEach(a => {
      const date = getActivityEventDateString(a as any);
      if (date) daysWithFeedData.add(date);
    });
    const numDaysForFeeds = Math.max(1, daysWithFeedData.size);
    
    const avgNaps = last7DaysNaps.length / numDaysForNaps;
    const avgFeeds = last7DaysFeeds.length / numDaysForFeeds;

    // Today's counts
    const napsToday = todayActivities.filter(a => 
      a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)
    );
    const feedsToday = todayActivities.filter(a => a.type === 'feed');
    
    const napCount = napsToday.length;
    const feedCount = feedsToday.length;

    // Calculate time-adjusted expected counts
    // Assume waking hours: 7am-7pm = 12 hours
    const wakeHour = 7;
    const sleepHour = 19;
    const totalWakingHours = sleepHour - wakeHour;
    const wakingHoursPassed = Math.max(0, Math.min(currentHour - wakeHour, totalWakingHours));
    const dayProgress = wakingHoursPassed / totalWakingHours;

    // Expected by now based on time of day
    const expectedNapsByNow = Math.round(avgNaps * dayProgress);
    const expectedFeedsByNow = Math.round(avgFeeds * dayProgress);

    // Determine status for each metric
    const getStatus = (actual: number, expectedByNow: number, avg: number): 'on-track' | 'ahead' | 'behind' => {
      if (currentHour < 10) return 'on-track'; // Too early to judge
      const tolerance = 1;
      if (actual >= expectedByNow) return actual > expectedByNow + tolerance ? 'ahead' : 'on-track';
      if (actual < expectedByNow - tolerance) return 'behind';
      return 'on-track';
    };

    const napStatus = getStatus(napCount, expectedNapsByNow, avgNaps);
    const feedStatus = getStatus(feedCount, expectedFeedsByNow, avgFeeds);

    // Schedule timing - based on pattern consistency
    let scheduleStatus: 'on-track' | 'ahead' | 'behind' = 'on-track';
    
    // Check if activities are spread evenly or clustered
    if (feedsToday.length >= 2) {
      const sortedFeeds = [...feedsToday].sort((a, b) => 
        new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
      );
      
      const gaps = [];
      for (let i = 1; i < sortedFeeds.length; i++) {
        const gap = (new Date(sortedFeeds[i].loggedAt).getTime() - 
                    new Date(sortedFeeds[i - 1].loggedAt).getTime()) / (1000 * 60);
        gaps.push(gap);
      }
      
      // Detect cluster feeding (many feeds close together)
      if (gaps.filter(g => g < 60).length >= 2) {
        scheduleStatus = 'behind';
      }
    }

    return {
      sleep: {
        count: napCount,
        avg: avgNaps,
        status: napStatus,
        icon: <Moon className="w-4 h-4" />
      },
      feeding: {
        count: feedCount,
        avg: avgFeeds,
        status: feedStatus,
        icon: <Milk className="w-4 h-4" />
      },
      schedule: {
        status: scheduleStatus,
        icon: <Sun className="w-4 h-4" />
      },
      hasDeviations: napStatus !== 'on-track' || feedStatus !== 'on-track' || scheduleStatus !== 'on-track',
      biggestDeviation: napStatus !== 'on-track' 
        ? { description: `Sleep: ${napCount} naps vs avg ${avgNaps.toFixed(1)}`, normal: `${expected.naps[0]}-${expected.naps[1]} naps`, actual: `${napCount} naps` }
        : feedStatus !== 'on-track'
          ? { description: `Feeding: ${feedCount} feeds vs avg ${avgFeeds.toFixed(1)}`, normal: `${expected.feeds[0]}-${expected.feeds[1]} feeds`, actual: `${feedCount} feeds` }
          : null
    };
  }, [activities, babyAge, babyBirthday, nightSleepStartHour, nightSleepEndHour]);

  // Fetch AI explanation for deviations
  useEffect(() => {
    if (!comparativeStats.hasDeviations || !comparativeStats.biggestDeviation) return;

    const today = new Date().toDateString();
    const cacheKey = `deviation-explanation-${today}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      setExplanation(cached);
      return;
    }

    const fetchExplanation = async () => {
      setExplanationLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-home-insights', {
          body: {
            insightType: 'deviation-explanation',
            activities: activities.slice(-50),
            babyName,
            babyAge,
            deviation: comparativeStats.biggestDeviation
          }
        });

        if (!error && data?.insight) {
          setExplanation(data.insight);
          sessionStorage.setItem(cacheKey, data.insight);
        }
      } catch (err) {
        console.error('Failed to fetch explanation:', err);
      } finally {
        setExplanationLoading(false);
      }
    };

    fetchExplanation();
  }, [comparativeStats.hasDeviations, comparativeStats.biggestDeviation?.description, babyName, babyAge, activities]);

  const getStatusText = (status: 'on-track' | 'ahead' | 'behind') => {
    switch (status) {
      case 'ahead': return 'Ahead';
      case 'behind': return 'Behind';
      default: return 'On track';
    }
  };

  const getStatusColor = (status: 'on-track' | 'ahead' | 'behind') => {
    switch (status) {
      case 'ahead': return 'text-primary';
      case 'behind': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="mb-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-caps text-muted-foreground">
            Today's Pulse
          </h3>
        </div>

        {/* Compact comparative stats */}
        <div className="divide-y divide-border">
          {/* Sleep */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="text-primary">{comparativeStats.sleep.icon}</div>
              <span className="text-sm text-foreground">Sleep</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {comparativeStats.sleep.count} naps (avg: {comparativeStats.sleep.avg.toFixed(1)})
              </span>
              <span className={`text-xs font-medium ${getStatusColor(comparativeStats.sleep.status)}`}>
                {getStatusText(comparativeStats.sleep.status)}
              </span>
            </div>
          </div>

          {/* Feeding */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="text-primary">{comparativeStats.feeding.icon}</div>
              <span className="text-sm text-foreground">Feeding</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {comparativeStats.feeding.count} feeds (avg: {comparativeStats.feeding.avg.toFixed(1)})
              </span>
              <span className={`text-xs font-medium ${getStatusColor(comparativeStats.feeding.status)}`}>
                {getStatusText(comparativeStats.feeding.status)}
              </span>
            </div>
          </div>

          {/* Schedule Timing */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="text-primary">{comparativeStats.schedule.icon}</div>
              <span className="text-sm text-foreground">Timing</span>
            </div>
            <span className={`text-xs font-medium ${getStatusColor(comparativeStats.schedule.status)}`}>
              {getStatusText(comparativeStats.schedule.status)}
            </span>
          </div>
        </div>

        {/* What This Means - Expandable */}
        {comparativeStats.hasDeviations && (
          <Collapsible open={meaningOpen} onOpenChange={setMeaningOpen}>
            <CollapsibleTrigger className="w-full px-3 py-2 hover:bg-accent/5 transition-colors border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    What this means
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${meaningOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-3 pb-3 pt-1">
                {explanationLoading ? (
                  <div className="space-y-1.5 animate-pulse">
                    <div className="h-3 w-full bg-muted rounded"></div>
                    <div className="h-3 w-4/5 bg-muted rounded"></div>
                  </div>
                ) : explanation ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {explanation}
                  </p>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};
