import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { startOfMonth, format, startOfWeek, endOfWeek, subDays, differenceInDays } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  type: string;
  logged_at: string;
  details: any;
  household_id: string;
}

interface Household {
  id: string;
  baby_birthday: string;
}

interface CohortMetrics {
  night_sleep_hours: number | null;
  naps_per_day: number | null;
  feed_count_per_day: number | null;
  avg_feed_volume: number | null;
  solids_started_pct: number | null;
}

interface CohortStats {
  cohort_label: string;
  cohort_month: string;
  week_start_date: string;
  week_end_date: string;
  metrics: CohortMetrics;
  changes: CohortMetrics;
  active_baby_count: number;
  metric_coverage: Record<string, number>;
  insight_text: string;
  fallback_tier: string | null;
}

// BabyRhythm Baseline Data (0-18 months)
// Based on aggregated developmental norms and app data patterns
const SEED_BASELINES: Record<number, any> = {
  // Month 0 (weeks 0-4): Newborn phase
  0: { night_sleep_hours: 8.5, naps_per_day: 6.0, feed_count_per_day: 10 },
  
  // Month 1 (weeks 5-8): Early infant
  1: { night_sleep_hours: 9.0, naps_per_day: 5.0, feed_count_per_day: 9 },
  
  // Month 2 (weeks 9-12): Developing patterns
  2: { night_sleep_hours: 9.5, naps_per_day: 4.5, feed_count_per_day: 8 },
  
  // Month 3 (weeks 13-16): 4-month regression period
  3: { night_sleep_hours: 10.0, naps_per_day: 4.0, feed_count_per_day: 7 },
  
  // Month 4 (weeks 17-20): Post-regression stabilization
  4: { night_sleep_hours: 10.2, naps_per_day: 3.5, feed_count_per_day: 6 },
  
  // Month 5 (weeks 21-24): 3 naps established
  5: { night_sleep_hours: 10.5, naps_per_day: 3.0, feed_count_per_day: 6 },
  
  // Month 6 (weeks 25-28): Solids introduction
  6: { night_sleep_hours: 10.8, naps_per_day: 3.0, feed_count_per_day: 5 },
  
  // Month 7 (weeks 29-32): Active phase
  7: { night_sleep_hours: 10.8, naps_per_day: 2.5, feed_count_per_day: 5 },
  
  // Month 8 (weeks 33-36): 8-month regression
  8: { night_sleep_hours: 10.7, naps_per_day: 2.5, feed_count_per_day: 5 },
  
  // Month 9 (weeks 37-40): Post-regression
  9: { night_sleep_hours: 10.6, naps_per_day: 2.0, feed_count_per_day: 4 },
  
  // Month 10 (weeks 41-44): 2 naps standard
  10: { night_sleep_hours: 10.5, naps_per_day: 2.0, feed_count_per_day: 4 },
  
  // Month 11 (weeks 45-48): Pre-12 month
  11: { night_sleep_hours: 10.5, naps_per_day: 2.0, feed_count_per_day: 4 },
  
  // Month 12 (weeks 49-52): 1 year milestone
  12: { night_sleep_hours: 10.4, naps_per_day: 2.0, feed_count_per_day: 4 },
  
  // Month 13: Early toddler
  13: { night_sleep_hours: 10.4, naps_per_day: 1.5, feed_count_per_day: 3 },
  
  // Month 14: 2→1 nap transition beginning
  14: { night_sleep_hours: 10.2, naps_per_day: 1.5, feed_count_per_day: 3 },
  
  // Month 15: Mid-transition
  15: { night_sleep_hours: 10.2, naps_per_day: 1.5, feed_count_per_day: 3 },
  
  // Month 16: 2→1 nap transition peak
  16: { night_sleep_hours: 10.1, naps_per_day: 1.0, feed_count_per_day: 3 },
  
  // Month 17: Transitioning to 1 nap
  17: { night_sleep_hours: 10.0, naps_per_day: 1.0, feed_count_per_day: 3 },
  
  // Month 18: 1 nap established
  18: { night_sleep_hours: 9.9, naps_per_day: 1.0, feed_count_per_day: 3 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Starting cohort statistics computation...');

    // Define current week range
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    const prevWeekStart = subDays(weekStart, 7);
    const prevWeekEnd = subDays(weekEnd, 7);

    console.log(`Computing for week: ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);

    // Get all households with baby birthdays
    const { data: households, error: householdsError } = await supabase
      .from('households')
      .select('id, baby_birthday')
      .not('baby_birthday', 'is', null);

    if (householdsError) throw householdsError;

    console.log(`Found ${households?.length || 0} households with baby birthdays`);

    // Group households by birth month cohort
    const cohorts = new Map<string, Household[]>();
    
    for (const household of households || []) {
      const birthMonth = startOfMonth(new Date(household.baby_birthday));
      const cohortKey = format(birthMonth, 'yyyy-MM-dd');
      
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts.get(cohortKey)!.push(household);
    }

    console.log(`Organized into ${cohorts.size} cohorts`);

    // Also create entries for cohorts that might have users but no data yet
    // This ensures seed baselines are available for all possible cohorts
    const allPossibleCohorts = new Map(cohorts);
    
    // Add cohorts for the last 12 months if they don't exist
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const cohortKey = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      if (!allPossibleCohorts.has(cohortKey)) {
        allPossibleCohorts.set(cohortKey, []);
      }
    }

    // Process each cohort
    for (const [cohortMonth, cohortHouseholds] of allPossibleCohorts.entries()) {
      try {
        const cohortLabel = format(new Date(cohortMonth), 'MMMM yyyy') + ' Babies';
        console.log(`\nProcessing cohort: ${cohortLabel} (${cohortHouseholds.length} households)`);

        const stats = await computeCohortStats(
          supabase,
          cohortMonth,
          cohortLabel,
          cohortHouseholds,
          weekStart,
          weekEnd,
          prevWeekStart,
          prevWeekEnd
        );

        // Upsert cohort statistics
        const { error: upsertError } = await supabase
          .from('cohort_statistics')
          .upsert({
            cohort_label: stats.cohort_label,
            cohort_month: stats.cohort_month,
            week_start_date: stats.week_start_date,
            week_end_date: stats.week_end_date,
            night_sleep_hours: stats.metrics.night_sleep_hours,
            night_sleep_change: stats.changes.night_sleep_hours,
            naps_per_day: stats.metrics.naps_per_day,
            naps_per_day_change: stats.changes.naps_per_day,
            feed_count_per_day: stats.metrics.feed_count_per_day,
            feed_count_change: stats.changes.feed_count_per_day,
            avg_feed_volume: stats.metrics.avg_feed_volume,
            avg_feed_volume_change: stats.changes.avg_feed_volume,
            solids_started_pct: stats.metrics.solids_started_pct,
            active_baby_count: stats.active_baby_count,
            metric_coverage: stats.metric_coverage,
            insight_text: stats.insight_text,
            fallback_tier: stats.fallback_tier,
          }, {
            onConflict: 'cohort_month,week_start_date'
          });

        if (upsertError) {
          console.error(`Error upserting cohort ${cohortLabel}:`, upsertError);
        } else {
          console.log(`✓ Updated cohort ${cohortLabel}`);
        }
      } catch (cohortError) {
        console.error(`Error processing cohort ${cohortMonth}:`, cohortError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cohorts_processed: allPossibleCohorts.size,
        message: 'Cohort statistics computed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compute-cohort-stats:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function computeCohortStats(
  supabase: any,
  cohortMonth: string,
  cohortLabel: string,
  households: Household[],
  weekStart: Date,
  weekEnd: Date,
  prevWeekStart: Date,
  prevWeekEnd: Date
): Promise<CohortStats> {
  
  const householdIds = households.map(h => h.id);
  
  // Get activities for current week
  const { data: currentActivities } = await supabase
    .from('activities')
    .select('type, logged_at, details, household_id')
    .in('household_id', householdIds)
    .gte('logged_at', weekStart.toISOString())
    .lte('logged_at', weekEnd.toISOString());

  // Get activities for previous week
  const { data: prevActivities } = await supabase
    .from('activities')
    .select('type, logged_at, details, household_id')
    .in('household_id', householdIds)
    .gte('logged_at', prevWeekStart.toISOString())
    .lte('logged_at', prevWeekEnd.toISOString());

  // Count active babies (households with ≥3 days of logs in current week)
  const activeBabies = countActiveBabies(currentActivities || [], householdIds);
  console.log(`Active babies with ≥3 days of logs: ${activeBabies}`);

  // Calculate age in months for the cohort
  const ageInMonths = Math.floor(differenceInDays(weekStart, new Date(cohortMonth)) / 30);
  
  // Compute metrics
  const currentMetrics = computeMetrics(currentActivities || [], householdIds);
  const prevMetrics = computeMetrics(prevActivities || [], householdIds);
  
  // Calculate changes
  const changes: CohortMetrics = {
    night_sleep_hours: currentMetrics.night_sleep_hours && prevMetrics.night_sleep_hours
      ? Number((currentMetrics.night_sleep_hours - prevMetrics.night_sleep_hours).toFixed(1))
      : null,
    naps_per_day: currentMetrics.naps_per_day && prevMetrics.naps_per_day
      ? Number((currentMetrics.naps_per_day - prevMetrics.naps_per_day).toFixed(1))
      : null,
    feed_count_per_day: currentMetrics.feed_count_per_day && prevMetrics.feed_count_per_day
      ? Number((currentMetrics.feed_count_per_day - prevMetrics.feed_count_per_day).toFixed(1))
      : null,
    avg_feed_volume: currentMetrics.avg_feed_volume && prevMetrics.avg_feed_volume
      ? Number((currentMetrics.avg_feed_volume - prevMetrics.avg_feed_volume).toFixed(1))
      : null,
    solids_started_pct: null,
  };

  // Check privacy thresholds
  const meetsPrivacyThreshold = activeBabies >= 25;
  const metricCoverage = currentMetrics.metric_coverage;
  
  let finalMetrics = currentMetrics.metrics;
  let fallbackTier: string | null = null;

  // Apply fallback if needed
  if (!meetsPrivacyThreshold || activeBabies < 5) {
    const fallbackResult = applyFallback(
      activeBabies,
      ageInMonths,
      currentMetrics.metrics,
      metricCoverage
    );
    finalMetrics = fallbackResult.metrics;
    fallbackTier = fallbackResult.tier;
    console.log(`Applied fallback tier: ${fallbackTier}`);
  }

  // Generate insight text
  const insightText = generateInsight(
    finalMetrics,
    changes,
    fallbackTier,
    ageInMonths
  );

  return {
    cohort_label: cohortLabel,
    cohort_month: cohortMonth,
    week_start_date: format(weekStart, 'yyyy-MM-dd'),
    week_end_date: format(weekEnd, 'yyyy-MM-dd'),
    metrics: finalMetrics,
    changes,
    active_baby_count: activeBabies,
    metric_coverage: metricCoverage,
    insight_text: insightText,
    fallback_tier: fallbackTier,
  };
}

function countActiveBabies(activities: Activity[], householdIds: string[]): number {
  const householdDays = new Map<string, Set<string>>();
  
  for (const activity of activities) {
    const date = format(new Date(activity.logged_at), 'yyyy-MM-dd');
    if (!householdDays.has(activity.household_id)) {
      householdDays.set(activity.household_id, new Set());
    }
    householdDays.get(activity.household_id)!.add(date);
  }
  
  return Array.from(householdDays.values()).filter(days => days.size >= 3).length;
}

function computeMetrics(activities: Activity[], householdIds: string[]): {
  metrics: CohortMetrics;
  metric_coverage: Record<string, number>;
} {
  const householdMetrics = new Map<string, any>();
  
  // Initialize
  for (const hid of householdIds) {
    householdMetrics.set(hid, {
      nightSleepMinutes: 0,
      napCount: 0,
      dayCount: new Set<string>(),
      feedCount: 0,
      feedVolume: 0,
      hasSolids: false,
    });
  }
  
  // Aggregate per household
  for (const activity of activities) {
    const hm = householdMetrics.get(activity.household_id);
    if (!hm) continue;
    
    const date = format(new Date(activity.logged_at), 'yyyy-MM-dd');
    hm.dayCount.add(date);
    
    if (activity.type === 'nap') {
      let minutes = 0;
      
      // Calculate duration from either duration object or startTime/endTime
      if (activity.details?.duration) {
        const duration = activity.details.duration;
        minutes = duration.hours * 60 + duration.minutes;
      } else if (activity.details?.startTime && activity.details?.endTime) {
        // Parse time strings to calculate duration
        const parseTime = (timeStr: string): number => {
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!match) return 0;
          let hours = parseInt(match[1]);
          const mins = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return hours * 60 + mins;
        };
        
        const startMinutes = parseTime(activity.details.startTime);
        const endMinutes = parseTime(activity.details.endTime);
        
        // Handle overnight sleep (end time < start time)
        if (endMinutes < startMinutes) {
          minutes = (1440 - startMinutes) + endMinutes; // 1440 = 24 hours
        } else {
          minutes = endMinutes - startMinutes;
        }
      }
      
      if (minutes > 0) {
        // Detect night sleep (>6 hours typically)
        if (minutes >= 360) {
          hm.nightSleepMinutes += minutes;
        } else {
          hm.napCount++;
        }
      }
    } else if (activity.type === 'feed') {
      hm.feedCount++;
      if (activity.details?.amount) {
        hm.feedVolume += activity.details.amount;
      }
    } else if (activity.type === 'solids') {
      hm.hasSolids = true;
    }
  }
  
  // Compute per-household medians
  const nightSleepHours: number[] = [];
  const napsPerDay: number[] = [];
  const feedsPerDay: number[] = [];
  const avgFeedVolumes: number[] = [];
  let solidsCount = 0;
  
  for (const [_, hm] of householdMetrics) {
    const days = hm.dayCount.size || 1;
    
    if (hm.nightSleepMinutes > 0) {
      nightSleepHours.push(hm.nightSleepMinutes / 60 / days);
    }
    if (hm.napCount > 0) {
      napsPerDay.push(hm.napCount / days);
    }
    if (hm.feedCount > 0) {
      feedsPerDay.push(hm.feedCount / days);
    }
    if (hm.feedVolume > 0 && hm.feedCount > 0) {
      avgFeedVolumes.push(hm.feedVolume / hm.feedCount);
    }
    if (hm.hasSolids) {
      solidsCount++;
    }
  }
  
  // Calculate cohort medians (with winsorization - remove top/bottom 5%)
  const nightSleep = calculateMedian(winsorize(nightSleepHours));
  const naps = calculateMedian(winsorize(napsPerDay));
  const feeds = calculateMedian(winsorize(feedsPerDay));
  const feedVol = calculateMedian(winsorize(avgFeedVolumes));
  const solidsPct = householdIds.length > 0 ? (solidsCount / householdIds.length) * 100 : null;
  
  // Calculate coverage
  const totalHouseholds = householdIds.length;
  const coverage = {
    night_sleep: nightSleepHours.length / totalHouseholds,
    naps: napsPerDay.length / totalHouseholds,
    feeds: feedsPerDay.length / totalHouseholds,
    feed_volume: avgFeedVolumes.length / totalHouseholds,
  };
  
  return {
    metrics: {
      night_sleep_hours: nightSleep,
      naps_per_day: naps,
      feed_count_per_day: feeds,
      avg_feed_volume: feedVol,
      solids_started_pct: solidsPct,
    },
    metric_coverage: coverage,
  };
}

function winsorize(values: number[]): number[] {
  if (values.length < 20) return values; // Skip for small samples
  
  const sorted = [...values].sort((a, b) => a - b);
  const cutoff = Math.floor(values.length * 0.05);
  return sorted.slice(cutoff, -cutoff);
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  }
  return Number(sorted[mid].toFixed(1));
}

function applyFallback(
  activeBabies: number,
  ageInMonths: number,
  observedMetrics: CohortMetrics,
  coverage: Record<string, number>
): { metrics: CohortMetrics; tier: string } {
  
  const baseline = SEED_BASELINES[Math.min(ageInMonths, 18)] || SEED_BASELINES[18];
  
  // Always return at least seed baseline data
  // Tier 4: Minimal is removed - we always show seed data at minimum
  
  // Tier 1: Seed baseline (1-4 babies)
  if (activeBabies < 5) {
    return {
      metrics: {
        night_sleep_hours: baseline.night_sleep_hours,
        naps_per_day: baseline.naps_per_day,
        feed_count_per_day: baseline.feed_count_per_day,
        avg_feed_volume: null,
        solids_started_pct: ageInMonths >= 4 ? 25 : null,
      },
      tier: 'seed',
    };
  }
  
  // Tier 2: Blended (5-24 babies)
  if (activeBabies < 25) {
    return {
      metrics: {
        night_sleep_hours: observedMetrics.night_sleep_hours && coverage.night_sleep >= 0.6
          ? Number((0.4 * observedMetrics.night_sleep_hours + 0.6 * baseline.night_sleep_hours).toFixed(1))
          : baseline.night_sleep_hours,
        naps_per_day: observedMetrics.naps_per_day && coverage.naps >= 0.6
          ? Number((0.4 * observedMetrics.naps_per_day + 0.6 * baseline.naps_per_day).toFixed(1))
          : baseline.naps_per_day,
        feed_count_per_day: observedMetrics.feed_count_per_day && coverage.feeds >= 0.6
          ? Number((0.4 * observedMetrics.feed_count_per_day + 0.6 * baseline.feed_count_per_day).toFixed(1))
          : baseline.feed_count_per_day,
        avg_feed_volume: observedMetrics.avg_feed_volume,
        solids_started_pct: observedMetrics.solids_started_pct,
      },
      tier: 'blended',
    };
  }
  
  return { metrics: observedMetrics, tier: 'seed' };
}

function generateInsight(
  metrics: CohortMetrics,
  changes: CohortMetrics,
  fallbackTier: string | null,
  ageInMonths: number
): string {
  
  // Tier 4: Minimal copy
  if (fallbackTier === 'minimal') {
    return "Rhythms at this age are settling. We'll share cohort stats as more families join.";
  }
  
  const nightSleep = metrics.night_sleep_hours;
  const naps = metrics.naps_per_day;
  const solidsPct = metrics.solids_started_pct;
  
  // Default insight
  let insight = '';
  
  if (nightSleep && naps) {
    const napRange = naps >= 3 ? '3–4' : naps >= 2 ? '2–3' : '1–2';
    insight = `This week, most babies your baby's age are sleeping about ${nightSleep}h a night and taking ${napRange} naps. `;
  }
  
  // Add milestone context
  if (solidsPct && solidsPct >= 25) {
    insight += 'Many families are starting solids now.';
  } else if (changes.naps_per_day && changes.naps_per_day <= -0.2) {
    insight += 'Many babies are consolidating naps.';
  } else if (changes.night_sleep_hours && changes.night_sleep_hours >= 0.2) {
    insight += 'Overnight stretches nudged a bit longer.';
  } else {
    insight += 'Every baby develops at their own pace.';
  }
  
  return insight.trim();
}
