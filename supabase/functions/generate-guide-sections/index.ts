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
}

interface Insight {
  type: string;
  delta: string;
  rawValue?: number;
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

    // Calculate metrics and deltas
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const recentActivities = activities.filter(a => new Date(a.logged_at) >= threeDaysAgo);
    const previousActivities = activities.filter(a => {
      const d = new Date(a.logged_at);
      return d >= sixDaysAgo && d < threeDaysAgo;
    });

    const recentMetrics = calculateMetrics(recentActivities);
    const previousMetrics = calculateMetrics(previousActivities);

    const deltas = computeDeltas(recentMetrics, previousMetrics);
    const insights = extractInsights(deltas, ageMonths);

    const dataQuality = calculateDataQuality(recentActivities);

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
        metrics: deltas.map(d => ({
          name: d.name,
          change: d.change
        })),
        note: dataQuality < 0.6 
          ? "Data incomplete — trends may be approximate. Comparing to the last 3 days."
          : "Comparing to the last 3 days"
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

function calculateMetrics(activities: Activity[]) {
  const sleepActivities = activities.filter(a => a.type === 'nap');
  const feedActivities = activities.filter(a => a.type === 'feed');
  
  // Calculate nap durations from start/end times
  const totalSleepMinutes = sleepActivities.reduce((sum, a) => {
    if (a.details?.duration) {
      return sum + parseInt(a.details.duration);
    }
    // Calculate from startTime and endTime if available
    if (a.details?.startTime && a.details?.endTime) {
      const start = new Date(`1970-01-01 ${a.details.startTime}`);
      const end = new Date(`1970-01-01 ${a.details.endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      // Handle overnight naps (end < start)
      if (diff < 0) diff += 24 * 60;
      return sum + diff;
    }
    return sum;
  }, 0);
  
  const napCount = sleepActivities.length;
  
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
    
    // Calculate current nap duration
    let currentDuration = 0;
    if (current.details?.duration) {
      currentDuration = parseInt(current.details.duration);
    } else if (current.details?.startTime && current.details?.endTime) {
      const start = new Date(`1970-01-01 ${current.details.startTime}`);
      const end = new Date(`1970-01-01 ${current.details.endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      if (diff < 0) diff += 24 * 60;
      currentDuration = diff;
    }
    
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
    napCount,
    totalFeedVolume,
    feedCount,
    avgWakeWindow
  };
}

function computeDeltas(recent: any, previous: any): MetricDelta[] {
  const deltas: MetricDelta[] = [];

  // Total sleep delta
  const sleepDelta = recent.totalSleepMinutes - previous.totalSleepMinutes;
  if (Math.abs(sleepDelta) >= 15) {
    const hours = Math.floor(Math.abs(sleepDelta) / 60);
    const mins = Math.round(Math.abs(sleepDelta) % 60 / 5) * 5;
    deltas.push({
      name: 'Total sleep',
      change: `${sleepDelta > 0 ? '+' : '-'}${hours}h ${mins}m`,
      rawDelta: sleepDelta
    });
  }

  // Feed volume delta
  if (previous.totalFeedVolume > 0) {
    const feedPercent = ((recent.totalFeedVolume - previous.totalFeedVolume) / previous.totalFeedVolume) * 100;
    if (Math.abs(feedPercent) >= 5) {
      deltas.push({
        name: 'Feed volume',
        change: `${feedPercent > 0 ? '+' : ''}${Math.round(feedPercent / 5) * 5}%`,
        rawDelta: feedPercent
      });
    }
  }

  // Wake window delta
  const wakeDelta = recent.avgWakeWindow - previous.avgWakeWindow;
  if (Math.abs(wakeDelta) >= 15) {
    const mins = Math.round(Math.abs(wakeDelta) / 5) * 5;
    deltas.push({
      name: 'Wake average',
      change: `${wakeDelta > 0 ? '+' : '-'}${mins}m`,
      rawDelta: wakeDelta
    });
  }

  return deltas;
}

function extractInsights(deltas: MetricDelta[], ageMonths: number): Insight[] {
  const insights: Insight[] = [];

  for (const delta of deltas) {
    if (delta.name === 'Feed volume' && delta.rawDelta && delta.rawDelta < -5) {
      insights.push({
        type: 'feed_volume_down',
        delta: delta.change,
        rawValue: delta.rawDelta
      });
    }
    if (delta.name === 'Wake average' && delta.rawDelta && Math.abs(delta.rawDelta) >= 30) {
      insights.push({
        type: delta.rawDelta > 0 ? 'wake_window_increase' : 'wake_window_decrease',
        delta: delta.change,
        rawValue: delta.rawDelta
      });
    }
    if (delta.name === 'Total sleep' && delta.rawDelta && Math.abs(delta.rawDelta) >= 60) {
      insights.push({
        type: delta.rawDelta > 0 ? 'sleep_increase' : 'sleep_decrease',
        delta: delta.change,
        rawValue: delta.rawDelta
      });
    }
  }

  return insights.slice(0, 3); // Top 3 insights
}

function calculateDataQuality(activities: Activity[]): number {
  // Simple heuristic: based on number of logs per day
  const daysSpan = 3;
  const expectedLogsPerDay = 8; // feeds + naps + diapers
  const actualLogs = activities.length;
  const quality = Math.min(actualLogs / (daysSpan * expectedLogsPerDay), 1.0);
  return Math.round(quality * 100) / 100;
}

async function generateGuideSections(apiKey: string, payload: any, dataQuality: number) {
  const systemPrompt = `You are a baby care guidance system. Generate concise, factual, parent-friendly insights based on activity data.

Voice: warm professional, concise, anticipatory. Avoid therapy or medical framing.
Rules:
- Each bullet under 18 words
- Use "try", "keep", "offer" instead of imperatives
- If data quality < 0.6, soften verbs to "consider"
- No more than 3 bullets per section`;

  const userPrompt = `Based on this baby activity data, generate guidance sections:

Age: ${payload.age}
Current tone: ${payload.tone_chip} (streak: ${payload.streak_length} days)
Data quality: ${(payload.data_quality * 100).toFixed(0)}%

Recent changes:
${payload.metrics.map((m: MetricDelta) => `- ${m.name}: ${m.change}`).join('\n')}

Key insights:
${payload.insights.map((i: Insight) => `- ${i.type}: ${i.delta}`).join('\n')}

Generate:
1. "what_to_know": 2-3 factual bullets explaining what's happening
2. "what_to_do": 2-3 actionable steps (use softened language if data quality < 60%)
3. "whats_next": One forecast sentence (≤22 words) about likely progression
4. "prep_tip": One concrete tip (≤16 words)

Return ONLY valid JSON with these four keys.`;

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
