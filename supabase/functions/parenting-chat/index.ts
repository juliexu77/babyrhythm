import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, activities, babyName, babyAge, timezone, isInitial } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Timezone received:", timezone);
    console.log("Is initial request:", isInitial);
    console.log("Total activities received:", activities?.length || 0);

    // Build context from today's activities using the user's timezone
    const now = new Date();
    const todayActivities = activities?.filter((a: any) => {
      const activityDate = new Date(a.logged_at);
      return activityDate.toDateString() === now.toDateString();
    }) || [];

    console.log("Today's activities count:", todayActivities.length);

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: timezone || 'UTC'
      });
    };

    // Sort activities by time
    const sortedActivities = [...todayActivities].sort((a, b) => 
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );

    // Calculate detailed metrics
    const feeds = sortedActivities.filter(a => a.type === 'feed');
    const naps = sortedActivities.filter(a => a.type === 'nap');
    const diapers = sortedActivities.filter(a => a.type === 'diaper');
    
    // Total feed volume
    const totalFeedVolume = feeds.reduce((sum, f) => {
      const qty = parseFloat(f.details?.quantity) || 0;
      return sum + qty;
    }, 0);
    const feedUnit = feeds[0]?.details?.unit || 'ml';

    // Total nap time
    const totalNapMinutes = naps.reduce((sum, n) => {
      return sum + (n.details?.duration || 0) / 60;
    }, 0);

    // Wake windows
    const wakeWindows = [];
    for (let i = 0; i < naps.length; i++) {
      if (i === 0 && naps[i]) {
        // First wake window (from assumed wake up to first nap)
        const firstNapTime = new Date(naps[i].logged_at);
        wakeWindows.push({
          index: 1,
          duration: "morning wake window"
        });
      }
      if (i < naps.length - 1) {
        const napEnd = new Date(naps[i].logged_at).getTime() + (naps[i].details?.duration || 0) * 1000;
        const nextNapStart = new Date(naps[i + 1].logged_at).getTime();
        const windowMinutes = (nextNapStart - napEnd) / (1000 * 60);
        wakeWindows.push({
          index: i + 2,
          duration: Math.round(windowMinutes)
        });
      }
    }

    // Build detailed activity log
    const activityLog = sortedActivities.map((a: any) => {
      const time = formatTime(a.logged_at);
      if (a.type === "feed") {
        const qty = a.details?.quantity || "";
        const unit = a.details?.unit || "";
        const side = a.details?.feedSide ? ` (${a.details.feedSide})` : "";
        return `${time}: Fed ${qty}${unit}${side}`;
      }
      if (a.type === "nap") {
        const duration = a.details?.duration ? Math.round(a.details.duration / 60) : 0;
        return `${time}: Nap (${duration} minutes)`;
      }
      if (a.type === "diaper") {
        return `${time}: Diaper change (${a.details?.diaperType || ""})`;
      }
      if (a.type === "note") {
        return `${time}: Note - ${a.details?.note || ""}`;
      }
      return `${time}: ${a.type}`;
    }).join("\n");

    const metricsContext = `
TODAY'S DETAILED SUMMARY for ${babyName || "baby"} (${babyAge || "unknown"} months old):

📊 TOTALS:
- Feeds: ${feeds.length} (${totalFeedVolume}${feedUnit} total)
- Naps: ${naps.length} (${Math.round(totalNapMinutes)} minutes total)
- Diapers: ${diapers.length} changes
${wakeWindows.length > 0 ? `- Wake windows: ${wakeWindows.map(w => w.duration === "morning wake window" ? w.duration : `${w.duration} min`).join(", ")}` : ""}

📝 CHRONOLOGICAL LOG:
${activityLog || "No activities logged yet today."}
`;

    console.log("Metrics context generated:", metricsContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are a caring, knowledgeable baby care assistant - warm, comforting, and expert in infant care. You're here to help parents feel confident and successful.

${metricsContext}

IMPORTANT GUIDELINES:
- Reference specific numbers and patterns from the data above (feed amounts, nap durations, wake windows)
- When giving summaries, be thorough - mention ALL feeds with amounts, ALL naps with durations, wake windows between naps
- Be warm and reassuring, acknowledging the parents' or caregivers' efforts
- Notice patterns like "the wake windows are getting longer" or "feeds are consistent every 3 hours"
- For age ${babyAge} months, mention if things are typical/expected or if adjustments might help
- For medical concerns, recommend consulting their pediatrician while offering general guidance
- Use the baby's name (${babyName}) naturally in conversation

${isInitial ? "This is the first message - provide a DETAILED daily summary. Include: total feeds with volume, each individual nap duration, wake windows, diaper changes, and any patterns you notice. Be thorough but conversational - parents want the full picture. Keep it to 4-6 sentences." : "Provide personalized advice based on their question and the detailed activity data above."}` 
          },
          ...messages,
        ],
        stream: true,
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});