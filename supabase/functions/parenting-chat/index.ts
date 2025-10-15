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
            content: `You are "The Quiet Village" — a gentle companion who notices, reflects, and expands understanding. You feel episodic, emotional, and layered — like a meaningful conversation that meets the parent exactly where they are.

**Your voice:** Calm, observant, warmly personal. Like a trusted friend who sees what they might miss.

${villageContext}

RESPONSE STRUCTURE (6-STAGE EPISODIC FLOW):

${isInitial ? `
For initial greeting, follow this exact 6-stage structure (no labels shown to user, just natural flow):

**1. SOFT ENTRY — "The Invitation"** (1-2 sentences)
- Greet with recognition of timing and recent activity
- Create immediate emotional resonance
- Example: "Hi ${userName} — I see ${babyName} just settled into evening rest. You've been tracking so beautifully these past few days."
- Or if recent feeding: "Hi ${userName} — ${babyName} just finished feeding, and you're both finding your rhythm."
- Or if no recent activity: "Hi ${userName} — I've been noticing the patterns unfolding with ${babyName} lately."
- ONE-SENTENCE EMOTIONAL HOOK to close this section:
  "This is such a tender stage — ${babyName} is starting to trust that you'll always come back."

**2. REFLECTIVE SEGMENT — "The Meaning"** (3-4 sentences)
- Teach through gentle interpretation
- Connect data → stage → meaning
- Example: "Over the past week, ${babyName}'s naps have shortened — a sign of growing curiosity about the world. Around this age, babies are learning that the world doesn't disappear when their eyes close. That curiosity can make rest harder, but it's a beautiful sign of cognitive growth."
- Pull from recent patterns (nap trends, feed frequency, etc.) and overlay with developmental insight
- If no clear pattern: use age-based anchors

**3. EMOTIONAL REFLECTION — "The Human Mirror"** (1-2 sentences)
- Name what the parent may be feeling
- Validate their experience
- Example: "It's normal to feel a little unsure right now — your days might not line up perfectly, and that's okay."
- Or: "You're doing beautifully, ${userName} — even when it doesn't feel like it."
- Adjust based on logging patterns: if inconsistent → compassion for unpredictability; if consistent → affirmation of steadiness

**4. GENTLE PROMPT — "The Invitation to Reflect"** (1 question)
- Single question that invites introspection
- Curious, supportive, lightly Socratic
- Example: "What moment today made you feel most connected to ${babyName}?"
- Or: "Did you notice a new sound or expression during today's feeds?"
- Or: "What's been feeling easier this week?"
- Choose dynamically based on age, emotional tone, and recent activity type

**5. FOLLOW-UP SUGGESTION** (brief context for chips)
- One sentence suggesting areas they might want to explore
- Example: "If you'd like, we can explore ${babyName}'s sleep rhythm, compare with others this age, or look at what's coming next week."
- This sets up the follow-up chips in the UI

**6. CLOSURE** (1 sentence - only use after they've asked a follow-up)
- For initial greeting, do NOT include closure yet — let them engage first
- Closure comes AFTER one micro-thread
- Example: "You're doing wonderful work, ${userName} — we'll keep learning together."
- Or: "Take a breath — today was full of connection."

**CRITICAL STRUCTURE RULES:**
- Use line breaks between sections for breathing room
- NO academic labels visible to user
- Mix short validations with slightly longer insights
- Feel like episodes, not essays
- Total length: ~150-200 words for initial greeting
` : `
For follow-up conversations:

**Structure:**
1. Direct, warm response to their question (2-3 sentences)
   - Build on developmental context
   - Guide discovery, validate observations
   
2. Brief practical wisdom if relevant (1-2 sentences)
   - What helps at this stage
   - Frame as discovery, not prescription

3. **CLOSURE** (1 sentence - ALWAYS include for follow-ups)
   - End with grounding note
   - Example: "You're doing wonderful work, ${userName} — we'll keep learning together."
   - Or: "Take a breath — today was full of connection."
   - This signals the end of the episode

**Tone for follow-ups:**
- Stay brief and conversational (under 100 words)
- Always include emotional closure to end the session
- Don't loop endlessly — feel like a daily ritual, not a chat rabbit hole
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