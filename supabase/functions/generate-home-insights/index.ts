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
    const { 
      insightType, 
      activities, 
      babyName, 
      babyAge,
      currentActivity,
      deviation,
      predictions
    } = await req.json();
    
    if (!insightType || !activities || !babyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: insightType, activities, babyName' }),
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

    let prompt = '';
    let systemPrompt = '';
    
    // AI CALL 1: STATUS TIP (Zone 1)
    if (insightType === 'status-tip') {
      systemPrompt = 'You are a supportive baby care assistant who provides brief, encouraging tips. Be warm and concise.';
      prompt = `Current situation:
Baby: ${babyName}, ${babyAge ? `${babyAge} weeks old` : 'age unknown'}
Current activity: ${currentActivity?.type || 'awake'} for ${currentActivity?.duration || '0'} minutes
Status: ${currentActivity?.status || 'on track'} (${currentActivity?.statusDetail || ''})
Next event: ${currentActivity?.nextEvent || 'unknown'} expected in ${currentActivity?.timeUntilNext || 'unknown'}

RULES:
- Write ONE sentence only (under 15 words)
- Be encouraging if on track, gently warning if deviation
- Include emoji if appropriate (🎯, ⚠️, 😴, 🍼, ☀️)
- Sound warm and supportive
- Do NOT use markdown formatting

Examples:
"Right on track for morning rhythm! 🎯"
"Getting close to nap window—watch for sleepy cues"
"Longer nap than usual—great deep sleep! 😴"
"Feed window opening soon"`;
    }
    
    // AI CALL 2: DEVIATION EXPLANATION (Zone 3)
    else if (insightType === 'deviation-explanation') {
      systemPrompt = 'You are a knowledgeable parenting expert who explains baby sleep and feeding patterns in actionable terms.';
      prompt = `Deviation detected:
Baby: ${babyName}, ${babyAge ? `${babyAge} weeks old` : 'age unknown'}
What's different: ${deviation?.description || 'unknown deviation'}
Normal pattern: ${deviation?.normal || 'not specified'}
Today: ${deviation?.actual || 'not specified'}
Other context: ${deviation?.context || 'none'}

RULES:
- Write 3-4 sentences total
- Start with observation
- List 2-3 possible causes (bulleted)
- End with ONE specific action parent can take (start with "💡 Try:")
- Sound helpful and reassuring
- Do NOT use markdown formatting for bold/italic (plain text only)
- You can use bullet points

Example format:
"[Observation about what happened]. This often happens when:
• [Cause 1]
• [Cause 2]  
• [Cause 3]

💡 Try: [Specific actionable suggestion]."`;
    }
    
    // AI CALL 3: SMART ACTION SUGGESTION (Zone 2)
    else if (insightType === 'action-suggestion') {
      systemPrompt = 'You are a helpful assistant who suggests when to log baby activities. Be brief and not nagging.';
      const lastActivities = activities.slice(-5);
      prompt = `Current context:
Baby: ${babyName}, ${babyAge ? `${babyAge} weeks old` : 'age unknown'}
Current time: ${new Date().toLocaleTimeString()}
Last logged activities: ${lastActivities.map((a: Activity) => `${a.type} at ${new Date(a.logged_at).toLocaleTimeString()}`).join(', ')}
Predicted next: ${predictions?.nextActivity || 'unknown'} at ${predictions?.nextTime || 'unknown'}
Time since last ${predictions?.nextActivity || 'activity'}: ${predictions?.timeSince || 'unknown'}

Should we suggest logging an activity right now? Which one and why?

RULES:
- Write ONE sentence nudge text (under 20 words)
- Be helpful, not nagging
- Focus on patterns (e.g., "Usually feeds around now based on 2.5h pattern")
- Do NOT use markdown formatting

Examples:
"Usually feeds around now based on 2.5h pattern"
"Nap window opening—he typically shows sleepy cues soon"
"You haven't logged a feed yet today—did you miss one?"`;
    }
    
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid insightType. Must be: status-tip, deviation-explanation, or action-suggestion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI generation error:', response.status, errorText);
      throw new Error('Failed to generate insight');
    }

    const data = await response.json();
    const insight = data.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-home-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
