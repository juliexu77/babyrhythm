import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekData, babyName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare nap data summary for AI analysis
    const napSummary = weekData.map((day: any) => {
      const dayName = day.date === weekData[0].date ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        day: dayName,
        napCount: day.naps.length,
        naps: day.naps.map((nap: any) => ({
          startTime: nap.startTime,
          endTime: nap.endTime,
          durationMinutes: nap.durationMinutes
        }))
      };
    }).reverse(); // Show oldest to newest for pattern analysis

    const prompt = `Analyze this week's nap pattern for ${babyName} and generate ONE SHORT SENTENCE (max 8-10 words) that highlights the most notable pattern or trend.

Nap data (7 days, oldest to newest):
${JSON.stringify(napSummary, null, 2)}

Look for patterns like:
- Consistency or inconsistency in specific naps (morning/afternoon)
- Changes in nap timing (earlier/later)
- Wake window trends (lengthening/shortening between naps)
- Duration patterns (longer/shorter naps)
- Missing naps or schedule shifts

Guidelines:
- Be SPECIFIC, not generic (e.g., "Morning nap shifting 30min later" not "Naps are changing")
- Use casual, conversational tone
- Focus on ONE clear pattern
- Keep it under 10 words
- Don't mention day names unless critical
- Examples: "Morning nap getting more consistent", "Afternoon wake window extending", "Third nap dropping off this week"

Return ONLY the sentence, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a baby sleep pattern analyst. Generate concise, specific insights about nap patterns." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const subtitle = data.choices[0].message.content.trim();

    console.log("Generated rhythm subtitle:", subtitle);

    return new Response(JSON.stringify({ subtitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating rhythm subtitle:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});