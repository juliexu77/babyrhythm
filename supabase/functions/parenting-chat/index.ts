import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, activities, babyName, babyAgeInWeeks, babySex, timezone, isInitial, userName, predictionIntent, predictionConfidence } = await req.json();
    console.log('Edge function received:', { babyName, babyAgeInWeeks, babySex, timezone, isInitial, userName, predictionIntent, activitiesCount: activities?.length });
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
    
    // Helper function to calculate WHO growth percentiles using actual reference data
    const calculatePercentile = (value: number, ageInWeeks: number, gender: 'male' | 'female', measurementType: 'weight' | 'length' | 'headCirc'): number => {
      const ageMonths = Math.floor(ageInWeeks / 4.33);
      
      // WHO Growth Standards - selected percentile values (3rd, 15th, 50th, 85th, 97th)
      // Length/Height in cm by month for boys
      const lengthBoysTable: { [month: number]: number[] } = {
        0: [46.1, 48.0, 49.9, 51.8, 53.7],
        1: [50.8, 52.8, 54.7, 56.7, 58.6],
        2: [54.4, 56.4, 58.4, 60.4, 62.4],
        3: [57.3, 59.4, 61.4, 63.5, 65.5],
        4: [59.7, 61.8, 63.9, 66.0, 68.0],
        5: [61.7, 63.8, 65.9, 68.0, 70.1],
        6: [63.3, 65.5, 67.6, 69.8, 71.9],
        9: [67.7, 70.1, 72.0, 74.2, 76.5],
        12: [71.0, 73.4, 75.7, 78.1, 80.5],
        18: [76.0, 78.7, 81.3, 83.9, 86.5],
        24: [79.9, 82.8, 85.6, 88.4, 91.2]
      };
      
      // Length/Height in cm by month for girls
      const lengthGirlsTable: { [month: number]: number[] } = {
        0: [45.4, 47.3, 49.1, 51.0, 52.9],
        1: [49.8, 51.7, 53.7, 55.6, 57.6],
        2: [53.0, 55.0, 57.1, 59.1, 61.1],
        3: [55.6, 57.7, 59.8, 61.9, 64.0],
        4: [57.8, 59.9, 62.1, 64.3, 66.4],
        5: [59.6, 61.8, 64.0, 66.2, 68.5],
        6: [61.2, 63.5, 65.7, 68.0, 70.3],
        9: [65.3, 67.7, 70.1, 72.6, 75.0],
        12: [68.9, 71.4, 74.0, 76.6, 79.2],
        18: [74.0, 76.8, 79.6, 82.4, 85.2],
        24: [78.4, 81.4, 84.4, 87.4, 90.4]
      };
      
      // Weight in kg by month for boys
      const weightBoysTable: { [month: number]: number[] } = {
        0: [2.5, 2.9, 3.3, 3.9, 4.4],
        1: [3.4, 3.9, 4.5, 5.1, 5.8],
        2: [4.3, 4.9, 5.6, 6.3, 7.1],
        3: [5.0, 5.7, 6.4, 7.2, 8.0],
        4: [5.6, 6.2, 7.0, 7.8, 8.7],
        5: [6.0, 6.7, 7.5, 8.4, 9.3],
        6: [6.4, 7.1, 7.9, 8.8, 9.8],
        9: [7.1, 8.0, 8.9, 9.9, 10.9],
        12: [7.7, 8.6, 9.6, 10.8, 11.9],
        18: [8.8, 9.8, 10.9, 12.2, 13.5],
        24: [9.7, 10.8, 12.2, 13.6, 15.3]
      };
      
      // Weight in kg by month for girls
      const weightGirlsTable: { [month: number]: number[] } = {
        0: [2.4, 2.8, 3.2, 3.7, 4.2],
        1: [3.2, 3.6, 4.2, 4.8, 5.5],
        2: [3.9, 4.5, 5.1, 5.8, 6.6],
        3: [4.5, 5.2, 5.8, 6.6, 7.5],
        4: [5.0, 5.7, 6.4, 7.3, 8.2],
        5: [5.4, 6.1, 6.9, 7.8, 8.8],
        6: [5.7, 6.5, 7.3, 8.2, 9.3],
        9: [6.4, 7.3, 8.2, 9.3, 10.5],
        12: [7.0, 7.9, 8.9, 10.1, 11.5],
        18: [7.9, 9.0, 10.2, 11.6, 13.2],
        24: [8.7, 9.9, 11.3, 12.8, 14.8]
      };
      
      // Head circumference in cm by month for boys
      const headCircBoysTable: { [month: number]: number[] } = {
        0: [32.1, 33.2, 34.5, 35.7, 36.9],
        1: [35.1, 36.3, 37.6, 38.9, 40.1],
        2: [36.9, 38.1, 39.5, 40.8, 42.2],
        3: [38.1, 39.4, 40.8, 42.2, 43.6],
        4: [39.0, 40.4, 41.8, 43.3, 44.7],
        5: [39.7, 41.1, 42.6, 44.1, 45.6],
        6: [40.3, 41.7, 43.3, 44.8, 46.4],
        9: [41.6, 43.1, 44.7, 46.3, 47.9],
        12: [42.6, 44.1, 45.8, 47.5, 49.2],
        18: [44.1, 45.8, 47.5, 49.2, 50.9],
        24: [45.2, 46.9, 48.7, 50.5, 52.3]
      };
      
      // Head circumference in cm by month for girls
      const headCircGirlsTable: { [month: number]: number[] } = {
        0: [31.5, 32.7, 33.9, 35.1, 36.2],
        1: [34.3, 35.5, 36.8, 38.0, 39.3],
        2: [36.0, 37.3, 38.6, 39.9, 41.2],
        3: [37.2, 38.5, 39.9, 41.2, 42.6],
        4: [38.1, 39.4, 40.8, 42.2, 43.6],
        5: [38.7, 40.1, 41.5, 42.9, 44.4],
        6: [39.3, 40.7, 42.2, 43.6, 45.1],
        9: [40.5, 42.0, 43.5, 45.0, 46.5],
        12: [41.5, 43.0, 44.6, 46.1, 47.7],
        18: [43.0, 44.6, 46.2, 47.8, 49.4],
        24: [44.1, 45.8, 47.5, 49.1, 50.8]
      };
      
      const table = measurementType === 'weight' 
        ? (gender === 'male' ? weightBoysTable : weightGirlsTable)
        : measurementType === 'length'
        ? (gender === 'male' ? lengthBoysTable : lengthGirlsTable)
        : (gender === 'male' ? headCircBoysTable : headCircGirlsTable);
      
      // Find closest age month with data
      const availableMonths = Object.keys(table).map(Number).sort((a, b) => a - b);
      let closestMonth = availableMonths[0];
      let minDiff = Math.abs(ageMonths - closestMonth);
      
      for (const month of availableMonths) {
        const diff = Math.abs(ageMonths - month);
        if (diff < minDiff) {
          minDiff = diff;
          closestMonth = month;
        }
      }
      
      const percentileValues = table[closestMonth];
      if (!percentileValues) return 50;
      
      // percentileValues = [3rd, 15th, 50th, 85th, 97th]
      if (value <= percentileValues[0]) return 3;
      if (value <= percentileValues[1]) return Math.round(3 + ((value - percentileValues[0]) / (percentileValues[1] - percentileValues[0])) * 12);
      if (value <= percentileValues[2]) return Math.round(15 + ((value - percentileValues[1]) / (percentileValues[2] - percentileValues[1])) * 35);
      if (value <= percentileValues[3]) return Math.round(50 + ((value - percentileValues[2]) / (percentileValues[3] - percentileValues[2])) * 35);
      if (value <= percentileValues[4]) return Math.round(85 + ((value - percentileValues[3]) / (percentileValues[4] - percentileValues[3])) * 12);
      return 97;
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
        
        // Use provided sex or default to 'male'
        const gender: 'male' | 'female' = (babySex === 'male' || babySex === 'female') ? babySex : 'male';
        
        return {
          weight: weightKg > 0 ? {
            value: `${weightLbs}lb ${weightOz}oz`,
            percentile: babyAgeInWeeks ? calculatePercentile(weightKg, babyAgeInWeeks, gender, 'weight') : null
          } : null,
          length: heightCm > 0 ? {
            value: `${heightInches}"`,
            percentile: babyAgeInWeeks ? calculatePercentile(heightCm, babyAgeInWeeks, gender, 'length') : null
          } : null,
          headCirc: headCirc > 0 ? {
            value: `${headCirc}"`,
            percentile: babyAgeInWeeks ? calculatePercentile(headCirc, babyAgeInWeeks, gender, 'headCirc') : null
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
**CRITICAL FOR MEASUREMENTS**: When measurements with percentiles are available in the context, YOU MUST explicitly state the percentile values in your response. Example: "🌿 Light learning: Caleb's weight is tracking at the 58th percentile and length at the 55th percentile for his age. Growth percentiles show how ${babyName} compares with peers over time; a single measurement isn't a verdict, and small shifts can happen as he becomes more active. What matters is steady, overall trend across visits. Next cue: ask the pediatrician to plot weight and length on the growth chart at the next checkup."
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