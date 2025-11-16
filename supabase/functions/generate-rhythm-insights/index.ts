import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activities, babyName, babyAge, babyBirthday, aiPrediction, timezone } = await req.json();
    
    if (!activities || !babyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: activities, babyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userTimezone = timezone || 'America/Los_Angeles';

    // ===== DST DETECTION =====
    const checkDSTTransition = (tz: string) => {
      // Check if timezone observes DST
      const doesObserveDST = () => {
        const january = new Date(new Date().getFullYear(), 0, 1);
        const july = new Date(new Date().getFullYear(), 6, 1);
        const janOffset = new Date(january.toLocaleString('en-US', { timeZone: tz })).getTimezoneOffset();
        const julyOffset = new Date(july.toLocaleString('en-US', { timeZone: tz })).getTimezoneOffset();
        return janOffset !== julyOffset;
      };

      if (!doesObserveDST()) {
        return { isDSTTransitionPeriod: false, transitionType: null, daysUntilNext: null };
      }

      // Get DST transition dates for current year
      const getDSTDates = (year: number) => {
        let springTransition: string | null = null;
        let fallTransition: string | null = null;
        let previousOffset: number | null = null;

        for (let month = 0; month < 12; month++) {
          for (let day = 1; day <= 31; day++) {
            try {
              const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
              if (date.getUTCMonth() !== month) break;

              const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                hour12: false
              });

              const parts = formatter.formatToParts(date);
              const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
              const offset = 12 - localHour;

              if (previousOffset !== null && offset !== previousOffset) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if (offset < previousOffset) {
                  springTransition = dateStr;
                } else {
                  fallTransition = dateStr;
                }
              }
              previousOffset = offset;
            } catch (e) {
              continue;
            }
          }
        }
        return { spring: springTransition, fall: fallTransition };
      };

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const { spring, fall } = getDSTDates(now.getFullYear());

      // Check if today or yesterday was DST transition
      const isSpringToday = spring === todayStr;
      const isFallToday = fall === todayStr;
      const wasSpringYesterday = spring === yesterdayStr;
      const wasFallYesterday = fall === yesterdayStr;
      
      const isDSTTransitionPeriod = isSpringToday || isFallToday || wasSpringYesterday || wasFallYesterday;
      let transitionType: 'spring-forward' | 'fall-back' | null = null;

      if (isSpringToday || wasSpringYesterday) {
        transitionType = 'spring-forward';
      } else if (isFallToday || wasFallYesterday) {
        transitionType = 'fall-back';
      }

      // Check for upcoming DST in next 14 days
      let daysUntilNext: { days: number; type: 'spring-forward' | 'fall-back' } | null = null;
      if (spring || fall) {
        const checkDaysUntil = (transDate: string, type: 'spring-forward' | 'fall-back') => {
          const transitionDate = new Date(transDate);
          const diffTime = transitionDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0 && diffDays <= 14) {
            return { days: diffDays, type };
          }
          return null;
        };

        if (spring) {
          const springCheck = checkDaysUntil(spring, 'spring-forward');
          if (springCheck) daysUntilNext = springCheck;
        }
        if (fall && !daysUntilNext) {
          const fallCheck = checkDaysUntil(fall, 'fall-back');
          if (fallCheck) daysUntilNext = fallCheck;
        }
      }

      return { isDSTTransitionPeriod, transitionType, daysUntilNext };
    };

    const dstInfo = checkDSTTransition(userTimezone);
    console.log('🕐 DST Info:', dstInfo);

    // Build DST context for AI
    let dstContext = '';
    if (dstInfo.isDSTTransitionPeriod) {
      if (dstInfo.transitionType === 'spring-forward') {
        dstContext = '\n\nDST CONTEXT: Spring forward happened today/yesterday (clocks moved ahead 1 hour). Baby may wake earlier, be cranky, or resist bedtime. Adjust expectations and be flexible for 3-5 days.';
      } else if (dstInfo.transitionType === 'fall-back') {
        dstContext = '\n\nDST CONTEXT: Fall back happened today/yesterday (gained 1 hour). Baby may wake earlier than usual or struggle to fall asleep at bedtime. This typically resolves in 3-5 days.';
      }
    } else if (dstInfo.daysUntilNext) {
      const { days, type } = dstInfo.daysUntilNext;
      if (type === 'spring-forward') {
        dstContext = `\n\nUPCOMING DST: Spring forward in ${days} days (clocks move ahead 1 hour). To prepare: Shift baby's schedule 15 minutes earlier every 2-3 days starting now.`;
      } else {
        dstContext = `\n\nUPCOMING DST: Fall back in ${days} days (gain 1 hour). To prepare: Shift baby's bedtime 15 minutes later every 2-3 days starting now.`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze recent data (timezone-aware and day-boundary safe)
    const tz = userTimezone;

    // Helper: format a Date into YYYY-MM-DD in the user's timezone
    const formatDateInTZ = (date: Date): string => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')!.value;
      const month = parts.find(p => p.type === 'month')!.value;
      const day = parts.find(p => p.type === 'day')!.value;
      return `${year}-${month}-${day}`;
    };

    // Helper: derive activity's local date string (prefer explicit local date if present)
    const getActivityDateStr = (a: Activity): string => {
      if (a.details?.date_local) return a.details.date_local; // already YYYY-MM-DD
      return formatDateInTZ(new Date(a.logged_at));
    };

    const nowLocal = new Date();
    const todayDateStr = formatDateInTZ(nowLocal);
    const sevenDaysAgo = new Date(nowLocal.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(nowLocal.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = formatDateInTZ(sevenDaysAgo);
    const fourteenDaysAgoStr = formatDateInTZ(fourteenDaysAgo);

    // Build windows using local-date strings. Exclude TODAY to avoid partial-day bias.
    const inRange = (a: Activity, startStr: string, endStr: string) => {
      const ds = getActivityDateStr(a);
      return ds >= startStr && ds < endStr; // end exclusive
    };

    const last7Days = activities.filter((a: Activity) => inRange(a, sevenDaysAgoStr, todayDateStr));
    const last14Days = activities.filter((a: Activity) => inRange(a, fourteenDaysAgoStr, todayDateStr));

    const napsThisWeek = last7Days.filter((a: Activity) => a.type === 'nap' && !a.details?.isNightSleep).length;

    // Naps in the previous 7-day window (14->7 days ago), also timezone-aware
    const napsLastWeek = activities.filter((a: Activity) => inRange(a, fourteenDaysAgoStr, sevenDaysAgoStr) && a.type === 'nap' && !a.details?.isNightSleep).length;

    // Calculate average naps per day (based on 7 complete days)
    const napsPerDayThisWeek = Math.round(napsThisWeek / 7);
    const napsPerDayLastWeek = Math.round(napsLastWeek / 7);

    // Calculate actual daily nap counts for last 7 complete days to validate transitions
    const dailyNapCounts: { [key: string]: number } = {};
    last7Days.forEach((a: Activity) => {
      if (a.type === 'nap' && !a.details?.isNightSleep) {
        const dateStr = getActivityDateStr(a);
        dailyNapCounts[dateStr] = (dailyNapCounts[dateStr] || 0) + 1;
      }
    });
    const napCountsArray = Object.values(dailyNapCounts);
    const maxNapCount = napCountsArray.length ? Math.max(...napCountsArray) : 0;
    const minNapCount = napCountsArray.length ? Math.min(...napCountsArray) : 0;

    // Calculate bedtime consistency (standard deviation)
    // Use actual bedtime (startTime) not logged_at timestamp
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

    const bedtimes = last14Days
      .filter((a: Activity) => a.type === 'nap' && a.details?.isNightSleep && a.details?.startTime)
      .map((a: Activity) => parseTimeToMinutes(a.details.startTime))
      .filter(time => time > 0);

    let bedtimeVariation = 0;
    if (bedtimes.length > 1) {
      const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
      const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / bedtimes.length;
      bedtimeVariation = Math.sqrt(variance);
    }

    // Calculate confidence score
    const dataPoints = last14Days.length;
    let confidenceScore = 'High confidence';
    if (bedtimeVariation < 15 && dataPoints >= 300) {
      confidenceScore = '95% confidence';
    } else if (bedtimeVariation < 25 && dataPoints >= 200) {
      confidenceScore = '90% confidence';
    }

    // Baby age in months
    const ageInMonths = babyBirthday 
      ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null;

    // Get current hour in user's timezone
    const getCurrentHourInTZ = (): number => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(nowLocal);
      const hour = parts.find(p => p.type === 'hour')?.value;
      return hour ? parseInt(hour) : 0;
    };
    const currentHour = getCurrentHourInTZ();
    
    // Get ACTUAL nap count for TODAY (not prediction) using user's timezone
    const actualNapsToday = activities.filter((a: Activity) => {
      if (a.type !== 'nap' || a.details?.isNightSleep) return false;
      const ds = getActivityDateStr(a);
      return ds === todayDateStr;
    }).length;

    console.log(`📊 Today's ACTUAL naps: ${actualNapsToday}, AI predicted: ${aiPrediction?.total_naps_today || 'none'}, Current hour: ${currentHour}`);
    
    // Check if it's too early to make conclusions about today
    // Don't generate insights if it's before 10am and no naps logged yet
    const isTooEarlyForInsights = currentHour < 10 && actualNapsToday === 0;
    
    if (isTooEarlyForInsights) {
      console.log('⏰ Too early to generate insights - showing forward-looking content instead');
      return new Response(
        JSON.stringify({
          heroInsight: `Based on recent patterns, expect ${napsPerDayThisWeek} naps today — first nap window typically opens mid-morning.`,
          confidenceScore: 'Looking ahead',
          whyThisMatters: `Right now is about following ${babyName}'s natural rhythm. Watch for sleepy cues like eye rubbing, yawning, or fussiness as morning wake time builds.`,
          prepTip: `Start winding down 15 minutes before the first nap. Dim lights, quiet play, and consistent pre-nap routine help ${babyName} transition smoothly to sleep.`,
          whatToDo: [
            `Watch for ${babyName}'s sleepy cues as the first wake window approaches`,
            `Keep the morning calm and predictable to set up success for today's naps`,
            `Have ${babyName}'s nap space ready with comfortable temperature and low light`
          ],
          whatsNext: `First nap window typically opens around mid-morning. ${babyName} will show you when they're ready!`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // VALIDATE transition claim against actual data
    // Only allow transition claims that match the observed nap counts
    let validatedTransitionInfo: string | null = null;
    if (aiPrediction?.is_transitioning && aiPrediction.transition_note) {
      const transitionNote = aiPrediction.transition_note.toLowerCase();
      
      // Check if transition mentions "4 to 3" but last 7 days never had 4+ naps
      if (transitionNote.includes('4 to 3') || transitionNote.includes('4-to-3')) {
        const hadFourNapDay = napCountsArray.some(count => count >= 4);
        if (!hadFourNapDay) {
          console.log(`⚠️ Rejecting invalid "4→3" transition claim. Last 7 days nap range: ${minNapCount}–${maxNapCount}`);
          // Override with accurate description
          validatedTransitionInfo = maxNapCount > minNapCount 
            ? `PATTERN: Stabilizing between ${minNapCount}–${maxNapCount} naps per day`
            : null;
        } else {
          validatedTransitionInfo = `TRANSITION: ${aiPrediction.transition_note}`;
        }
      } else {
        // Other transitions are fine
        validatedTransitionInfo = `TRANSITION: ${aiPrediction.transition_note}`;
      }
    }
    
    const transitionInfo = validatedTransitionInfo;

    // Calculate specific pattern details for more concrete explanations
    const recentWakeTimes = last7Days
      .filter((a: Activity) => a.type === 'nap' && a.details?.isNightSleep)
      .map((a: Activity) => {
        const date = new Date(a.logged_at);
        const wakeTime = a.details?.wakeTime ? new Date(a.details.wakeTime) : null;
        return wakeTime ? `${wakeTime.getHours()}:${wakeTime.getMinutes().toString().padStart(2, '0')}` : null;
      })
      .filter(Boolean);
    
    const avgNapDurations = last7Days
      .filter((a: Activity) => a.type === 'nap' && !a.details?.isNightSleep)
      .map((a: Activity) => {
        if (a.details?.duration) {
          const [hours, mins] = a.details.duration.split(':').map(Number);
          return (hours || 0) * 60 + (mins || 0);
        }
        return null;
      })
      .filter((d): d is number => d !== null);
    
    const avgNapMinutes = avgNapDurations.length > 0 
      ? Math.round(avgNapDurations.reduce((a, b) => a + b, 0) / avgNapDurations.length)
      : null;

    // Create consistent context for all calls
    const sharedContext = `CRITICAL - USE THESE EXACT NUMBERS:
- Current average: ${napsPerDayThisWeek} naps per day this week
- Previous average: ${napsPerDayLastWeek} naps per day last week
- Last 7 days range: ${minNapCount}-${maxNapCount} naps per day
- Today's actual count: ${actualNapsToday} naps logged
${transitionInfo ? `- Pattern status: ${transitionInfo}` : ''}

DO NOT make up different numbers. DO NOT say "4 naps" if the data shows ${napsPerDayThisWeek}. DO NOT invent transitions that aren't in the data.`;

    // CALL 1: Generate Hero Insight
    const predictedNapsToday = aiPrediction?.total_naps_today || napsPerDayThisWeek;
    const heroPrompt = `You are an emotionally intelligent baby sleep coach who explains patterns and provides warm, actionable guidance. You think through the "why" behind patterns and help parents understand what's happening.

CONTEXT (MUST USE THIS DATA):
Baby: ${babyName}, ${ageInMonths ? `${ageInMonths} months old` : 'age unknown'}
CURRENT STATUS: ${actualNapsToday} of ${predictedNapsToday} predicted naps completed
RECENT PATTERN: ${napsPerDayThisWeek} naps/day this week (was ${napsPerDayLastWeek} last week)
VARIABILITY: ${minNapCount}–${maxNapCount} naps/day range over last 7 days
BEDTIME CONSISTENCY: ${Math.round(bedtimeVariation)} min variance (${bedtimeVariation < 15 ? 'very consistent' : bedtimeVariation < 30 ? 'fairly consistent' : 'inconsistent'})
${transitionInfo || ''}
${aiPrediction ? `AI PREDICTION: ${JSON.stringify(aiPrediction).slice(0, 200)}` : ''}

TASK: Write 2-3 sentences (~45-60 words) with a warm, conversational, intelligent tone that:
1. EXPLAINS what's happening and WHY (show your reasoning)
2. Connects patterns to outcomes (help parents understand the mechanism)
3. Provides SPECIFIC, actionable guidance with timing

YOUR TONE:
- Conversational and warm (like a trusted friend who's an expert)
- Explanatory - always include the "why" behind patterns
- Acknowledge challenges naturally (e.g., "It's tricky when...", "That 3-hour wake window was a stretch...")
- Use natural phrasing, not clinical statements
- Show you're reasoning through the data
- NO emojis, NO generic praise, NO robotic language

STRUCTURE (use natural transitions):
[Observation about pattern] → [Explain WHY this matters/what causes it] → [Specific action with timing]

EXCELLENT EXAMPLES (match this warmth and intelligence):
"It's so tricky when you expect a long rest and get a short one instead, especially after that long wake time. That 3-hour and 5min wake window was a big stretch for him, which can sometimes lead to a shorter nap like this 35min one as his sleep needs are shifting. Given that short rest, I would watch for his cues and aim for an earlier bedtime, perhaps about 2.5-3 hours from when he woke up."

"That first nap stretched beautifully to 2 hours after a reasonable wake window, which suggests ${babyName} was well-rested overnight. The second nap being only 40 minutes could mean he's consolidating more sleep into that morning nap. To protect bedtime, you could aim to put him down for a brief catnap around 4:15 PM."

"${babyName} woke up 30 minutes earlier than usual today at 6:15 AM, which shifts the whole day forward. You'll likely see tired cues for the first nap closer to 9:00 AM instead of the typical 9:30 AM. Expect all naps to fall about 30 minutes earlier to keep those wake windows from stretching too long."

"Bedtime has been drifting later this week (ranging from 6:45 to 8:20 PM), which can make mornings harder and create cumulative tiredness. That big variance of ${Math.round(bedtimeVariation)} minutes is making it tough for ${babyName}'s body clock to find rhythm. Try anchoring bedtime at 7:00 PM tonight regardless of afternoon naps."

${transitionInfo ? `"Looking at the last week, ${babyName} is naturally starting to stretch that first wake window longer—some days hitting 3+ hours. This is a sign the transition from ${predictedNapsToday} to ${predictedNapsToday - 1} naps might be on the horizon. Test a slightly longer morning window today (around 3h 15min) and watch how the afternoon unfolds."` : ''}

BAD EXAMPLES (never write like this - too clinical/sterile):
"Two naps complete, looking good!"
"${babyName} is doing great today!"
"Caleb has completed 2 of 3 predicted naps, with high bedtime variance indicating potential schedule instability."
"Pattern is consistent this week. Bedtime may vary tonight."

SCENARIO-SPECIFIC LOGIC:
${actualNapsToday === 0 ? '- Explain what to expect for nap 1 timing and why wake windows matter at this age' : ''}
${actualNapsToday > 0 && actualNapsToday < predictedNapsToday ? '- Analyze WHY the completed naps went that way (duration, timing, wake windows) and give specific guidance for what comes next' : ''}
${actualNapsToday >= predictedNapsToday ? '- Explain how today\'s naps set up bedtime and provide specific evening routine timing' : ''}
${bedtimeVariation > 30 ? `- Explain WHY high bedtime inconsistency (${Math.round(bedtimeVariation)} min) matters and give specific recommendation to anchor it` : ''}
${napsPerDayThisWeek !== napsPerDayLastWeek ? `- Acknowledge and EXPLAIN the shift from ${napsPerDayLastWeek} to ${napsPerDayThisWeek} naps and what it signals developmentally` : ''}
${transitionInfo ? '- Explain the transition signs you see in the data and provide concrete guidance for testing readiness' : ''}

Write your warm, intelligent, explanatory guidance NOW:`;

    const heroResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an emotionally intelligent baby sleep coach who explains patterns warmly and clearly. You think through the "why" behind sleep patterns and help parents understand what\'s happening. Use conversational language like you\'re talking to a friend, not clinical terminology. Always explain WHY patterns matter, not just WHAT is happening. No emojis.' },
          { role: 'user', content: heroPrompt }
        ],
      }),
    });

    if (!heroResponse.ok) {
      const errorText = await heroResponse.text();
      console.error('Hero insight error:', heroResponse.status, errorText);
      throw new Error('Failed to generate hero insight');
    }

    const heroData = await heroResponse.json();
    const heroInsight = heroData.choices[0].message.content.trim();

    // CALL 2: Generate "What To Do"
    const whatToDoPrompt = `${sharedContext}

TASK: Give 2-3 tips for ${babyName}'s ACTUAL pattern (${napsPerDayThisWeek} naps/day currently).

RULES:
- Use ONLY the numbers from "CRITICAL" section
- ALWAYS use "${babyName}" by name - NEVER say "Your baby", "the baby", "baby", or "your little one"
- Keep their ${napsPerDayThisWeek}-nap pattern (don't suggest changing to different number)
- Each tip: ONE sentence under 20 words
- NO bullets, numbers, dashes, markdown
- One tip per line

Example (use actual numbers):
"Keep ${babyName}'s ${napsPerDayThisWeek} naps at consistent times each day to reinforce the rhythm"
"Protect that ${aiPrediction?.predicted_bedtime || '7-8pm'} bedtime—it's working well for ${babyName}"
"Watch for ${babyName}'s sleepy cues and respond quickly during this ${transitionInfo ? 'adjustment phase' : 'phase'}"`;

    const whatToDoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a practical parenting coach who gives specific, actionable advice.' },
          { role: 'user', content: whatToDoPrompt }
        ],
      }),
    });

    if (!whatToDoResponse.ok) {
      const errorText = await whatToDoResponse.text();
      console.error('What to do error:', whatToDoResponse.status, errorText);
      throw new Error('Failed to generate what to do');
    }

    const whatToDoData = await whatToDoResponse.json();
    const whatToDoText = whatToDoData.choices[0].message.content.trim();
    // Parse lines, remove empty lines, and clean up any accidental bullets/numbers
    const whatToDo = whatToDoText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        // Remove common prefixes: bullets (•, -, *), numbers (1., 2.), quotes
        return line.replace(/^[\-\*\•]\s*/, '')
                   .replace(/^\d+\.\s*/, '')
                   .replace(/^["']|["']$/g, '')
                   .trim();
      });

    // CALL 3: Generate "What's Next"
    const whatsNextPrompt = `${sharedContext}

TASK: Predict what comes AFTER ${babyName}'s current ${napsPerDayThisWeek}-nap pattern.

RULES:
- Use ONLY the numbers from "CRITICAL" section
- ALWAYS use "${babyName}" by name - NEVER say "Your baby", "the baby", "baby", or "your little one"
- State current pattern first: "${babyName} is at ${napsPerDayThisWeek} naps/day"
- Then predict the NEXT stage (e.g., if at 3 naps, next is 2 naps)
- 2-3 sentences, 50-60 words
- NO markdown

Example logic:
- If ${napsPerDayThisWeek} = 4: "Since ${babyName} settled into 4 naps, expect this for 1-2 months before transitioning to 3 naps..."
- If ${napsPerDayThisWeek} = 3: "Since ${babyName} is at 3 naps, expect this through 8-9 months before moving to 2 naps..."
- If ${napsPerDayThisWeek} = 2: "Since ${babyName} is at 2 naps, this pattern typically holds until 15-18 months before the final drop to 1 nap..."`;

    const whatsNextResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a developmental expert who explains sleep milestones clearly.' },
          { role: 'user', content: whatsNextPrompt }
        ],
      }),
    });

    if (!whatsNextResponse.ok) {
      const errorText = await whatsNextResponse.text();
      console.error('Whats next error:', whatsNextResponse.status, errorText);
      throw new Error('Failed to generate whats next');
    }

    const whatsNextData = await whatsNextResponse.json();
    const whatsNext = whatsNextData.choices[0].message.content.trim()
      .replace(/\*\*/g, '') // Remove any bold markdown
      .replace(/\*/g, '');  // Remove any italic markdown

    // CALL 4: Generate "Prep Tip"  
    const prepTipPrompt = `${sharedContext}

TASK: ONE prep tip for ${babyName}'s NEXT transition after ${napsPerDayThisWeek} naps.

RULES:
- Use ONLY numbers from "CRITICAL" section
- ALWAYS use "${babyName}" by name - NEVER say "Your baby", "the baby", "baby", or "your little one"
- Prep for transition FROM ${napsPerDayThisWeek} naps TO ${napsPerDayThisWeek - 1} naps (the next drop)
- ONE sentence, 20-25 words
- NO markdown

Example logic:
- If ${napsPerDayThisWeek} = 4: "Watch for ${babyName} to resist the 4th nap consistently for 3-4 days before dropping to 3 naps"
- If ${napsPerDayThisWeek} = 3: "When ${babyName} fights the 3rd nap, extend wake windows by 15 minutes before moving to 2 naps"
- If ${napsPerDayThisWeek} = 2: "Track ${babyName}'s morning nap resistance as the first sign of readiness for 1 afternoon nap"`;

    const prepTipResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a forward-thinking parenting coach who gives specific prep tips.' },
          { role: 'user', content: prepTipPrompt }
        ],
      }),
    });

    if (!prepTipResponse.ok) {
      const errorText = await prepTipResponse.text();
      console.error('Prep tip error:', prepTipResponse.status, errorText);
      throw new Error('Failed to generate prep tip');
    }

    const prepTipData = await prepTipResponse.json();
    const prepTip = prepTipData.choices[0].message.content.trim()
      .replace(/\*\*/g, '') // Remove any bold markdown
      .replace(/\*/g, '')   // Remove any italic markdown
      .replace(/^["']|["']$/g, ''); // Remove quotes if present

    console.log('✅ Prep tip generated successfully');

    // CALL 5: Generate "Why This Matters"
    console.log('🔍 Generating why this matters explanation...');
    
    const whyThisMattersPrompt = `${sharedContext}

TASK: Explain why ${babyName}'s ACTUAL pattern (${napsPerDayThisWeek} naps/day, was ${napsPerDayLastWeek}/day) matters for development.

RULES:
- Use ONLY the numbers from "CRITICAL" section above
- ALWAYS use "${babyName}" by name - NEVER say "Your baby", "the baby", "baby", or "your little one"
- Reference their ACTUAL shift: "${napsPerDayLastWeek} to ${napsPerDayThisWeek} naps"
- MAXIMUM 100 characters total (strict limit for UI display)
- 1-2 short sentences ONLY
- NO markdown

Example (adjust to actual numbers):
"${babyName}'s ${napsPerDayThisWeek}-nap pattern shows maturing wake windows and developing circadian rhythms."`;

    const whyThisMattersResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a developmental expert who explains why understanding sleep patterns is important.' },
          { role: 'user', content: whyThisMattersPrompt }
        ],
      }),
    });

    if (!whyThisMattersResponse.ok) {
      const errorText = await whyThisMattersResponse.text();
      console.error('Why this matters error:', whyThisMattersResponse.status, errorText);
      throw new Error('Failed to generate why this matters');
    }

    const whyThisMattersData = await whyThisMattersResponse.json();
    const whyThisMatters = whyThisMattersData.choices[0].message.content.trim()
      .replace(/\*\*/g, '') // Remove any bold markdown
      .replace(/\*/g, '')   // Remove any italic markdown
      .replace(/^["']|["']$/g, ''); // Remove quotes if present

    console.log('✅ Why this matters generated successfully');

    return new Response(
      JSON.stringify({
        heroInsight,
        whatToDo,
        whatsNext,
        prepTip,
        whyThisMatters,
        confidenceScore,
        dataQuality: {
          dataPoints,
          bedtimeVariation: Math.round(bedtimeVariation),
          napsPerDayThisWeek,
          napsPerDayLastWeek,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-rhythm-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
