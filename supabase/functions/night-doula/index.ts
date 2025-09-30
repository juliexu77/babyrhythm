import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { activities, babyName, babyAge } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Generating Night Doula review for", babyName, "with", activities.length, "activities");

    // Organize today's activities
    const today = new Date().toDateString();
    const todayActivities = activities.filter((a: any) => {
      const activityDate = new Date(a.logged_at);
      return activityDate.toDateString() === today;
    });

    const feeds = todayActivities.filter((a: any) => a.type === "feed");
    const naps = todayActivities.filter((a: any) => a.type === "nap" && !a.details?.isNightSleep);
    const diapers = todayActivities.filter((a: any) => a.type === "diaper");
    const notes = todayActivities.filter((a: any) => a.type === "note");

    // Calculate totals
    const totalVolume = feeds.reduce((sum: number, f: any) => {
      const qty = parseFloat(f.details?.quantity || "0");
      return sum + qty;
    }, 0);
    const unit = feeds[0]?.details?.unit || "ml";

    const totalNapTime = naps.reduce((sum: number, n: any) => {
      if (n.details?.startTime && n.details?.endTime) {
        const start = new Date(`1970-01-01 ${n.details.startTime}`);
        const end = new Date(`1970-01-01 ${n.details.endTime}`);
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return sum;
    }, 0);

    // Build context for AI
    const activityContext = `
Today's Summary for ${babyName} (${babyAge} months old):
- Feeds: ${feeds.length} feeds totaling ${Math.round(totalVolume)}${unit}
- Naps: ${naps.length} naps totaling ${Math.floor(totalNapTime / 60)}h ${totalNapTime % 60}m
- Diapers: ${diapers.length} changes${diapers.some((d: any) => d.details?.hasLeak) ? " (including a leak)" : ""}${diapers.some((d: any) => d.details?.note?.toLowerCase().includes("rash")) ? " (redness noted)" : ""}
${notes.length > 0 ? `- Notes: ${notes.map((n: any) => n.details?.content || n.details?.note).join("; ")}` : ""}

Detailed Activity Log:
${todayActivities.slice(0, 15).map((a: any) => {
  const time = new Date(a.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (a.type === "feed") return `${time} - Fed ${a.details?.quantity || ""}${a.details?.unit || ""}${a.details?.isDreamFeed ? " (dream feed)" : ""}`;
  if (a.type === "nap") return `${time} - Nap ${a.details?.startTime || ""} to ${a.details?.endTime || ""}`;
  if (a.type === "diaper") {
    const issues = [];
    if (a.details?.hasLeak) issues.push("leak");
    if (a.details?.note?.toLowerCase().includes("rash")) issues.push("redness");
    return `${time} - Diaper (${a.details?.diaperType || ""})${issues.length > 0 ? ` - ${issues.join(", ")}` : ""}`;
  }
  if (a.type === "note") return `${time} - Note: ${a.details?.content || a.details?.note || ""}`;
  return `${time} - ${a.type}`;
}).join("\n")}
`;

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
            content: `You are a warm, experienced night doula providing an end-of-day summary to a parent. Your tone is supportive, knowledgeable, and reassuring - like a trusted friend who has decades of experience with babies.

Write a natural, conversational summary (3-4 sentences) that:
- Highlights the baby's day in a warm, reassuring way
- Mentions specific patterns you notice in the data (feeding, sleep, etc.)
- References any notes or observations the parent logged
- Provides gentle insights or encouragement based on what you see
- Uses "he/she" naturally but defaults to "they" if gender unclear
- Sounds human and caring, NOT like a data report

CRITICAL: Keep it brief (3-4 sentences max). Be warm but concise. Focus on what matters most to the parent.

Example tone: "${babyName} had 8 feeds today, taking in about 850ml total - right on track. He balanced one solid 2-hour nap with a few shorter stretches, which is typical for his age. Since you mentioned he seemed fussy this afternoon, that makes sense with the shorter evening nap. You're doing a wonderful job reading his cues."` 
          },
          {
            role: "user",
            content: `Write a warm, conversational end-of-day summary based on this data:\n\n${activityContext}`
          }
        ],
        temperature: 0.8,
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
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    console.log("Generated Night Doula review:", generatedText);

    return new Response(JSON.stringify({ review: generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Night Doula error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});