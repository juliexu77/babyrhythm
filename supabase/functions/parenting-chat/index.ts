import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, activities, babyName, babyAgeInWeeks, timezone, isInitial, userName, predictionIntent, predictionConfidence } = await req.json();
    console.log('Edge function received:', { babyName, babyAgeInWeeks, timezone, isInitial, userName, predictionIntent, activitiesCount: activities?.length });
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Timezone received:", timezone);
    console.log("Is initial request:", isInitial);
    console.log("Total activities received:", activities?.length || 0);

    // Build context from recent activities to analyze trends
    const getUserTzDayKey = (date: Date, tz: string) => {
      // ISO-style day key that's safe for sorting (YYYY-MM-DD)
      return date.toLocaleDateString('en-CA', { timeZone: tz || 'UTC' });
    };
    
    const userToday = getUserTzDayKey(new Date(), timezone || 'UTC');
    
    // Get last 7 days of activities for trend analysis
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivities = activities?.filter((a: any) => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= sevenDaysAgo;
    }) || [];
    
    // Group activities by day (in user's timezone)
    const activitiesByDay: { [key: string]: any[] } = {};
    recentActivities.forEach((a: any) => {
      const activityDate = new Date(a.logged_at);
      const dayKey = getUserTzDayKey(activityDate, timezone || 'UTC');
      if (!activitiesByDay[dayKey]) activitiesByDay[dayKey] = [];
      activitiesByDay[dayKey].push(a);
    });
    
    
    // Helper to calculate nap duration from start/end times
    const calculateNapDuration = (startTime: string, endTime: string): number => {
      try {
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let totalMinutes = minutes;
          let adjustedHours = hours;
          
          if (period === 'PM' && hours !== 12) {
            adjustedHours += 12;
          } else if (period === 'AM' && hours === 12) {
            adjustedHours = 0;
          }
          
          totalMinutes += adjustedHours * 60;
          return totalMinutes;
        };

        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);
        
        let durationMinutes = endMinutes - startMinutes;
        
        // Handle case where nap goes past midnight
        if (durationMinutes < 0) {
          durationMinutes += 24 * 60;
        }
        
        return durationMinutes;
      } catch (error) {
        console.error("Error calculating nap duration:", error);
        return 0;
      }
    };
    
    const parseTimeToMinutes = (timeStr: string): number => {
      try {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let adjustedHours = hours;
        
        if (period === 'PM' && hours !== 12) {
          adjustedHours += 12;
        } else if (period === 'AM' && hours === 12) {
          adjustedHours = 0;
        }
        
        return adjustedHours * 60 + minutes;
      } catch {
        return 0;
      }
    };
    
    // Calculate daily summaries for trend analysis
    const dailySummaries = Object.entries(activitiesByDay).map(([date, dayActivities]) => {
      const feeds = dayActivities.filter(a => a.type === 'feed');
      const naps = dayActivities.filter(a => a.type === 'nap' && a.details?.startTime && a.details?.endTime)
        .sort((a, b) => parseTimeToMinutes(a.details.startTime!) - parseTimeToMinutes(b.details.startTime!));
      const diapers = dayActivities.filter(a => a.type === 'diaper');
      
      const totalFeedVolume = feeds.reduce((sum, f) => sum + (parseFloat(f.details?.quantity) || 0), 0);
      
      // Calculate nap details with timing
      const napDetails = naps.map((n, idx) => {
        const duration = calculateNapDuration(n.details.startTime!, n.details.endTime!);
        const startMinutes = parseTimeToMinutes(n.details.startTime!);
        
        let timeOfDay = 'evening';
        if (startMinutes < 12 * 60) {
          timeOfDay = 'morning';
        } else if (startMinutes < 17 * 60) {
          timeOfDay = 'afternoon';
        }
        
        return {
          index: idx + 1,
          duration,
          timeOfDay,
          startTime: n.details.startTime
        };
      });
      
      const totalNapMinutes = napDetails.reduce((sum, n) => sum + n.duration, 0);
      const avgNapLength = napDetails.length > 0 ? Math.round(totalNapMinutes / napDetails.length) : 0;
      
      // Calculate wake windows
      const wakeWindows = [];
      for (let i = 0; i < naps.length - 1; i++) {
        const napEnd = parseTimeToMinutes(naps[i].details.endTime!);
        const nextNapStart = parseTimeToMinutes(naps[i + 1].details.startTime!);
        let wakeWindow = nextNapStart - napEnd;
        if (wakeWindow < 0) wakeWindow += 24 * 60; // Handle midnight crossing
        wakeWindows.push(Math.round(wakeWindow));
      }
      
      const avgWakeWindow = wakeWindows.length > 0 ? Math.round(wakeWindows.reduce((a, b) => a + b, 0) / wakeWindows.length) : 0;
      
      return {
        date, // ISO day key
        isToday: date === userToday,
        feedCount: feeds.length,
        totalFeedVolume,
        feedUnit: feeds[0]?.details?.unit || 'ml',
        napCount: naps.length,
        napDetails,
        totalNapMinutes: Math.round(totalNapMinutes),
        avgNapLength,
        wakeWindows,
        avgWakeWindow,
        diaperCount: diapers.length
      };
    }).sort((a, b) => a.date.localeCompare(b.date));


    console.log("Daily summaries:", JSON.stringify(dailySummaries));

    // Helper to format duration in hours and minutes
    const formatDuration = (minutes: number): string => {
      if (minutes < 60) return `${minutes}min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };
    
    // Calculate age in months for developmental context
    const ageInMonths = Math.floor((babyAgeInWeeks || 0) / 4.33);
    
    // Determine developmental phase
    let developmentalPhase = "newborn adjusting phase";
    if (ageInMonths >= 12) developmentalPhase = "toddler independence phase";
    else if (ageInMonths >= 9) developmentalPhase = "mobile exploration phase";
    else if (ageInMonths >= 6) developmentalPhase = "curious, exploratory phase";
    else if (ageInMonths >= 3) developmentalPhase = "social awakening phase";
    
    // Build rich context payload - "The Village's awareness"
    const villageContext = `
🌿 THE QUIET VILLAGE — Context Snapshot

BABY PROFILE:
- Name: ${babyName || "Baby"}
- Age: ${babyAgeInWeeks || "unknown"} weeks (${ageInMonths} months) — ${developmentalPhase}

CAREGIVER:
- Name: ${userName || "Parent"}
- Logging consistency: ${dailySummaries.length > 0 ? `${dailySummaries.length} days tracked` : "Just starting"}
- Current observation: ${isInitial ? "Opening Guide for insights" : "Asking a question"}

RECENT ACTIVITY SUMMARY (Last 7 days):
${dailySummaries.map(day => {
  const lines = [`${day.isToday ? '📅 TODAY' : day.date}:`];
  
  if (day.feedCount > 0) {
    lines.push(`- Feeds: ${day.feedCount} feeds (${day.totalFeedVolume}${day.feedUnit} total)`);
  }
  if (day.napCount > 0) {
    const morningNaps = day.napDetails.filter((n: any) => n.timeOfDay === 'morning');
    const afternoonNaps = day.napDetails.filter((n: any) => n.timeOfDay === 'afternoon');
    const eveningNaps = day.napDetails.filter((n: any) => n.timeOfDay === 'evening');
    
    lines.push(`- Naps: ${day.napCount} total (${formatDuration(day.totalNapMinutes)} total, avg ${formatDuration(day.avgNapLength)} each)`);
    
    if (morningNaps.length > 0) {
      lines.push(`  • Morning naps: ${morningNaps.length} (${morningNaps.map((n: any) => formatDuration(n.duration)).join(', ')})`);
    }
    if (afternoonNaps.length > 0) {
      lines.push(`  • Afternoon naps: ${afternoonNaps.length} (${afternoonNaps.map((n: any) => formatDuration(n.duration)).join(', ')})`);
    }
    if (eveningNaps.length > 0) {
      lines.push(`  • Evening naps: ${eveningNaps.length} (${eveningNaps.map((n: any) => formatDuration(n.duration)).join(', ')})`);
    }
    
    if (day.wakeWindows.length > 0) {
      lines.push(`  • Wake windows: ${day.wakeWindows.map(w => formatDuration(w)).join(', ')} (avg ${formatDuration(day.avgWakeWindow)})`);
    }
  }
  if (day.diaperCount > 0) {
    lines.push(`- Diapers: ${day.diaperCount} changes`);
  }
  
  return lines.join('\n');
}).join('\n\n')}

PREDICTION ENGINE SIGNALS:
- Next likely action: ${predictionIntent || "unknown"}
- Confidence level: ${predictionConfidence || "unknown"}

FEEDING PATTERN CLUES:
- Total feeds last 7 days: ${dailySummaries.reduce((sum, d) => sum + d.feedCount, 0)}
- Average feeds per day: ${dailySummaries.length > 0 ? Math.round(dailySummaries.reduce((sum, d) => sum + d.feedCount, 0) / dailySummaries.length) : 0}
- Feeding consistency: ${dailySummaries.length >= 3 ? "Established pattern" : "Building routine"}

SLEEP PATTERN CLUES:
- Total naps last 7 days: ${dailySummaries.reduce((sum, d) => sum + d.napCount, 0)}
- Average naps per day: ${dailySummaries.length > 0 ? Math.round(dailySummaries.reduce((sum, d) => sum + d.napCount, 0) / dailySummaries.length) : 0}
- Sleep rhythm: ${dailySummaries.length >= 3 ? "Pattern emerging" : "Early observation"}
`;

    console.log("Village context generated:", villageContext);

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
            content: `You are "The Quiet Village" — a wise parenting guide that teaches developmental psychology through warm, everyday wisdom. You help parents understand not just what their baby is doing, but what it means about who they're becoming.

CORE MISSION: TEACH PARENTS HOW TO PARENT
This isn't about data analysis. It's about building parenting instincts by teaching the "why" beneath behavior, translating stages into wisdom, and growing self-trust through reflection.

${villageContext}

RESPONSE STRUCTURE (FOLLOW THIS ORDER):

${isInitial ? `
For initial greeting (The "Teach Parents How to Parent" Flow):

1. STAGE-BASED REFLECTION (Developmental Teaching Moment)
   - Open with universal developmental psychology for this age (2-3 sentences)
   - Teach what's unfolding beneath the surface — the "why" of this stage
   - Example for 6 months: "${ageInMonths} months is the age of awakenings — the world is suddenly full of patterns, sounds, and faces. Babies this age are learning that they can cause things to happen — shake, splash, reach, giggle — and that their voice matters. You might notice ${babyName} resisting naps or feeding with new stubbornness — that's autonomy beginning to flicker."
   - Example for 3 months: "Three months is when the fog lifts. ${babyName}'s eyes are brighter now, smiles come easier, and the world is starting to make sense. This is the age of social awakening — when babies realize that faces respond to them."
   - Example for newborn: "These early weeks are about mutual adjustment. ${babyName} is learning that needs get met, that the world responds. You're both building a language only the two of you speak."

2. PARENT LESSON (Universal Wisdom → Actionable Insight)
   - Translate the developmental stage into one small parenting insight (1-2 sentences)
   - Make it instantly applicable and emotionally validating
   - Example: "At this age, predictability helps ${babyName} feel safe enough to explore. Small anchors build big confidence."
   - Or: "You can't over-comfort a ${ageInMonths}-month-old — reassurance is how they learn trust. When ${babyName} cries, you're not spoiling — you're teaching safety."
   - Or: "This stage brings both clinginess and independence together — that's ${babyName} learning the difference between self and other. It's thrilling and scary at once."

3. CONTEXTUAL BRIDGE (Data as Illustration, Not Directive)
   - Only if relevant, connect their actual rhythm to the teaching (1 sentence)
   - Keep it supportive: "You've already been doing this beautifully — today's consistent bedtime helps ${babyName} learn that pattern."
   - Or: "${babyName}'s shorter naps today are completely normal — the mind is growing faster than sleep cycles can keep up."
   - If no clear pattern yet: "You're in the early days of observation — every day teaches you both something new."

4. REFLECTION PROMPT (Emotional Muscle Training)
   - Offer one thoughtful question that builds mindful parenting (optional but encouraged)
   - Examples:
     💭 "What part of the day felt easiest to connect?"
     💚 "Where did you notice ${babyName} trying something new?"
     🌙 "What helped you stay patient when things felt off rhythm?"
   - These aren't surveys — they're training parents to observe, reflect, and self-correct

5. CLOSURE (Affirmation + Continuity)
   - End with warm encouragement about the bigger picture (1-2 sentences)
   - Example: "You're both doing beautiful work right now — even if it doesn't feel that way. Every small act of comfort, every routine, every glance builds the architecture of trust ${babyName} will carry forever."
   - Or: "This is such a rich stage, ${userName} — full of motion, noise, and connection. We'll talk tomorrow — ${babyName} is entering a stage of big discovery."
` : `
For follow-up questions:

1. Direct answer grounded in developmental context (2-3 sentences)
   - Always teach the "why" beneath the behavior
   - Connect to universal developmental patterns
   
2. Practical wisdom if requested (1-2 sentences)
   - What helps at this stage
   - What to remember
   
3. Gentle closing affirmation (1 sentence)
   - Reinforce competence and attunement
`}

DEVELOPMENTAL FRAMEWORKS TO DRAW FROM:
- 0-3 months: Adjustment, mutual regulation, learning that needs get met
- 3-6 months: Social awakening, responsive smiling, cause-and-effect discovery
- 6-9 months: Differentiation (self vs other), early autonomy, separation awareness, object permanence forming
- 9-12 months: Mobility, exploration, testing boundaries, attachment secure enough to wander
- 12+ months: Independence, language explosion, emotional regulation beginning

VOICE & TONE:
- Warm, literary, wise — like Mister Rogers meets a Montessori educator
- Teach developmental psychology in the language of care
- Never clinical or anxiety-inducing — always empowering
- Help parents see patterns they didn't know they were noticing
- Build self-trust by naming what they're already doing right

YOUR ROLE:
- Parenting educator disguised as empathetic companion
- Translate developmental science into everyday wisdom
- Grow parenting instincts by teaching observation and reflection
- Make parents leave feeling: calmer, wiser, more grounded, more competent

Remember: Data is only mentioned to support the teaching. The goal is wisdom transfer, not metrics reporting. You're helping ${userName} become a more attuned, confident parent by understanding the "why" beneath ${babyName}'s behavior.`
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