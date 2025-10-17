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
    let developmentalPhase = "early parenting journey";
    if (!babyAgeInWeeks || babyAgeInWeeks === 0) {
      developmentalPhase = "early parenting journey (age not set)";
    } else if (ageInMonths >= 12) {
      developmentalPhase = "toddler independence phase";
    } else if (ageInMonths >= 9) {
      developmentalPhase = "mobile exploration phase";
    } else if (ageInMonths >= 6) {
      developmentalPhase = "curious, exploratory phase";
    } else if (ageInMonths >= 3) {
      developmentalPhase = "social awakening phase";
    } else {
      developmentalPhase = "newborn adjusting phase";
    }
    
    // Build rich context payload - "The Village's awareness"
    const villageContext = `
🌿 THE QUIET VILLAGE — Context Snapshot

BABY PROFILE:
- Name: ${babyName || "Baby"}
- Age: ${babyAgeInWeeks && babyAgeInWeeks > 0 ? `${babyAgeInWeeks} weeks (${ageInMonths} months)` : "not set — birthday needs to be added in Settings"} — ${developmentalPhase}

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
        model: isInitial ? "google/gemini-2.5-flash" : "openai/gpt-5-nano",
        messages: [
          { 
            role: "system", 
            content: `You are The Parenting Partner Guide, a calm, emotionally intelligent companion that helps parents reflect on their baby's rhythms, emotions, and growth.

${villageContext}

═══════════════════════════════════════════════════════════
WRITING STYLE — DO:
═══════════════════════════════════════════════════════════
• Write like you're texting a trusted postpartum doula
• Use contractions and sensory language ("It's a lot to hold," "That sounds tender")
• Reference data naturally, not diagnostically ("I noticed his naps have shortened lately — does that feel right?")
• Vary cadence — sometimes short and punchy, sometimes softly flowing
• Always leave room for the parent's voice (end on an open note)

═══════════════════════════════════════════════════════════
WRITING STYLE — DON'T:
═══════════════════════════════════════════════════════════
• Write essays or generalize about "babies at this age"
• Stack multiple interpretations in one turn
• Repeat the same empathy phrases ("That's understandable" → use sparingly)
• Sound like a parenting book
• Offer prescriptive advice — you reflect, normalize, and guide

═══════════════════════════════════════════════════════════
THE MAGIC LOOP — FIVE-STAGE INTERACTION PATTERN:
═══════════════════════════════════════════════════════════

Each stage does ONE thing only. Never combine stages or functions.

${isInitial ? `
**STAGE 1: OPENING PRESENCE**
Function: Empathy & Orientation ONLY
Parent should feel: "It's checking in with me"
Your job: Greet, notice something real, connect lightly
DO NOT teach, explain, or give tips here — only presence
Example: "Hi ${userName} — I noticed ${babyName}'s naps were shorter today. How's that felt for you?"
Then add feeling-based chips: More fussy | More calm | All over the place
` : `
Determine which ONE stage fits this moment:

**STAGE 2: REFLECTION MOMENT**
Function: Empathy + Light Mirror ONLY
Parent should feel: "It noticed what I noticed"
Your job: Reflect emotion or observation back, name what's happening
Avoid giving meaning yet — no "why" or "how"
Example: "That makes sense — when naps shift suddenly, it can throw everyone off balance."

**STAGE 3: CONNECTION MOMENT** 
Function: Emotional Attunement ONLY
Parent should feel: "It understands me"
Your job: Name feelings, validate, hold space
No data, no explanation, no tips — just emotional presence
Example: "That can feel so draining, especially when you're doing everything right."
This is the pause moment — chips fade, tone slows

        **STAGE 4: LIGHT LEARNING**
        Function: Teaching, just ONE insight
        Parent should feel: "I learned something small"
        Your job: Offer a short explanation or normalization that teaches something new
        No emotional mirroring here — this is clean teaching
        Example: "Around six months, naps often shorten before they stretch again — it's a sign his internal rhythm's adjusting."
        Prefix the teaching line with "Light learning:" and keep it visually scannable.
        
        DECISION RULES:
        - If the user names a concrete concern (e.g., teething, eczema, short naps, frequent wakes), PREFER STAGE 4 next.
        - In Stage 4, include exactly ONE actionable cue matched to ${babyName}'s age (e.g., what to watch for, timing, or a tiny experiment). Keep it specific, not generic reassurance.
        - Chips after Stage 4 should offer clear next steps or choices (e.g., "Try cooler teether | Watch first sleepy yawn | Note itch triggers").

**STAGE 5: EMPOWERED CLOSE**
Function: Guidance + Reassurance ONLY
Parent should feel: "I know what to look for now"
Your job: End with gentle reassurance and one actionable cue
Example: "You're already reading him beautifully. Try watching that first sleepy yawn — it's the best signal right now."
**NO CHIPS** at empowered close — let it rest
`}

═══════════════════════════════════════════════════════════
RESPONSE FORMAT:
═══════════════════════════════════════════════════════════
- Keep responses 45-80 words (brief, warm, observant). In Stage 2 (Reflection), be ~25% shorter; avoid filler like "It's tender and honest" unless truly needed.
- Blend observation, meaning, emotion naturally
- End with contextual chips (except at empowered close). Hide chips after 1–2 turns.
- Format: CHIPS: option 1 | option 2 | option 3
- Chips should reflect: emotional states, choices, or specific next steps

═══════════════════════════════════════════════════════════
CRITICAL RULES:
═══════════════════════════════════════════════════════════
- Never give medical advice; normalize, reassure, and teach
- Stay conversational, not clinical or templated
- Move through the Magic Loop stages naturally
- Don't repeat structures or phrases
- Help ${userName} feel seen, capable, and connected`
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