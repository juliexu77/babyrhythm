import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domainId, domainLabel, stageName, stageDescription, ageInWeeks, babyName, milestones, supportTips } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const ageInMonths = Math.floor(ageInWeeks / 4.33);
    
    const systemPrompt = `You are a warm, knowledgeable child development expert. Generate a brief, personalized insight for parents about their baby's development. Be encouraging, specific, and actionable. Keep responses under 60 words. Don't use generic phrases like "every baby is different." Focus on one specific, practical observation or tip.`;

    const userPrompt = `Baby: ${babyName || "Baby"}, Age: ${ageInMonths} months
Domain: ${domainLabel}
Current Stage: ${stageName}
Stage Description: ${stageDescription}
Key Milestones: ${milestones?.slice(0, 3).join("; ") || "developing normally"}
Support Tips: ${supportTips?.slice(0, 2).join("; ") || "continue engaging"}

Generate a brief, personalized developmental insight that connects ${babyName || "baby"}'s current ${domainLabel.toLowerCase()} stage to what parents might observe this week.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content?.trim();

    if (!insight) {
      throw new Error("No insight generated");
    }

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-developmental-insight error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate insight" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
