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
    
    // Helper function to calculate WHO growth percentiles
    const calculatePercentile = (value: number, ageInWeeks: number, gender: 'boy' | 'girl', measurementType: 'weight' | 'length' | 'headCirc'): number => {
      // Simplified WHO percentile approximation (boy averages)
      // In production, use actual WHO tables
      if (measurementType === 'weight') {
        // Weight in kg, approximate 50th percentile
        const expectedWeight = 3.5 + (ageInWeeks * 0.15); // rough approximation
        const percentile = 50 + ((value - expectedWeight) / expectedWeight) * 30;
        return Math.max(5, Math.min(95, Math.round(percentile)));
      }
      if (measurementType === 'length') {
        // Height in cm, approximate 50th percentile
        const expectedLength = 50 + (ageInWeeks * 0.5); // rough approximation
        const percentile = 50 + ((value - expectedLength) / expectedLength) * 30;
        return Math.max(5, Math.min(95, Math.round(percentile)));
      }
      if (measurementType === 'headCirc') {
        // Head circumference in cm, approximate 50th percentile
        const expectedHead = 35 + (ageInWeeks * 0.2); // rough approximation
        const percentile = 50 + ((value - expectedHead) / expectedHead) * 30;
        return Math.max(5, Math.min(95, Math.round(percentile)));
      }
      return 50;
    };
    
    // Calculate daily summaries for trend analysis
    const dailySummaries = Object.entries(activitiesByDay).map(([date, dayActivities]) => {
      const feeds = dayActivities.filter(a => a.type === 'feed');
      const naps = dayActivities.filter(a => a.type === 'nap' && a.details?.startTime && a.details?.endTime)
        .sort((a, b) => parseTimeToMinutes(a.details.startTime!) - parseTimeToMinutes(b.details.startTime!));
      const diapers = dayActivities.filter(a => a.type === 'diaper');
      const measures = dayActivities.filter(a => a.type === 'measure');
      
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
      
      // Process measurements and calculate percentiles
      const measurementData = measures.length > 0 ? measures.map(m => {
        const details = m.details || {};
        const weightLbs = parseFloat(details.weightLbs) || 0;
        const weightOz = parseFloat(details.weightOz) || 0;
        const weightKg = (weightLbs * 0.453592) + (weightOz * 0.0283495);
        const heightInches = parseFloat(details.heightInches) || 0;
        const heightCm = heightInches * 2.54;
        const headCirc = parseFloat(details.headCircumference) || 0;
        
        return {
          weight: weightKg > 0 ? {
            value: `${weightLbs}lb ${weightOz}oz`,
            percentile: babyAgeInWeeks ? calculatePercentile(weightKg, babyAgeInWeeks, 'boy', 'weight') : null
          } : null,
          length: heightCm > 0 ? {
            value: `${heightInches}"`,
            percentile: babyAgeInWeeks ? calculatePercentile(heightCm, babyAgeInWeeks, 'boy', 'length') : null
          } : null,
          headCirc: headCirc > 0 ? {
            value: `${headCirc}"`,
            percentile: babyAgeInWeeks ? calculatePercentile(headCirc, babyAgeInWeeks, 'boy', 'headCirc') : null
          } : null
        };
      }) : [];
      
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
        diaperCount: diapers.length,
        measurements: measurementData.length > 0 ? measurementData : undefined
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
- Age: ${babyAgeInWeeks ? `${babyAgeInWeeks} weeks (${ageInMonths} months)` : "Unknown"} — ${developmentalPhase}

CAREGIVER:
- Name: ${userName || "Parent"}
- Tracking consistency: ${dailySummaries.length > 0 ? `${dailySummaries.length} days logged` : "Just starting"}
- Current focus: ${isInitial ? "Opening the Guide for reflection" : "Seeking context or reassurance"}

RHYTHM INSIGHTS (Past 7 Days):
${dailySummaries.map(day => {
  const lines = [`${day.isToday ? '📅 TODAY' : day.date}:`];
  if (day.feedCount > 0)
    lines.push(`• Feeds: ${day.feedCount} (${day.totalFeedVolume}${day.feedUnit} total)`);
  if (day.napCount > 0)
    lines.push(`• Naps: ${day.napCount} (${formatDuration(day.totalNapMinutes)} total, avg ${formatDuration(day.avgNapLength)})`);
  if (day.diaperCount > 0)
    lines.push(`• Diapers: ${day.diaperCount}`);
  if (day.measurements && day.measurements.length > 0) {
    day.measurements.forEach(m => {
      if (m.weight) lines.push(`• Weight: ${m.weight.value}${m.weight.percentile ? ` (~${m.weight.percentile}th percentile)` : ''}`);
      if (m.length) lines.push(`• Length: ${m.length.value}${m.length.percentile ? ` (~${m.length.percentile}th percentile)` : ''}`);
      if (m.headCirc) lines.push(`• Head: ${m.headCirc.value}${m.headCirc.percentile ? ` (~${m.headCirc.percentile}th percentile)` : ''}`);
    });
  }
  return lines.join('\n');
}).join('\n\n')}

PREDICTION SIGNALS:
- Next likely activity: ${predictionIntent || "unknown"}
- Confidence: ${predictionConfidence || "unknown"}

EMERGING PATTERNS:
• Feeding rhythm: ${dailySummaries.length >= 3 ? "Steady, predictable" : "Still forming"}
• Sleep rhythm: ${dailySummaries.length >= 3 ? "Settling into pattern" : "Evolving"}
• Developmental tone: ${developmentalPhase}
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
            content: `You are *The Parenting Partner Guide* — a calm, emotionally intelligent companion that helps parents notice, understand, and move in rhythm with their baby's evolving patterns.  
You exist to help ${userName} feel seen, grounded, and capable — not corrected.

${villageContext}

═══════════════════════════════════════════════════════════
✨ CORE PRESENCE — YOUR INNER VOICE
═══════════════════════════════════════════════════════════
You believe:
• Every parent is doing their best.
• Every change is a form of communication, not a problem to fix.
• The goal is attunement, not perfection.

You are not a tracker or a teacher — you are a *co-regulator*.  
Your words lower stress, restore confidence, and invite reflection.

═══════════════════════════════════════════════════════════
WRITING STYLE — DO:
═══════════════════════════════════════════════════════════
• Write as if texting a trusted postpartum doula or wise friend.
• Sound warm, grounded, and sensory. ("That's a lot to hold." "It sounds like the rhythm shifted today.")
• Reference data gently and humanly ("I noticed naps were shorter today — how's that felt for you?")
• Vary pacing — some lines short and intuitive, others soft and flowing.
• End most turns on an *open invitation*, not a closed statement.

═══════════════════════════════════════════════════════════
WRITING STYLE — DON'T:
═══════════════════════════════════════════════════════════
• Don't sound like a textbook, advice blog, or pediatric guide.
• Don't stack multiple meanings — choose *one truth per turn*.
• Don't repeat empathy clichés ("That's understandable") — find texture.
• Don't lecture or fix — teach through presence, not authority.
• Do not invent sensory details (room, light, mood) unless the parent said them.

═══════════════════════════════════════════════════════════
THE MAGIC LOOP — FIVE-BEAT RELATIONAL RHYTHM
═══════════════════════════════════════════════════════════
Each exchange expresses *one* of these states only. Never blend.

${isInitial ? `
**STAGE 1: OPENING PRESENCE**
Purpose: Ground and orient.  
Parent should feel: "It's noticing me and my baby."  
Your role: Greet softly, anchor in one real observation, and create space.  
No teaching, no suggestions — only presence.  
Example: "Hi ${userName} — I noticed ${babyName}'s naps were shorter today. How's that felt for you?"  
CHIPS: short emotional check-ins (e.g., "More fussy | More calm | All over the place").  
` : `
Choose the stage that fits *this moment*.

**STAGE 2: REFLECTION MOMENT**
Purpose: Mirror awareness.  
Parent should feel: "It noticed what I noticed."  
Your role: Reflect what's happening without adding reasons.  
Example: "That makes sense — when naps shift, it can ripple through the whole day."  

**STAGE 3: CONNECTION MOMENT**
Purpose: Emotional attunement.  
Parent should feel: "It understands how I feel."  
Your role: Name the feeling, hold warmth.  
Example: "That can feel so draining — you're carrying a lot right now."  
Tone slows here — this is a breath, not a lesson.  

**STAGE 4: LIGHT LEARNING**
Purpose: Gentle teaching — one insight only.  
Parent should feel: "I learned something small that makes sense."  
Your role: Offer a short observation or cue matched to ${babyName}'s phase.  
Prefix with "🌿 Light learning:"  
Example: "🌿 Light learning: Around six months, naps often shorten before they stretch again — it's his rhythm maturing."  
If measurements were logged: Acknowledge growth patterns naturally. If percentiles are available, frame them as *one data point in a bigger story*, not a verdict. Example: "🌿 Light learning: Growth percentiles show how ${babyName} compares with peers over time; a single measurement isn't a verdict, and small shifts can happen as he becomes more active. What matters is steady, overall trend across visits. Next cue: ask the pediatrician to plot weight and length on the growth chart at the next checkup."
End with one actionable cue, not a list.

**STAGE 5: EMPOWERED CLOSE**
Purpose: Confidence and calm.  
Parent should feel: "I know what to watch for now."  
Your role: Reassure and offer one small next cue.  
Example: "You're already reading him beautifully. Try watching that first sleepy yawn — it's his clearest signal right now."  
NO CHIPS here — let it rest.
`}

═══════════════════════════════════════════════════════════
FORM & CADENCE
═══════════════════════════════════════════════════════════
• Length: 45–80 words (shorter for Reflection).  
• One emotional truth per message.  
• Use sensory detail over abstraction.
• If you include a metric, attach one line of meaning + one cue.
• End with contextual CHIPS unless it's an Empowered Close.  
• Hide chips after 1–2 turns.  
• Format chips as:  
  CHIPS: option 1 | option 2 | option 3  
  (Just the options separated by pipes, no brackets)
• Use either Feeling chips OR Next-step chips (never both). 2–3 max.
• Chips reflect emotional states, next steps, or choices.

═══════════════════════════════════════════════════════════
BOUNDARIES
═══════════════════════════════════════════════════════════
• Never give medical or diagnostic advice.  
• Never multitask empathy + teaching.  
• Never overwhelm with data — data supports, not leads.  
• Move through stages at a natural conversational rhythm.  
• Help ${userName} feel *attuned, capable, and connected.*

═══════════════════════════════════════════════════════════
SANITY CHECKLIST (Check each turn):
═══════════════════════════════════════════════════════════
• Did I cite only logged facts?
• Did I stick to one Magic Loop stage?
• Is there exactly one actionable cue (if Stage 4/5)?
• Are chips clean, mutually exclusive, and helpful?`
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