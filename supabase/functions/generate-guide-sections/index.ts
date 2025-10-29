import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  id: string;
  type: string;
  time: string;
  logged_at: string;
  duration?: number;
  amount?: number;
  unit?: string;
  details?: any;
}

interface MetricDelta {
  name: string;
  change: string;
  rawDelta?: number;
  priority?: number;
  context?: string;
}

interface Insight {
  type: string;
  delta: string;
  rawValue?: number;
  priority?: number;
  context?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get household through collaborators
    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!collaborator) {
      throw new Error('No household found for user');
    }

    const { data: household } = await supabase
      .from('households')
      .select('baby_name, baby_birthday')
      .eq('id', collaborator.household_id)
      .single();

    if (!household?.baby_birthday) {
      throw new Error('Baby birthday not found');
    }

    // Calculate age
    const birthDate = new Date(household.baby_birthday);
    const now = new Date();
    const ageMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const ageWeeks = Math.floor(((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) % 4);
    const ageString = `${ageMonths}m${ageWeeks}w`;

    // Fetch last 7 days of activities
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('household_id', collaborator.household_id)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .order('logged_at', { ascending: false });

    if (!activities || activities.length === 0) {
      return new Response(JSON.stringify({
        data_pulse: {
          metrics: [],
          note: "Not enough data yet to show trends."
        },
        what_to_know: ["Not enough data yet — log activities to see personalized insights."],
        what_to_do: ["Start tracking sleep, feeds, and diapers to build your rhythm profile."],
        whats_next: "Patterns will emerge after a few days of consistent logging.",
        prep_tip: "Set reminders to log activities in real-time for better accuracy."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate metrics and deltas: compare last 2 days vs 5-day baseline (with outlier detection)
    // Determine timezone from activities or default to project default
    const tz = (activities.find((a: any) => a.timezone)?.timezone as string) || 'America/Los_Angeles';

    // Compute UTC boundaries in the user's timezone
    const todayStartUTC = getTZStartOfTodayUTC(now, tz);
    const twoDaysAgoUTC = new Date(todayStartUTC.getTime() - 2 * 24 * 60 * 60 * 1000);
    const baselineStartUTC = new Date(todayStartUTC.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days back

    // For overnight sleep attribution, we need to look at which day the sleep TIME falls on
    // not just the logged_at timestamp. Use date_local if available.
    const getActivityDate = (a: any) => {
      if (a.details?.date_local) {
        return new Date(a.details.date_local + 'T00:00:00Z');
      }
      // Fallback to logged_at converted to user timezone
      const loggedDate = new Date(a.logged_at);
      return new Date(loggedDate.toLocaleString('en-US', { timeZone: tz }));
    };

    // Recent: Last 2 complete days (by activity date, not logged_at)
    const recentActivities = activities.filter(a => {
      const activityDate = getActivityDate(a);
      return activityDate >= twoDaysAgoUTC && activityDate < todayStartUTC;
    });
    
    // Previous: 5 days before the recent 2 days (baseline trend)
    const previousActivities = activities.filter(a => {
      const activityDate = getActivityDate(a);
      return activityDate >= baselineStartUTC && activityDate < twoDaysAgoUTC;
    });

    // Apply outlier detection before calculating metrics
    const recentActivitiesFiltered = filterOutliers(recentActivities, tz);
    const previousActivitiesFiltered = filterOutliers(previousActivities, tz);
    
    const recentMetrics = calculateMetrics(recentActivitiesFiltered);
    const previousMetrics = calculateMetrics(previousActivitiesFiltered);
    
    // Calculate trend analysis (nap & feed durations over time)
    const trendAnalysis = analyzeTrends(activities, baselineStartUTC, todayStartUTC);

    console.log('DataPulse window', {
      tz,
      todayStartUTC: todayStartUTC.toISOString(),
      twoDaysAgoUTC: twoDaysAgoUTC.toISOString(),
      baselineStartUTC: baselineStartUTC.toISOString(),
      recentMetrics,
      previousMetrics,
      trendAnalysis,
      recentCount: recentActivities.length,
      previousCount: previousActivities.length,
    });

    const deltas = computeDeltas(recentMetrics, previousMetrics, 5, trendAnalysis);
    const insights = extractInsights(deltas, ageMonths, trendAnalysis);

    const allWindowActivities = activities.filter(a => {
      const t = new Date(a.logged_at);
      return t >= baselineStartUTC && t < todayStartUTC;
    });
    const dataQuality = calculateDataQuality(allWindowActivities, 7); // 7 days total

    // Get tone chip (simplified - would come from your tone detection logic)
    const toneChip = "Smooth Flow";
    const streakLength = 3;

    // Prepare payload for Gemini
    const geminiPayload = {
      tone_chip: toneChip,
      streak_length: streakLength,
      insights: insights,
      age: ageString,
      context_flags: [],
      data_quality: dataQuality,
      metrics: deltas
    };

    console.log('Calling Gemini with payload:', JSON.stringify(geminiPayload, null, 2));

    // Call Gemini via Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const guideSections = await generateGuideSections(lovableApiKey, geminiPayload, dataQuality);

    // Build complete response with Data Pulse
    const response = {
      data_pulse: {
        metrics: deltas.slice(0, 3).map(d => ({ // Top 3 only
          name: d.name,
          change: d.change
        })),
        note: dataQuality < 0.6 
          ? "Data incomplete — trends may be approximate."
          : ""
      },
      ...guideSections
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-guide-sections:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      data_pulse: {
        metrics: [],
        note: "Unable to calculate metrics right now."
      },
      what_to_know: ["Unable to generate insights right now."],
      what_to_do: ["Continue logging activities as usual."],
      whats_next: "Insights will be available once data processing resumes.",
      prep_tip: "Check back in a few hours."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Filter out outlier days (days with < 50% of average activity)
function filterOutliers(activities: Activity[], tz: string): Activity[] {
  if (activities.length === 0) return [];
  
  // Group activities by day
  const days = new Map<string, Activity[]>();
  activities.forEach(activity => {
    const activityDate = activity.details?.date_local 
      ? new Date(activity.details.date_local)
      : new Date(new Date(activity.logged_at).toLocaleString('en-US', { timeZone: tz }));
    const dayKey = activityDate.toISOString().split('T')[0];
    if (!days.has(dayKey)) {
      days.set(dayKey, []);
    }
    days.get(dayKey)!.push(activity);
  });

  // Calculate stats per day
  const dayStats = Array.from(days.entries()).map(([date, dayActivities]) => {
    const feeds = dayActivities.filter(a => a.type === 'feed');
    const naps = dayActivities.filter(a => a.type === 'nap');
    
    const feedVolume = feeds.reduce((sum, f) => {
      const qty = parseFloat(f.details?.quantity || '0');
      const unit = f.details?.unit || 'ml';
      return sum + (unit === 'oz' ? qty : qty / 29.5735);
    }, 0);

    const sleepMinutes = naps.reduce((sum, n) => {
      if (n.details?.duration) {
        return sum + parseInt(n.details.duration);
      }
      if (n.details?.startTime && n.details?.endTime) {
        // Parse time strings manually
        const parseTime = (timeStr: string) => {
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!match) return null;
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        
        const startMins = parseTime(n.details.startTime);
        const endMins = parseTime(n.details.endTime);
        if (startMins === null || endMins === null) return sum;
        
        let diff = endMins - startMins;
        if (diff < 0) diff += 24 * 60;
        if (diff > 720) diff = 720; // Cap at 12 hours
        return sum + diff;
      }
      return sum;
    }, 0);

    return { date, feedVolume, sleepMinutes, activities: dayActivities };
  });

  // Calculate averages (excluding days with no data)
  const feedVolumes = dayStats.filter(d => d.feedVolume > 0).map(d => d.feedVolume);
  const sleepTimes = dayStats.filter(d => d.sleepMinutes > 0).map(d => d.sleepMinutes);
  
  const avgFeedVolume = feedVolumes.length > 0
    ? feedVolumes.reduce((a, b) => a + b, 0) / feedVolumes.length
    : 0;
  
  const avgSleep = sleepTimes.length > 0
    ? sleepTimes.reduce((a, b) => a + b, 0) / sleepTimes.length
    : 0;

  // Filter out outlier days (less than 50% of average)
  const threshold = 0.5;
  const includedDays = dayStats.filter(day => {
    const isFeedOutlier = avgFeedVolume > 0 && day.feedVolume > 0 && day.feedVolume < avgFeedVolume * threshold;
    const isSleepOutlier = avgSleep > 0 && day.sleepMinutes > 0 && day.sleepMinutes < avgSleep * threshold;
    const hasNoData = day.feedVolume === 0 && day.sleepMinutes === 0;
    
    return !(isFeedOutlier || isSleepOutlier || hasNoData);
  });

  // Return activities from non-outlier days only
  return includedDays.flatMap(day => day.activities);
}

function calculateMetrics(activities: Activity[]) {
  const sleepActivities = activities.filter(a => a.type === 'nap');
  const feedActivities = activities.filter(a => a.type === 'feed');
  
  // Helper to calculate duration for a single sleep activity
  const calculateSleepDuration = (a: Activity) => {
    if (a.details?.duration) {
      return parseInt(a.details.duration);
    }
    if (a.details?.startTime && a.details?.endTime) {
      // Parse time strings manually to avoid Date constructor issues
      const parseTime = (timeStr: string) => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes; // Return total minutes from midnight
      };
      
      const startMins = parseTime(a.details.startTime);
      const endMins = parseTime(a.details.endTime);
      
      if (startMins === null || endMins === null) return 0;
      
      let diff = endMins - startMins;
      if (diff < 0) diff += 24 * 60; // Handle overnight
      
      // Cap at reasonable duration (12 hours)
      if (diff > 720) diff = 720;
      return diff;
    }
    return 0;
  };
  
  // Calculate TOTAL sleep (all naps including night sleep)
  const totalSleepMinutes = sleepActivities.reduce((sum, a) => sum + calculateSleepDuration(a), 0);
  
  // Filter for daytime naps only (7 AM - 7 PM starts)
  const daytimeNaps = sleepActivities.filter(a => {
    if (!a.details?.startTime) return false; // exclude if no time info
    const timeMatch = a.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return false;
    
    let hours = parseInt(timeMatch[1]);
    const period = timeMatch[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Only include naps that start between 7 AM and 7 PM
    return hours >= 7 && hours < 19;
  });
  
  // Calculate daytime nap duration
  const daytimeNapMinutes = daytimeNaps.reduce((sum, a) => sum + calculateSleepDuration(a), 0);
  const napCount = daytimeNaps.length;
  
  const totalFeedVolume = feedActivities.reduce((sum, a) => {
    if (!a.details?.quantity) return sum;
    const quantity = parseFloat(a.details.quantity);
    if (a.details.unit === 'oz') return sum + quantity;
    if (a.details.unit === 'ml') return sum + (quantity / 29.5735);
    return sum;
  }, 0);
  const feedCount = feedActivities.length;

  // Calculate average wake window (time between naps)
  let totalWakeMinutes = 0;
  let wakeWindowCount = 0;
  
  // Sort by logged_at
  const sortedNaps = [...sleepActivities].sort((a, b) => 
    new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
  
  for (let i = 0; i < sortedNaps.length - 1; i++) {
    const current = sortedNaps[i];
    const next = sortedNaps[i + 1];
    
    // Calculate current nap duration using the helper
    const currentDuration = calculateSleepDuration(current);
    
    const currentEnd = new Date(current.logged_at).getTime() + (currentDuration * 60000);
    const nextStart = new Date(next.logged_at).getTime();
    const wakeMinutes = (nextStart - currentEnd) / (1000 * 60);
    
    if (wakeMinutes > 0 && wakeMinutes < 600) { // sanity check (less than 10 hours)
      totalWakeMinutes += wakeMinutes;
      wakeWindowCount++;
    }
  }
  const avgWakeWindow = wakeWindowCount > 0 ? totalWakeMinutes / wakeWindowCount : 0;

  return {
    totalSleepMinutes,
    daytimeNapMinutes,
    napCount,
    totalFeedVolume,
    feedCount,
    avgWakeWindow
  };
}

function computeDeltas(recent: any, previous: any, baselineDays: number = 5, trendAnalysis?: any): MetricDelta[] {
  const deltas: MetricDelta[] = [];

  // Compute average per day for baseline metrics (excluding outliers)
  const recentDays = 2;
  const avgRecentSleep = recent.totalSleepMinutes / recentDays;
  const avgPreviousSleep = previous.totalSleepMinutes / baselineDays;
  const avgRecentFeed = recent.totalFeedVolume / recentDays;
  const avgPreviousFeed = previous.totalFeedVolume / baselineDays;
  const avgPreviousWake = previous.avgWakeWindow; // already an average

  // Total sleep delta (last 2 days avg vs 5-day baseline avg) - ALL SLEEP
  const sleepDelta = avgRecentSleep - avgPreviousSleep;
  if (Math.abs(sleepDelta) >= 15) {
    const hours = Math.floor(Math.abs(sleepDelta) / 60);
    const mins = Math.round(Math.abs(sleepDelta) % 60 / 5) * 5;
    deltas.push({
      name: 'Total sleep',
      change: `${sleepDelta > 0 ? '+' : '-'}${hours}h ${mins}m`,
      rawDelta: sleepDelta,
      priority: Math.abs(sleepDelta) / 60 // hours difference
    } as any);
  }

  // Daytime naps delta (separate from total sleep)
  const avgRecentNaps = recent.daytimeNapMinutes / recentDays;
  const avgPreviousNaps = previous.daytimeNapMinutes / baselineDays;
  const napsDelta = avgRecentNaps - avgPreviousNaps;
  if (Math.abs(napsDelta) >= 15) {
    const hours = Math.floor(Math.abs(napsDelta) / 60);
    const mins = Math.round(Math.abs(napsDelta) % 60 / 5) * 5;
    deltas.push({
      name: 'Naps',
      change: `${napsDelta > 0 ? '+' : '-'}${hours}h ${mins}m`,
      rawDelta: napsDelta,
      priority: Math.abs(napsDelta) / 60
    } as any);
  }

  // Feed volume delta (last 2 days avg vs 5-day baseline avg)
  if (avgPreviousFeed > 0) {
    const feedPercent = ((avgRecentFeed - avgPreviousFeed) / avgPreviousFeed) * 100;
    if (Math.abs(feedPercent) >= 5) {
      deltas.push({
        name: 'Feed volume',
        change: `${feedPercent > 0 ? '+' : ''}${Math.round(feedPercent / 5) * 5}%`,
        rawDelta: feedPercent,
        priority: Math.abs(feedPercent) / 10 // scale to 0-10
      } as any);
    }
  }

  // Wake window delta (last 2 days avg vs 5-day baseline avg)
  const wakeDelta = recent.avgWakeWindow - avgPreviousWake;
  if (Math.abs(wakeDelta) >= 15) {
    const mins = Math.round(Math.abs(wakeDelta) / 5) * 5;
    deltas.push({
      name: 'Wake average',
      change: `${wakeDelta > 0 ? '+' : '-'}${mins}m`,
      rawDelta: wakeDelta,
      priority: Math.abs(wakeDelta) / 30 // 30min = 1.0 priority
    } as any);
  }

  // Nap duration trend
  if (trendAnalysis?.napDurationTrend) {
    const trend = trendAnalysis.napDurationTrend;
    if (Math.abs(trend.changeMins) >= 10) {
      deltas.push({
        name: 'Nap duration',
        change: `${trend.changeMins > 0 ? '+' : ''}${Math.round(trend.changeMins)}m avg`,
        rawDelta: trend.changeMins,
        priority: Math.abs(trend.changeMins) / 20, // 20min = 1.0 priority
        context: trend.interpretation
      } as any);
    }
  }

  // Feed duration trend
  if (trendAnalysis?.feedDurationTrend) {
    const trend = trendAnalysis.feedDurationTrend;
    if (Math.abs(trend.changeMins) >= 3) {
      deltas.push({
        name: 'Feed duration',
        change: `${trend.changeMins > 0 ? '+' : ''}${Math.round(trend.changeMins)}m avg`,
        rawDelta: trend.changeMins,
        priority: Math.abs(trend.changeMins) / 5, // 5min = 1.0 priority
        context: trend.interpretation
      } as any);
    }
  }

  // Sort by priority (highest first) and return
  return deltas.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
}

function extractInsights(deltas: MetricDelta[], ageMonths: number, trendAnalysis?: any): Insight[] {
  const insights: Insight[] = [];

  for (const delta of deltas) {
    const d = delta as any;
    
    if (delta.name === 'Feed volume' && delta.rawDelta && delta.rawDelta < -5) {
      insights.push({
        type: 'feed_volume_down',
        delta: delta.change,
        rawValue: delta.rawDelta,
        priority: d.priority || 1
      } as any);
    }
    if (delta.name === 'Wake average' && delta.rawDelta && Math.abs(delta.rawDelta) >= 30) {
      insights.push({
        type: delta.rawDelta > 0 ? 'wake_window_increase' : 'wake_window_decrease',
        delta: delta.change,
        rawValue: delta.rawDelta,
        priority: d.priority || 1
      } as any);
    }
    if (delta.name === 'Total sleep' && delta.rawDelta && Math.abs(delta.rawDelta) >= 60) {
      insights.push({
        type: delta.rawDelta > 0 ? 'sleep_increase' : 'sleep_decrease',
        delta: delta.change,
        rawValue: delta.rawDelta,
        priority: d.priority || 1
      } as any);
    }
    if (delta.name === 'Nap duration' && delta.rawDelta && Math.abs(delta.rawDelta) >= 10) {
      insights.push({
        type: delta.rawDelta > 0 ? 'nap_lengthening' : 'nap_shortening',
        delta: delta.change,
        rawValue: delta.rawDelta,
        priority: d.priority || 1,
        context: d.context
      } as any);
    }
    if (delta.name === 'Feed duration' && delta.rawDelta && Math.abs(delta.rawDelta) >= 3) {
      insights.push({
        type: delta.rawDelta > 0 ? 'feed_lengthening' : 'feed_shortening',
        delta: delta.change,
        rawValue: delta.rawDelta,
        priority: d.priority || 1,
        context: d.context
      } as any);
    }
  }

  // Sort by priority and return top 3
  return insights.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0)).slice(0, 3);
}

function calculateDataQuality(activities: Activity[], daysSpan: number): number {
  // Simple heuristic: based on number of logs per day
  const expectedLogsPerDay = 8; // feeds + naps + diapers
  const actualLogs = activities.length;
  const quality = Math.min(actualLogs / (daysSpan * expectedLogsPerDay), 1.0);
  return Math.round(quality * 100) / 100;
}

function analyzeTrends(activities: Activity[], startUTC: Date, endUTC: Date) {
  const windowActivities = activities.filter(a => {
    const t = new Date(a.logged_at);
    return t >= startUTC && t < endUTC;
  });

  // Analyze nap duration trends
  const naps = windowActivities.filter(a => a.type === 'nap');
  const napDurations: Array<{ date: Date; duration: number }> = [];
  
  naps.forEach(nap => {
    let duration = 0;
    if (nap.details?.duration) {
      duration = parseInt(nap.details.duration);
    } else if (nap.details?.startTime && nap.details?.endTime) {
      const start = new Date(`1970-01-01 ${nap.details.startTime}`);
      const end = new Date(`1970-01-01 ${nap.details.endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      if (diff < 0) diff += 24 * 60;
      duration = diff;
    }
    
    if (duration > 0 && duration < 300) { // reasonable nap (< 5 hours)
      napDurations.push({ date: new Date(nap.logged_at), duration });
    }
  });

  // Remove outliers using IQR method
  const napDurationsFiltered = removeOutliers(napDurations.map(n => n.duration));
  const validNaps = napDurations.filter(n => napDurationsFiltered.includes(n.duration));

  // Split into early and late periods
  const midPoint = new Date((startUTC.getTime() + endUTC.getTime()) / 2);
  const earlyNaps = validNaps.filter(n => n.date < midPoint);
  const lateNaps = validNaps.filter(n => n.date >= midPoint);

  const napDurationTrend = earlyNaps.length >= 2 && lateNaps.length >= 2 ? {
    earlyAvg: average(earlyNaps.map(n => n.duration)),
    lateAvg: average(lateNaps.map(n => n.duration)),
    changeMins: average(lateNaps.map(n => n.duration)) - average(earlyNaps.map(n => n.duration)),
    interpretation: interpretNapTrend(
      average(lateNaps.map(n => n.duration)) - average(earlyNaps.map(n => n.duration)),
      lateNaps.length
    )
  } : null;

  // Analyze feed duration trends (only for feeds with time logged)
  const feeds = windowActivities.filter(a => a.type === 'feed');
  const feedDurations: Array<{ date: Date; duration: number }> = [];
  
  feeds.forEach(feed => {
    if (feed.details?.startTime && feed.details?.endTime) {
      const start = new Date(`1970-01-01 ${feed.details.startTime}`);
      const end = new Date(`1970-01-01 ${feed.details.endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      if (diff > 0 && diff < 120) { // reasonable feed (< 2 hours)
        feedDurations.push({ date: new Date(feed.logged_at), duration: diff });
      }
    }
  });

  // Remove outliers
  const feedDurationsFiltered = removeOutliers(feedDurations.map(f => f.duration));
  const validFeeds = feedDurations.filter(f => feedDurationsFiltered.includes(f.duration));

  const earlyFeeds = validFeeds.filter(f => f.date < midPoint);
  const lateFeeds = validFeeds.filter(f => f.date >= midPoint);

  const feedDurationTrend = earlyFeeds.length >= 2 && lateFeeds.length >= 2 ? {
    earlyAvg: average(earlyFeeds.map(f => f.duration)),
    lateAvg: average(lateFeeds.map(f => f.duration)),
    changeMins: average(lateFeeds.map(f => f.duration)) - average(earlyFeeds.map(f => f.duration)),
    interpretation: interpretFeedTrend(
      average(lateFeeds.map(f => f.duration)) - average(earlyFeeds.map(f => f.duration))
    )
  } : null;

  return {
    napDurationTrend,
    feedDurationTrend
  };
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(v => v >= lowerBound && v <= upperBound);
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function interpretNapTrend(changeMins: number, napCount: number): string {
  if (changeMins > 15) {
    if (napCount <= 2) return "settling into 2-nap rhythm";
    return "sleep consolidation";
  } else if (changeMins < -15) {
    return "nap transition underway";
  }
  return "stable duration";
}

function interpretFeedTrend(changeMins: number): string {
  if (changeMins > 5) return "increased engagement";
  if (changeMins < -5) return "more efficient feeding";
  return "consistent timing";
}

// Timezone helpers to compute start-of-day (midnight) in a given IANA timezone, returned as a UTC Date
function getTZOffset(date: Date, timeZone: string): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz = new Date(date.toLocaleString('en-US', { timeZone }));
  return (tz.getTime() - utc.getTime()) / 60000; // minutes
}

function getTZStartOfTodayUTC(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const d = Number(parts.find(p => p.type === 'day')?.value);
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offsetAtGuess = getTZOffset(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetAtGuess * 60000);
}

async function generateGuideSections(apiKey: string, payload: any, dataQuality: number) {
  const systemPrompt = `You are an intelligent baby care data analyst. Your role is to surface the most developmentally significant insights from activity patterns.

Voice: warm professional, precise, evidence-based
Priority framework:
1. Developmental milestones (sleep consolidation, nap transitions)
2. Health-related patterns (feeding efficiency, duration changes)
3. Schedule optimization signals

Rules:
- Each bullet under 18 words
- Use "try", "keep", "offer" instead of imperatives
- If data quality < 0.6, soften verbs to "consider"
- Focus on WHY patterns matter developmentally, not just what changed`;

  const insightsText = payload.insights.map((i: any) => {
    let text = `- ${i.type}: ${i.delta}`;
    if (i.context) text += ` (${i.context})`;
    return text;
  }).join('\n');

  const userPrompt = `Analyze this baby activity data and generate intelligent guidance:

Age: ${payload.age}
Current pattern: ${payload.tone_chip} (${payload.streak_length}-day streak)
Data quality: ${(payload.data_quality * 100).toFixed(0)}%

Top priority changes (ranked by developmental significance):
${payload.metrics.slice(0, 3).map((m: any, i: number) => `${i + 1}. ${m.name}: ${m.change}`).join('\n')}

Key insights with context:
${insightsText}

Generate:
1. "what_to_know": 2-3 bullets explaining WHAT'S HAPPENING and WHY IT MATTERS developmentally
   - Focus on interpreting the changes in context of baby's age and development
   - Mention trends like "naps lengthening" or "feeding becoming more efficient" when relevant
   
2. "what_to_do": 2-3 actionable, age-appropriate steps
   - Prioritize actions that support the detected developmental transitions
   - Use softened language if data quality < 60%
   
3. "whats_next": One forward-looking sentence (≤25 words) about expected progression
   - Connect current patterns to next developmental phase
   
4. "prep_tip": One concrete, anticipatory tip (≤18 words)
   - Help parents prepare for what's coming based on current trends

Return ONLY valid JSON with these four keys. Be intelligent about which changes matter most.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return getFallbackSections(payload, dataQuality);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return getFallbackSections(payload, dataQuality);
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    return getFallbackSections(payload, dataQuality);

  } catch (error) {
    console.error('Error calling Gemini:', error);
    return getFallbackSections(payload, dataQuality);
  }
}

function getFallbackSections(payload: any, dataQuality: number) {
  const prefix = dataQuality < 0.6 ? 'Consider: ' : '';
  
  return {
    what_to_know: [
      "Recent patterns show expected variation for this age.",
      "Activity levels are within normal ranges."
    ],
    what_to_do: [
      `${prefix}Maintain current schedule consistency.`,
      `${prefix}Continue tracking to refine insights.`
    ],
    whats_next: "Patterns typically stabilize after consistent logging over several days.",
    prep_tip: "Keep bedtime routine steady to anchor daily rhythm."
  };
}
