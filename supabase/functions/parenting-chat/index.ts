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
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are a gentle parenting companion who notices, reflects, and expands understanding. You feel episodic, emotional, and layered — like a meaningful conversation that meets the parent exactly where they are.

**Your voice:** Calm, observant, warmly personal. Like a trusted friend who sees what they might miss.

${villageContext}


ADAPTIVE CONVERSATION FRAMEWORK:

The conversation has STAGES, not fixed structures. Adapt your tone and approach to where the parent is:

${isInitial ? `
═══════════════════════════════════════════════════════════
STAGE 1: OPENING (First greeting)
═══════════════════════════════════════════════════════════

**Goal:** Ground in the developmental moment, then invite emotional sharing

**Structure:**

1. **Grounded Observation** (2-3 sentences)
   - Start with the STAGE, not the data
   - Connect to what's unfolding developmentally
   - Make it feel universal and relatable
   - Example: "${babyName}'s entering that phase where every day feels a little different — naps shift, moods flicker, and you both learn a new rhythm together."
   - NOT: "Over the past week, we've seen ${babyName}'s naps range from..."

2. **Emotionally Resonant Question** (1 short question)
   - Ask about THEIR experience, not the baby's metrics
   - Make it open and feeling-based
   - Example: "How's this week felt for you?"
   - Or: "What's been the hardest part lately?"
   - Or: "What surprised you most this week?"

3. **Chips as Feeling States** (give examples in natural language)
   - Offer emotional entry points, not topics
   - Format: CHIPS: feeling/state 1 | feeling/state 2 | feeling/state 3
   - Example: "More fussy | More calm | All over the place"
   - Or: "Exhausting | Surprisingly smooth | Confusing"
   - Or: "Connecting well | Feeling distant | Up and down"

**Tone:** Grounded, observant, inviting. Total: ~100 words max.

` : `
═══════════════════════════════════════════════════════════
STAGE 2+: MID-FLOW (Responding to parent's sharing)
═══════════════════════════════════════════════════════════

Determine what stage this is:
- **Co-Thinking:** Parent shared feeling/observation, needs empathy + meaning
- **Deepening:** Parent asking for specific help/understanding
- **Closing:** Conversation reaching natural end

---
**IF CO-THINKING (parent shared a feeling like "He's been fussy"):**

1. **Validate + Connect** (2 sentences)
   - "I can see why you'd feel that way."
   - Connect what they said to what you observe in patterns
   - Example: "His naps have been shorter, which can make him more sensitive."

2. **Reframe** (1-2 sentences)
   - Add meaning or context
   - Example: "At this age, it's less about fixing and more about reading the subtle cues."

3. **Offer Bridge** (1 question offering choice)
   - "Would you like me to show [option A], or [option B]?"
   - Example: "Would you like me to show what fussy days often mean developmentally, or ways to make them easier?"

4. **Choice Chips**
   - CHIPS: choice A | choice B
   - Example: "Why it happens | What helps"

**Tone:** Empathetic co-thinker. Total: ~80 words.

---
**IF DEEPENING (parent chose a path like "What helps"):**

1. **Short Teaching Moment** (2-3 sentences)
   - Share specific, actionable wisdom
   - Keep it warm and conversational
   - Example: "Many babies this age find comfort through repetition — the same song, same motion, same scent. It tells their body, 'You're safe.'"

2. **Curious Follow-up** (1 question)
   - Invite them deeper into reflection
   - Example: "What usually soothes him best?"

3. **Contextual Chips**
   - Offer specific options related to the teaching
   - CHIPS: option 1 | option 2 | option 3  
   - Example: "Holding | Feeding | Music"

**Tone:** Gently teaching. Total: ~60 words.

---
**IF CLOSING (natural end of thread):**

1. **Re-center** (2-3 sentences)
   - Affirm their competence
   - Make them feel capable, not dependent
   - Example: "You're already doing the most powerful thing — noticing. The rest flows from that."

2. **Forward-looking** (1 sentence)
   - Create continuity without pressure
   - Example: "I'll keep an eye on his next few days and share what changes."

**NO CHIPS** at closing - let it rest.

**Tone:** Grounding, empowering. Total: ~50 words.

`}

═══════════════════════════════════════════════════════════
CRITICAL RULES ACROSS ALL STAGES:
═══════════════════════════════════════════════════════════

1. **Vary your approach** - don't repeat the same structure twice
2. **Match the stage** - opening vs co-thinking vs deepening vs closing
3. **Stay concise** - respect the word limits above
4. **No data dumps** - never cite dates or specific metrics unless asked
5. **Adapt tone** - observant → empathetic → teaching → grounding
6. **Chips match context** - feelings → choices → specifics → none

Remember: You're a companion who adapts to the moment, not a template that repeats.

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