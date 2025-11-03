import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { recentActivities, todayActivities, babyBirthday } = await req.json();

    if (!recentActivities || !Array.isArray(recentActivities)) {
      return new Response(
        JSON.stringify({ error: 'recentActivities is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      // Only count daytime naps (not night sleep)
      if (activity.type === 'nap' && !isNightTime(new Date(activity.logged_at))) {
        dailyPatterns[date].naps++;
      }
      if (activity.type === 'feed') dailyPatterns[date].feeds++;
      if (activity.type === 'night_sleep' && activity.details?.end_time) {
        dailyPatterns[date].bedtime = new Date(activity.details.end_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
      }
    });

    const dayEntries = Object.entries(dailyPatterns)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    const last7 = dayEntries.slice(-7);
    const patternSummary = last7
      .map(([date, data]) => `${date}: ${data.naps} naps, ${data.feeds} feeds${data.bedtime ? `, bed at ${data.bedtime}` : ''}`)
      .join('\n');
    const last7NapCounts = last7.map(([, data]) => data.naps);
    const napCountsLine = last7NapCounts.join(', ');
    const maxNapCount = last7NapCounts.length ? Math.max(...last7NapCounts) : 0;
    const minNapCount = last7NapCounts.length ? Math.min(...last7NapCounts) : 0;

    // Today's activities summary (exclude night sleep)
    const todayNaps = (todayActivities || [])
      .filter((a: Activity) => a.type === 'nap' && !isNightTime(new Date(a.logged_at)))
      .length;
    const todayFeeds = (todayActivities || []).filter((a: Activity) => a.type === 'feed').length;
    const lastNap = (todayActivities || [])
      .filter((a: Activity) => a.type === 'nap' && !isNightTime(new Date(a.logged_at)))
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

    const prompt = `You are analyzing baby sleep and feeding patterns to predict today's schedule.

Baby age: ${babyAgeMonths ? `${babyAgeMonths} months` : 'Unknown'}

Recent 7-day pattern (DAYTIME NAPS ONLY, excluding night sleep):
${patternSummary}

Last 7 days DAYTIME nap counts: ${napCountsLine}
Typical DAYTIME nap range (last 7): ${minNapCount}–${maxNapCount}

Today so far (current time: ${currentTime}):
- ${todayNaps} DAYTIME nap${todayNaps !== 1 ? 's' : ''} logged (not including night sleep)
- ${todayFeeds} feed${todayFeeds !== 1 ? 's' : ''} logged
${lastNap ? `- Last nap duration: ${lastNapDuration} minutes` : ''}

CRITICAL: All nap counts refer to DAYTIME naps only (before 8pm, after 6am). Do NOT count night sleep as naps.

Strict rules:
- Only analyze DAYTIME naps (6am-8pm). Night sleep is tracked separately.
- Do NOT mention a transition from 4 to 3 naps unless the last 7 days include a day with 4+ DAYTIME naps.
- Align all claims with the provided nap counts; do not infer unseen nap numbers.
- If nap counts vary between 2 and 3 without 4, describe it as stabilizing between 2–3 naps (not 4→3).

Analyze:
1. Is baby transitioning DAYTIME nap counts? (e.g., some days 3 naps, some days 2)
2. Based on today's activities so far, how many MORE DAYTIME naps are expected?
3. What's the total expected DAYTIME nap count for today?
4. How many total feeds expected today?
5. Predicted bedtime?
6. Confidence level (high/medium/low) and why?

Provide a prediction for the REST OF TODAY based on what's already logged.`;

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
              name: 'predict_schedule',
              description: 'Predict remaining schedule for today',
              parameters: {
                type: 'object',
                properties: {
                  total_naps_today: {
                    type: 'number',
                    description: 'Total expected naps for the full day (including already logged)'
                  },
                  remaining_naps: {
                    type: 'number',
                    description: 'How many more naps expected after current time'
                  },
                  total_feeds_today: {
                    type: 'number',
                    description: 'Total expected feeds for the full day (including already logged)'
                  },
                  predicted_bedtime: {
                    type: 'string',
                    description: 'Predicted bedtime in format like "7:30 PM"'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level in this prediction'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the prediction (max 2 sentences)'
                  },
                  is_transitioning: {
                    type: 'boolean',
                    description: 'Is baby transitioning between nap counts?'
                  },
                  transition_note: {
                    type: 'string',
                    description: 'If transitioning, explain the pattern (e.g., "Moving from 3 to 2 naps")'
                  }
                },
                required: [
                  'total_naps_today',
                  'remaining_naps',
                  'total_feeds_today',
                  'predicted_bedtime',
                  'confidence',
                  'reasoning',
                  'is_transitioning'
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'predict_schedule' } }
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

    return new Response(
      JSON.stringify(prediction),
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
