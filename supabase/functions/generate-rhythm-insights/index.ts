import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activities, babyName, babyAge, babyBirthday, aiPrediction } = await req.json();
    
    if (!activities || !babyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: activities, babyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze recent data
    const last7Days = activities.filter((a: Activity) => {
      const activityDate = new Date(a.logged_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return activityDate >= sevenDaysAgo;
    });

    const last14Days = activities.filter((a: Activity) => {
      const activityDate = new Date(a.logged_at);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      return activityDate >= fourteenDaysAgo;
    });

    const napsThisWeek = last7Days.filter((a: Activity) => a.type === 'nap').length;
    const napsLastWeek = last14Days.filter((a: Activity) => {
      const activityDate = new Date(a.logged_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      return activityDate >= fourteenDaysAgo && activityDate < sevenDaysAgo && a.type === 'nap';
    }).length;

    // Calculate average naps per day
    const napsPerDayThisWeek = Math.round(napsThisWeek / 7);
    const napsPerDayLastWeek = Math.round(napsLastWeek / 7);

    // Calculate bedtime consistency (standard deviation)
    const bedtimes = last14Days
      .filter((a: Activity) => a.type === 'nap' && a.details?.isNightSleep)
      .map((a: Activity) => {
        const date = new Date(a.logged_at);
        return date.getHours() * 60 + date.getMinutes();
      });

    let bedtimeVariation = 0;
    if (bedtimes.length > 1) {
      const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
      const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / bedtimes.length;
      bedtimeVariation = Math.sqrt(variance);
    }

    // Calculate confidence score
    const dataPoints = last14Days.length;
    let confidenceScore = 'High confidence';
    if (bedtimeVariation < 15 && dataPoints >= 300) {
      confidenceScore = '95% confidence';
    } else if (bedtimeVariation < 25 && dataPoints >= 200) {
      confidenceScore = '90% confidence';
    }

    // Baby age in months
    const ageInMonths = babyBirthday 
      ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null;

    // Extract transition info from AI prediction if available
    const transitionInfo = aiPrediction?.is_transitioning 
      ? `TRANSITION DETECTED: ${aiPrediction.transition_note || 'Baby is transitioning nap counts'}`
      : 'No active transition detected';
    
    const predictedSchedule = aiPrediction 
      ? `Predicted: ${aiPrediction.total_naps_today} naps today, bedtime at ${aiPrediction.predicted_bedtime}`
      : null;

    // CALL 1: Generate Hero Insight
    const heroPrompt = `You are a warm, encouraging baby sleep expert. Based on the data below, write ONE warm, encouraging observation about this baby's sleep progress.

Baby: ${babyName}, ${ageInMonths ? `${ageInMonths} months old` : 'age unknown'}
Naps per day this week: ${napsPerDayThisWeek}
Naps per day last week: ${napsPerDayLastWeek}
Bedtime consistency: ${bedtimeVariation < 15 ? 'very consistent (within 15 min)' : bedtimeVariation < 30 ? 'fairly consistent' : 'variable'}
Data points: ${dataPoints} activities over 2 weeks
${transitionInfo}
${predictedSchedule || ''}

CRITICAL: If there's a transition detected, you MUST acknowledge it in your insight. Do not contradict it.

RULES:
- Start with a relevant emoji (🎉, 💪, 🌟, ✨, 🌙, 🌿, etc.)
- Write 1-2 short sentences (under 40 words total)
- If transitioning, focus on the transition (e.g., "moving to 2 naps")
- If stable, celebrate consistency or progress
- Be specific to the data (mention nap transitions, bedtime consistency, etc.)
- Sound warm and supportive, like talking to a friend
- Do NOT use markdown formatting

Examples:
"🌿 ${babyName}'s transitioning to 2 naps—wake windows are stretching beautifully!"
"🎉 What a star! ${babyName}'s consistent bedtime is a huge win for developing healthy sleep habits. Keep up the great work!"
"💪 ${babyName}'s wake windows are stretching. This is normal at ${ageInMonths} months!"`;

    const heroResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a warm, encouraging baby sleep expert who writes short, supportive observations.' },
          { role: 'user', content: heroPrompt }
        ],
      }),
    });

    if (!heroResponse.ok) {
      const errorText = await heroResponse.text();
      console.error('Hero insight error:', heroResponse.status, errorText);
      throw new Error('Failed to generate hero insight');
    }

    const heroData = await heroResponse.json();
    const heroInsight = heroData.choices[0].message.content.trim();

    // CALL 2: Generate "Why This Matters"
    const whyPrompt = `You are a helpful parenting expert. Based on the data below, explain what this sleep stage means for the parent's daily life.

Baby: ${babyName}, ${ageInMonths ? `${ageInMonths} months old` : 'age unknown'}
Current naps per day: ${napsPerDayThisWeek}
Nap transition: ${napsPerDayLastWeek !== napsPerDayThisWeek ? `shifted from ${napsPerDayLastWeek} to ${napsPerDayThisWeek} naps` : 'stable pattern'}
Bedtime consistency: ${bedtimeVariation < 15 ? 'very consistent' : bedtimeVariation < 30 ? 'fairly consistent' : 'still establishing'}
${transitionInfo}
${predictedSchedule || ''}

CRITICAL: Your explanation MUST align with the transition state. If transitioning, explain what that means. If stable, explain the current pattern.

RULES:
- Write 2-3 sentences (under 50 words total)
- Explain what this means developmentally
- Make it ACTIONABLE - how can parents use this information?
- Focus on practical implications for daily planning
- Sound helpful and specific
- Do NOT use markdown formatting

Examples:
"${babyName}'s stable 3-nap pattern means consistent daily structure. You can reliably plan your outings around predictable wake windows, offering more predictability to your day."
"Moving from 3-4 naps to 2-3 means ${babyName}'s wake windows are stretching. You've got about 3 hours between morning wake and first nap—great for errands!"
"Consistent bedtimes mean ${babyName}'s circadian rhythm is maturing. You can plan evening activities with more confidence."`;

    const whyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful parenting expert who explains sleep patterns in practical, actionable terms.' },
          { role: 'user', content: whyPrompt }
        ],
      }),
    });

    if (!whyResponse.ok) {
      const errorText = await whyResponse.text();
      console.error('Why this matters error:', whyResponse.status, errorText);
      throw new Error('Failed to generate why this matters');
    }

    const whyData = await whyResponse.json();
    const whyThisMatters = whyData.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({
        heroInsight,
        whyThisMatters,
        confidenceScore,
        dataQuality: {
          dataPoints,
          bedtimeVariation: Math.round(bedtimeVariation),
          napsPerDayThisWeek,
          napsPerDayLastWeek,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-rhythm-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
