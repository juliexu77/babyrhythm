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

    // Build context from recent activities to analyze trends
    const getUserTimezoneDate = (date: Date, tz: string) => {
      return date.toLocaleDateString('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    
    const userToday = getUserTimezoneDate(new Date(), timezone || 'UTC');
    
    // Get last 7 days of activities for trend analysis
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivities = activities?.filter((a: any) => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= sevenDaysAgo;
    }) || [];
    
    // Group activities by day
    const activitiesByDay: { [key: string]: any[] } = {};
    recentActivities.forEach((a: any) => {
      const activityDate = new Date(a.logged_at);
      const dayKey = getUserTimezoneDate(activityDate, timezone || 'UTC');
      if (!activitiesByDay[dayKey]) {
        activitiesByDay[dayKey] = [];
      }
      activitiesByDay[dayKey].push(a);
    });
    
    // Calculate daily summaries for trend analysis
    const dailySummaries = Object.entries(activitiesByDay).map(([date, dayActivities]) => {
      const feeds = dayActivities.filter(a => a.type === 'feed');
      const naps = dayActivities.filter(a => a.type === 'nap');
      const diapers = dayActivities.filter(a => a.type === 'diaper');
      
      const totalFeedVolume = feeds.reduce((sum, f) => {
        const qty = parseFloat(f.details?.quantity) || 0;
        return sum + qty;
      }, 0);
      
      const totalNapMinutes = naps.reduce((sum, n) => {
        return sum + (n.details?.duration || 0) / 60;
      }, 0);
      
      const avgNapLength = naps.length > 0 ? Math.round(totalNapMinutes / naps.length) : 0;
      
      return {
        date,
        isToday: date === userToday,
        feedCount: feeds.length,
        totalFeedVolume,
        feedUnit: feeds[0]?.details?.unit || 'ml',
        napCount: naps.length,
        totalNapMinutes: Math.round(totalNapMinutes),
        avgNapLength,
        diaperCount: diapers.length
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const metricsContext = `
RECENT ACTIVITY SUMMARY for ${babyName || "baby"} (${babyAge || "unknown"} months old):

${dailySummaries.map(day => `
${day.isToday ? '📅 TODAY' : day.date}:
- Feeds: ${day.feedCount} feeds (${day.totalFeedVolume}${day.feedUnit} total)
- Naps: ${day.napCount} naps (${day.totalNapMinutes} min total, avg ${day.avgNapLength} min each)
- Diapers: ${day.diaperCount} changes
`).join('\n')}

Focus on TRENDS and INSIGHTS:
- Are feeding amounts increasing/decreasing?
- Are nap durations getting longer/shorter?
- Are wake windows lengthening?
- Any concerning patterns or positive developments?
- How do recent days compare?
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
            content: `You are a knowledgeable baby care assistant providing clear, evidence-based guidance to parents and caregivers.

${metricsContext}

CRITICAL INSTRUCTIONS:
- DO NOT list individual activities, times, or feeds - parents can see those in the UI
- Focus ONLY on trends, patterns, changes, and insights across multiple days
- Identify what's changing: "Feeds are consolidating", "Nap lengths are increasing", "Wake windows are stretching"
- Provide interpretation: What does this mean for a ${babyAge}-month-old? Is this expected development?
- Offer actionable guidance based on trends, not individual data points
- Be concise, practical, and supportive - get to the insights quickly
- Keep responses to 3-4 sentences maximum

${isInitial ? "Provide a brief trend analysis. What patterns do you notice over the past few days? What's changing? What guidance would help?" : "Answer their question with trend-focused insights."}` 
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