import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recentActivities, todayActivities, babyBirthday, householdId, timezone } = await req.json();

    if (!recentActivities || !Array.isArray(recentActivities)) {
      return new Response(
        JSON.stringify({ error: 'recentActivities is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!householdId || !timezone) {
      return new Response(
        JSON.stringify({ error: 'householdId and timezone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Helper function to calculate accuracy
    const calculateAccuracy = (predictedSchedule: any, actualActivities: Activity[]): number => {
      if (!predictedSchedule?.events || predictedSchedule.events.length === 0) return 0;
      if (actualActivities.length === 0) return 0;

      let correctPredictions = 0;
      let totalPredictions = 0;

      predictedSchedule.events.forEach((event: any) => {
        if (event.type === 'nap' || event.type === 'feed') {
          totalPredictions++;
          const predictedMinutes = parseTimeToMinutes(event.time);
          
          // Find matching actual activity within ±30 minutes
          const match = actualActivities.find(actual => {
            if (actual.type !== event.type) return false;
            const actualDate = new Date(actual.logged_at);
            const actualMinutes = actualDate.getHours() * 60 + actualDate.getMinutes();
            return Math.abs(actualMinutes - predictedMinutes) <= 30;
          });

          if (match) correctPredictions++;
        }
      });

      return totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
    };

    const parseTimeToMinutes = (timeStr?: string): number => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    // Get today's date in the user's timezone
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD format
    const currentHourNum = parseInt(new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }));

    console.log(`🔍 Checking for existing prediction for ${todayDate}, current hour: ${currentHourNum}`);

    // Check if we already have a prediction for today
    const { data: existingPrediction, error: fetchError } = await supabaseClient
      .from('daily_schedule_predictions')
      .select('*')
      .eq('household_id', householdId)
      .eq('prediction_date', todayDate)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing prediction:', fetchError);
    }

    // If we have a prediction and it's not yet 5am, calculate accuracy and return it
    if (existingPrediction && currentHourNum < 5) {
      console.log('📊 Existing prediction found, calculating accuracy...');
      
      const accuracy = calculateAccuracy(existingPrediction.predicted_schedule, todayActivities || []);
      
      // Update accuracy in database
      await supabaseClient
        .from('daily_schedule_predictions')
        .update({
          accuracy_score: accuracy,
          last_accuracy_check: new Date().toISOString()
        })
        .eq('id', existingPrediction.id);

      console.log(`✅ Returning cached prediction with ${accuracy}% accuracy`);
      
      return new Response(
        JSON.stringify({
          ...existingPrediction.predicted_schedule,
          accuracyScore: accuracy,
          lastUpdated: existingPrediction.generated_at,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new prediction (either no existing prediction or it's past 5am)
    console.log('🔮 Generating new prediction...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate baby age
    const babyAgeMonths = babyBirthday 
      ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null;

    // Analyze recent patterns
    const last14Days = recentActivities.filter((a: Activity) => {
      const activityDate = new Date(a.logged_at);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      return activityDate >= fourteenDaysAgo;
    });

    // Helper to detect night sleep (8pm to 6am)
    const isNightTime = (date: Date): boolean => {
      const hour = date.getHours();
      return hour >= 20 || hour < 6;
    };

    // Group by day to see nap patterns (exclude night sleep)
    const dailyPatterns: { [key: string]: { naps: number; feeds: number; bedtime?: string } } = {};
    last14Days.forEach((activity: Activity) => {
      const date = new Date(activity.logged_at).toDateString();
      if (!dailyPatterns[date]) {
        dailyPatterns[date] = { naps: 0, feeds: 0 };
      }
      // Only count daytime naps (exclude night sleep by flag)
      if (activity.type === 'nap' && !activity.details?.isNightSleep) {
        dailyPatterns[date].naps++;
      }
      if (activity.type === 'feed') dailyPatterns[date].feeds++;
      // Note: Bedtime calculation removed - handled by adaptive schedule generator on client
    });

    const dayEntries = Object.entries(dailyPatterns)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    const last7 = dayEntries.slice(-7);
    const patternSummary = last7
      .map(([date, data]) => `${date}: ${data.naps} naps, ${data.feeds} feeds`)
      .join('\n');
    const last7NapCounts = last7.map(([, data]) => data.naps);
    const napCountsLine = last7NapCounts.join(', ');
    const maxNapCount = last7NapCounts.length ? Math.max(...last7NapCounts) : 0;
    const minNapCount = last7NapCounts.length ? Math.min(...last7NapCounts) : 0;

    // Today's activities summary (exclude night sleep)
    const todayNaps = (todayActivities || [])
      .filter((a: Activity) => a.type === 'nap' && !a.details?.isNightSleep)
      .length;
    const todayFeeds = (todayActivities || []).filter((a: Activity) => a.type === 'feed').length;
    const lastNap = (todayActivities || [])
      .filter((a: Activity) => a.type === 'nap' && !a.details?.isNightSleep)
      .sort((a: Activity, b: Activity) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];

    // Robust last-nap duration in minutes
    const parseDurationToMinutes = (s?: string): number => {
      if (!s) return 0;
      let mins = 0;
      const h = s.match(/(\d+)\s*h/i);
      const m = s.match(/(\d+)\s*m/i);
      if (h) mins += parseInt(h[1], 10) * 60;
      if (m) mins += parseInt(m[1], 10);
      return mins;
    };
    // Removed parseTimeToMinutes - now defined earlier in the function
    let lastNapDuration = 0;
    if (lastNap) {
      const dm = typeof lastNap.details?.duration_minutes === 'number' ? lastNap.details.duration_minutes
        : (typeof lastNap.details?.durationMinutes === 'number' ? lastNap.details.durationMinutes : undefined);
      if (typeof dm === 'number') {
        lastNapDuration = dm;
      } else {
        const fromString = parseDurationToMinutes(lastNap.details?.duration);
        if (fromString > 0) {
          lastNapDuration = fromString;
        } else {
          const start = parseTimeToMinutes(lastNap.details?.startTime);
          const end = parseTimeToMinutes(lastNap.details?.endTime);
          if (start && end) {
            let diff = end - start;
            if (diff < 0) diff += 24 * 60;
            lastNapDuration = diff;
          }
        }
      }
    }
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const currentHour = new Date().getHours();
    const isEarlyMorning = currentHour < 12;

    // Get today's wake time to help determine pattern
    const todayWake = (todayActivities || [])
      .find((a: Activity) => a.type === 'nap' && a.details?.isNightSleep && a.details?.endTime);
    const wakeTimeStr = todayWake?.details?.endTime || 'unknown';
    
    // Parse wake time to determine if it's early (before 8am) or later
    let wakeHour = -1;
    if (wakeTimeStr !== 'unknown') {
      const match = wakeTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        wakeHour = parseInt(match[1], 10);
        const period = match[3].toUpperCase();
        if (period === 'PM' && wakeHour !== 12) wakeHour += 12;
        if (period === 'AM' && wakeHour === 12) wakeHour = 0;
      }
    }

    const prompt = `You are a baby sleep pattern analyst. Your job is HIGH-LEVEL pattern recognition only.
The detailed schedule timing will be calculated separately by the adaptive schedule generator.

Baby age: ${babyAgeMonths ? `${babyAgeMonths} months` : 'Unknown'}

Recent 7-day pattern (DAYTIME NAPS ONLY):
${patternSummary}

Last 7 days nap counts: ${napCountsLine}
Range: ${minNapCount}–${maxNapCount} naps

TODAY'S ACTUAL DATA (${currentTime}):
- Wake time: ${wakeTimeStr}${wakeHour >= 0 && wakeHour < 8 ? ' (EARLY wake - typically indicates multi-nap day)' : ''}
- ${todayNaps} nap${todayNaps !== 1 ? 's' : ''} logged so far
- ${todayFeeds} feed${todayFeeds !== 1 ? 's' : ''} logged
${lastNap ? `- Last nap ended: ${new Date(lastNap.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${lastNapDuration} min duration)` : ''}
${isEarlyMorning ? '\nNote: It is still early in the day - more naps are expected later.' : ''}

CRITICAL PREDICTION RULES (IN ORDER OF PRIORITY):
1. TODAY'S ACTUAL TIMING IS THE STRONGEST SIGNAL:
   - If wake time is before 8am AND first nap happened before 11am with 60+ min duration → almost certainly a 2+ nap day
   - If first nap started after 11am → likely a 1-nap day
   - Early wake + early first nap = baby isn't building pressure for a single long nap

2. Use historical pattern as SECONDARY signal:
   - Predict the most common nap count from last 7 days UNLESS today's timing contradicts it
   - Only predict transition if 3+ consecutive days show new pattern

3. Do NOT predict developmental "should be" patterns - predict what TODAY'S DATA + HISTORY shows

Your task: Analyze the high-level pattern combining TODAY'S ACTUAL TIMING with historical data.

Answer these questions:
1. What is the expected TOTAL nap count for today? (including already logged naps)
2. Is the baby transitioning between nap schedules?
3. What's your confidence level (high/medium/low)?
4. Brief reasoning referencing TODAY'S timing and historical pattern

Rules:
- TODAY'S WAKE TIME + FIRST NAP TIMING is the primary signal, historical pattern is secondary
- Only analyze DAYTIME naps (6am-8pm). Night sleep tracked separately.
- If today shows early wake + early first nap, don't force it into a 1-nap prediction just because history shows 1-nap days
- ALWAYS explain your reasoning with reference to today's actual timing
`;

    console.log('Calling Lovable AI for schedule prediction...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a baby sleep and feeding pattern expert. Analyze patterns and make predictions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_schedule_pattern',
              description: 'High-level pattern analysis only - do not calculate specific times',
              parameters: {
                type: 'object',
                properties: {
                  total_naps_today: {
                    type: 'number',
                    description: 'Total expected daytime naps for the full day (including already logged)'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level based on pattern consistency'
                  },
                  is_transitioning: {
                    type: 'boolean',
                    description: 'Is baby transitioning between nap schedules?'
                  },
                  transition_note: {
                    type: 'string',
                    description: `If transitioning, write ONE warm, encouraging sentence (max 12 words) about the PATTERN TRANSITION (e.g., from 3→2 naps), NOT about today's current nap count. ${isEarlyMorning ? 'Since it is early in the day, focus only on the multi-day pattern change, not today\'s progress.' : ''} Use baby name. Examples: "Caleb is beautifully moving toward 2 naps—this is perfect" or "Emma is naturally consolidating to 2 naps, right on track"`
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the pattern observed (1-2 sentences)'
                  }
                },
                required: [
                  'total_naps_today',
                  'confidence',
                  'is_transitioning',
                  'reasoning'
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_schedule_pattern' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI prediction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prediction = JSON.parse(toolCall.function.arguments);

    // Store the prediction in the database
    const { error: upsertError } = await supabaseClient
      .from('daily_schedule_predictions')
      .upsert({
        household_id: householdId,
        prediction_date: todayDate,
        predicted_schedule: prediction,
        generated_at: new Date().toISOString()
      }, {
        onConflict: 'household_id,prediction_date'
      });

    if (upsertError) {
      console.error('Error storing prediction:', upsertError);
    } else {
      console.log('✅ Prediction stored successfully');
    }

    return new Response(
      JSON.stringify({
        ...prediction,
        lastUpdated: new Date().toISOString(),
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in predict-daily-schedule:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
