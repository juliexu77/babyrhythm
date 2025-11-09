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
    const { 
      feedCount, 
      napCount, 
      totalNapMinutes, 
      hadSolidFood,
      solidFoodNote,
      longestWakeWindow,
      specialMoments,
      babyName 
    } = await req.json();

    console.log('📖 Generating story headline:', { 
      feedCount, 
      napCount, 
      totalNapMinutes, 
      hadSolidFood,
      solidFoodNote,
      longestWakeWindow,
      specialMomentsCount: specialMoments?.length || 0,
      babyName 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const totalNapHours = Math.floor(totalNapMinutes / 60);
    const totalNapMins = Math.round(totalNapMinutes % 60);
    
    let context = `Today, ${babyName || 'baby'} had:\n`;
    context += `- ${feedCount} feeds\n`;
    context += `- ${napCount} naps totaling ${totalNapHours}h ${totalNapMins}m\n`;
    
    if (hadSolidFood && solidFoodNote) {
      context += `- First taste of solid food: ${solidFoodNote}\n`;
    } else if (hadSolidFood) {
      context += `- Had solid food today\n`;
    }
    
    if (longestWakeWindow) {
      context += `- Longest wake window: ${longestWakeWindow}\n`;
    }
    
    if (specialMoments && specialMoments.length > 0) {
      context += `- Special moments: ${specialMoments.join(', ')}\n`;
    }

    const systemPrompt = `You are a poetic storyteller for parents. Analyze a baby's day and provide a meaningful headline and icon.

Style guidelines for headline:
- Poetic, gentle, and emotionally resonant (max 15 words)
- Use soft, lyrical language
- Focus on rhythm, balance, and growth
- Avoid clichés and overly sentimental phrases

For the icon, choose ONE Lucide icon name that best represents the essence of the day:
- Use specific icons based on activities (e.g., "Carrot" if ate carrots, "Apple" if ate apples)
- Use "Moon" for sleep-heavy days
- Use "Baby" or "Milk" for feeding focus
- Use "Sun" for active, playful days
- Use "Heart" for bonding moments
- Use "Sparkles" for milestone days
- Use "Camera" if photos were taken
- Return null if no icon fits

You must respond with valid JSON in this exact format:
{"headline": "your headline here", "icon": "IconName"}

Valid icon examples: "Carrot", "Apple", "Moon", "Baby", "Milk", "Sun", "Heart", "Sparkles", "Camera", "Smile", "Banana", "Cookie"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this day and provide headline + icon:\n\n${context}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: "Rate limits exceeded, using fallback headline" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: "Payment required, using fallback headline" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    try {
      const parsed = JSON.parse(content);
      const headline = parsed.headline || "";
      const icon = parsed.icon || null;
      
      console.log('✅ Generated story:', { headline, icon });

      return new Response(JSON.stringify({ headline, icon }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      console.warn('Failed to parse AI response as JSON, using content as headline:', parseError);
      return new Response(JSON.stringify({ headline: content, icon: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error('Error in generate-story-headline:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
