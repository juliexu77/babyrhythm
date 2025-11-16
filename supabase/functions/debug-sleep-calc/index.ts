import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { householdId } = await req.json();

    // Fetch last 7 days of activities
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('household_id', householdId)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .in('type', ['nap', 'sleep']);

    if (error) throw error;

    // Get night sleep settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('night_sleep_start_hour, night_sleep_end_hour')
      .eq('user_id', (await supabase.from('collaborators').select('user_id').eq('household_id', householdId).limit(1).single()).data.user_id)
      .single();

    const nightSleepStartHour = profile?.night_sleep_start_hour ?? 19;
    const nightSleepEndHour = profile?.night_sleep_end_hour ?? 7;

    // Process activities
    const napActivities = activities?.filter(a => a.type === 'nap') || [];
    
    // Helper to get event date
    const getEventDate = (activity: any): string | null => {
      if (activity.details?.date_local) return activity.details.date_local;
      if (activity.logged_at) return activity.logged_at.split('T')[0];
      return null;
    };

    // Helper to parse time
    const parseTimeToMinutes = (timeStr: string): number => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    };

    const parseTimeToHour = (timeStr: string): number | null => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return null;
      let hours = parseInt(match[1]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours;
    };

    // Classify daytime vs night naps
    const isDaytimeNap = (nap: any): boolean => {
      if (!nap.details?.startTime) return false;
      const startHour = parseTimeToHour(nap.details.startTime);
      if (startHour === null) return false;
      return startHour >= nightSleepEndHour && startHour < nightSleepStartHour;
    };

    const nightSleeps = napActivities.filter(nap => !isDaytimeNap(nap));

    // Count unique dates
    const uniqueDates = new Set<string>();
    napActivities.forEach(nap => {
      const eventDate = getEventDate(nap);
      if (eventDate) uniqueDates.add(eventDate);
    });

    const daysWithData = uniqueDates.size || 1;

    // Calculate night sleep durations
    const nightSleepDetails: any[] = [];
    let totalNightSleepMinutes = 0;

    nightSleeps.forEach(sleep => {
      if (sleep.details?.startTime && sleep.details?.endTime) {
        const startMinutes = parseTimeToMinutes(sleep.details.startTime);
        const endMinutes = parseTimeToMinutes(sleep.details.endTime);
        
        let duration = endMinutes - startMinutes;
        if (duration < 0) duration += 24 * 60;
        
        nightSleepDetails.push({
          date: getEventDate(sleep),
          start: sleep.details.startTime,
          end: sleep.details.endTime,
          durationMin: duration,
          durationHr: (duration / 60).toFixed(2)
        });
        
        totalNightSleepMinutes += duration;
      }
    });

    const avgNightSleepHours = totalNightSleepMinutes / 60 / daysWithData;

    return new Response(JSON.stringify({
      householdId,
      queryStartDate: sevenDaysAgo.toISOString(),
      nightSleepWindow: { start: nightSleepStartHour, end: nightSleepEndHour },
      totalActivities: activities?.length,
      totalNaps: napActivities.length,
      nightSleepsFound: nightSleeps.length,
      uniqueDatesWithData: Array.from(uniqueDates).sort(),
      daysWithData,
      nightSleepDetails,
      totalNightSleepMinutes,
      avgNightSleepHours: avgNightSleepHours.toFixed(2)
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});