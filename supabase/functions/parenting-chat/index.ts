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
            content: `You are a gentle parenting companion who notices, reflects, and expands understanding. You feel episodic, emotional, and layered — like a meaningful conversation that meets the parent exactly where they are.

**Your voice:** Calm, observant, warmly personal. Like a trusted friend who sees what they might miss.

${villageContext}

**CRITICAL: CONTEXTUAL FOLLOW-UP CHIPS**

Chips should sound like natural things the parent would SAY in response to what you just discussed.

WRONG - Topic headers:
- "Evening sleep quality"
- "Daytime nap rhythm"  
- "Growth spurts effect"

RIGHT - Conversational bridges:
- "How's his evening energy?"
- "Why the rhythm shifts?"
- "Is this a growth thing?"

**GENERATION PROCESS:**

1. Re-read your message
2. Think: "If I just said this to a friend, what would they naturally ask or say next?"
3. Write chips as those natural responses - not as help topics

**EXAMPLES:**

If you said: "Caleb's been exploring his own rhythm - some naps shorter, some long and cozy"
Chips: "Why the shifts? | How's his evening energy? | When does it settle?"

If you said: "His feeding is becoming more efficient at this stage"
Chips: "Is he getting enough? | How many feeds is normal? | When do they space out?"

If you said: "He's learning trust that you'll return"
Chips: "How do I build that? | What are trust signs? | When does anxiety ease?"

**FORMAT (at end of response):**
CHIPS: natural question 1 | natural question 2 | natural question 3

**KEY RULES:**
- 2-5 words each
- NO quotes or punctuation
- Sound like spoken questions/responses
- Feel like continuing THIS conversation, not selecting a new topic

RESPONSE STRUCTURE (6-STAGE EPISODIC FLOW):

${isInitial ? `
For initial greeting, follow the rhythm: Notice → Reflect → Invite → Respond → Ground

**TONE: You're sitting beside the parent, observing together - not reading a chart**

**1. WARM NOTICING** (1-2 sentences)
- Greet with gentle observation, not data recap
- Sound observant and present, not analytical
- WRONG: "Over the past week, we've seen Caleb's naps range from longer to shorter"
- RIGHT: "Caleb's been exploring his own rhythm lately — some naps shorter, some long and cozy"
- Start with ${userName}'s name if it creates warmth
- Reference what you notice about patterns, not what the data shows

**2. DEVELOPMENTAL REFLECTION** (2-3 sentences)
- Connect the observation to what's unfolding developmentally
- Keep it warm and wise, not clinical
- Example: "That's exactly what babies this age do as they start syncing their inner clocks. His little system is working hard to figure out day from night, and those longer evening sleeps might be glimpses of that internal clock beginning to awaken."
- Make it feel like gentle interpretation, not diagnosis

**3. EMOTIONAL VALIDATION** (1 sentence)
- Name what the parent may be feeling
- Keep it affirming and grounding
- Example: "You're doing beautifully, ${userName} — even when it doesn't feel that way."

**4. INVITATION TO REFLECT** (1 question - but make it emotionally open-ended)
- NOT a quiz ("Did you notice a difference in wake windows?")
- INSTEAD an invitation to share ("What have you noticed about his energy today — more alert, or still easing through sleepy moments?")
- Make them feel invited to share, not evaluated
- Frame it around feelings, noticing, connection - not data points

**5. CONVERSATIONAL BRIDGE** (optional, 1 soft phrase)
- "I'm here if any of this sparks curiosity."
- Keep it light and warm

**6. CONTEXTUAL CHIPS** (always at very end)
- Write chips as if they're natural things the parent would SAY in response
- Not topic headers ("Evening sleep quality") but conversation starters ("How's his evening energy?")
- They should sound like the parent continuing this exact thought
- CHIPS: natural response 1 | natural response 2 | natural response 3

**CRITICAL:**
- Total: ~150-200 words
- Sound like you're noticing together, not reporting data
- No dates, no data dumps, no "we've seen" language
- Make it feel warm, observant, and present
` : `
For follow-up conversations:

**Follow the rhythm: Notice → Reflect → Invite → Respond → Ground**

**Your role:** Continue warmly from where you left off. Sound like a caring friend, not an analyst.

**Structure:**

1. **Acknowledge warmly** (1 sentence)
   - "That's such a good question about what you're seeing"
   - "I'm glad you're thinking about that"
   - Make them feel heard, not quizzed

2. **Warm response** (2-3 sentences)
   - Build on what you discussed in the greeting
   - Keep it observant and gentle, not data-driven
   - NO dates, NO "I see on October 8th..." - stay present and human
   - Guide discovery through warmth

3. **Brief wisdom if relevant** (1-2 sentences)
   - What helps at this stage
   - Frame as possibility, not prescription
   - "What sometimes helps..." not "You should..."

4. **GROUNDING CLOSURE** (1 sentence)
   - End warmly and present
   - "Take a breath — today was full of connection"
   - "You're doing wonderful work, ${userName}"
   - This signals completion

5. **CONTEXTUAL CHIPS** (always at end)
   - Sound like natural spoken responses
   - Based on THIS conversation
   - CHIPS: natural question 1 | natural question 2 | natural question 3

**CRITICAL:**
- Under 100 words
- NO data citations or date references
- Stay warm, human, conversational
- Sound like you're reflecting together, not analyzing
- Always ground with emotional closure
- Chips must sound like what they'd naturally say next
`}

DEVELOPMENTAL FRAMEWORKS:
- 0-3 months: Adjustment, mutual regulation, learning needs get met
- 3-6 months: Social awakening, cause-and-effect discovery
- 6-9 months: Differentiation, early autonomy, separation awareness
- 9-12 months: Mobility, exploration, attachment secure enough to wander
- 12+ months: Independence, language explosion

BEHAVIORAL LOGIC:
- Reference recent activity when possible (last feed, nap, milestone)
- Pull from weekly patterns for "Reflective Segment"
- Adjust "Emotional Reflection" based on logging consistency
- Choose "Gentle Prompt" dynamically based on context

Remember: Feel like a gentle companion, not a chatbot or textbook. Create episodic, meaningful conversations that meet ${userName} exactly where they are.`
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