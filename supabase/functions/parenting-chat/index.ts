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
    
    // Build metrics context focusing only on non-zero activities
    const metricsContext = `
RECENT ACTIVITY SUMMARY for ${babyName || "baby"} (${babyAge || "unknown"} months old):

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

ANALYSIS FOCUS:
- Compare morning vs afternoon nap lengths and wake window variations
- Identify trends over multiple days and developmental patterns for ${babyAge} months
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

RESPONSE GUIDELINES:
- Focus on patterns and insights, not individual activities
- When today's data is limited, ALWAYS reference recent trends from previous days
- Discuss nap timing (morning vs afternoon) and wake window variations
- Provide developmental context for ${babyAge} months
- Keep responses concise - 3-4 key insights
- Format all durations as Hh Mmin (e.g., 1h 30min); under 60 as Nmin; never write "minutes"

${isInitial ? "Analyze nap patterns, wake windows, and feeding trends with developmental context. If today has limited data, reference patterns from recent days." : "Answer with pattern-focused insights. Reference recent trends when today's data is sparse."}`
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