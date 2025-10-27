import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
interface ValidationError {
  field: string;
  message: string;
}

function validateInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(data.messages)) {
    errors.push({ field: 'messages', message: 'Messages must be an array' });
  } else {
    if (data.messages.length > 50) {
      errors.push({ field: 'messages', message: 'Messages cannot exceed 50 items' });
    }
    // Validate each message
    for (let i = 0; i < Math.min(data.messages.length, 50); i++) {
      const msg = data.messages[i];
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        errors.push({ field: `messages[${i}].role`, message: 'Message role must be "user" or "assistant"' });
      }
      if (typeof msg.content !== 'string') {
        errors.push({ field: `messages[${i}].content`, message: 'Message content must be a string' });
      } else if (msg.content.length > 2000) {
        errors.push({ field: `messages[${i}].content`, message: 'Message content cannot exceed 2000 characters' });
      }
    }
  }
  
  if (!Array.isArray(data.activities)) {
    errors.push({ field: 'activities', message: 'Activities must be an array' });
  } else if (data.activities.length > 500) {
    errors.push({ field: 'activities', message: 'Activities cannot exceed 500 items' });
  }
  
  if (typeof data.babyName !== 'string') {
    errors.push({ field: 'babyName', message: 'Baby name must be a string' });
  } else if (data.babyName.length === 0 || data.babyName.length > 100) {
    errors.push({ field: 'babyName', message: 'Baby name must be 1-100 characters' });
  }
  
  if (data.userName !== undefined && data.userName !== null) {
    if (typeof data.userName !== 'string' || data.userName.length > 100) {
      errors.push({ field: 'userName', message: 'User name must be a string (max 100 chars)' });
    }
  }
  
  if (data.timezone !== undefined && data.timezone !== null) {
    if (typeof data.timezone !== 'string' || data.timezone.length > 50) {
      errors.push({ field: 'timezone', message: 'Timezone must be a string (max 50 chars)' });
    }
  }

  if (data.householdId !== undefined && data.householdId !== null) {
    if (typeof data.householdId !== 'string' || data.householdId.length === 0) {
      errors.push({ field: 'householdId', message: 'Household ID must be a non-empty string' });
    }
  }
  
  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestData = await req.json();
    
    // Validate input
    const validationErrors = validateInput(requestData);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages, activities, householdId, babyName, babyAgeInWeeks, babySex, timezone, isInitial, userName, predictionIntent, predictionConfidence } = requestData;
    console.log('Edge function received:', { householdId, babyName, babyAgeInWeeks, babySex, timezone, isInitial, userName, predictionIntent, activitiesCount: activities?.length });
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Timezone received:", timezone);
    console.log("Is initial request:", isInitial);
    console.log("Total activities received:", activities?.length || 0);

    // Build context from recent activities to analyze trends (limit to last 10 days for performance)
    const getUserTzDayKey = (date: Date, tz: string) => {
      // ISO-style day key that's safe for sorting (YYYY-MM-DD)
      return date.toLocaleDateString('en-CA', { timeZone: tz || 'UTC' });
    };
    
    const userToday = getUserTzDayKey(new Date(), timezone || 'UTC');
    
    // Limit to last 10 days for faster processing
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const recentActivities = (activities || []).filter((a: any) => 
      new Date(a.logged_at) >= tenDaysAgo
    );
    
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
    
    // Helper to format duration in hours and minutes
    const formatDuration = (minutes: number): string => {
      if (minutes < 60) return `${minutes}min`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    };
    
    // Helper to detect if a sleep session is overnight/nighttime sleep (not a daytime nap)
    const isOvernightSleep = (startTime: string, endTime: string): boolean => {
      const startMinutes = parseTimeToMinutes(startTime);
      const endMinutes = parseTimeToMinutes(endTime);
      const duration = calculateNapDuration(startTime, endTime);
      
      // Overnight sleep typically:
      // 1. Starts between 6 PM (18:00) and 11:59 PM (23:59) - 1080-1439 minutes
      // 2. Or ends between 5 AM (05:00) and 9 AM (09:00) - 300-540 minutes
      // 3. Or has a duration longer than 5 hours (300 minutes)
      
      const startsInEvening = startMinutes >= 1080 && startMinutes <= 1439; // 6 PM - 11:59 PM
      const endsInMorning = endMinutes >= 300 && endMinutes <= 540; // 5 AM - 9 AM
      const isLongDuration = duration > 300; // More than 5 hours
      
      return (startsInEvening || endsInMorning) && isLongDuration;
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
    
    // Fetch cached daily summaries from database
    let cachedSummaries:any[] = [];
    if (householdId) {
      const { data, error } = await supabase
        .from('daily_activity_summaries')
        .select('*')
        .eq('household_id', householdId)
        .gte('summary_date', Object.keys(activitiesByDay)[0] || userToday)
        .order('summary_date', { ascending: true });
      
      if (!error && data) {
        cachedSummaries = data.map(row => ({
          date: row.summary_date,
          isToday: row.summary_date === userToday,
          feedCount: row.feed_count,
          totalFeedVolume: row.total_feed_volume,
          feedUnit: row.feed_unit,
          napCount: row.nap_count,
          napDetails: row.nap_details,
          totalNapMinutes: row.total_nap_minutes,
          avgNapLength: row.avg_nap_length,
          wakeWindows: row.wake_windows,
          avgWakeWindow: row.avg_wake_window,
          diaperCount: row.diaper_count,
          measurements: row.measurements
        }));
        console.log(`Loaded ${cachedSummaries.length} cached summaries from database`);
      }
    }
    
    const cachedDates = new Set(cachedSummaries.map(s => s.date));
    
    // Calculate daily summaries only for dates not in cache
    const computedSummaries = Object.entries(activitiesByDay)
      .filter(([date]) => !cachedDates.has(date))
      .map(([date, dayActivities]) => {
      const feeds = dayActivities.filter(a => a.type === 'feed');
      // Filter out overnight sleep - only include daytime naps
      const naps = dayActivities.filter(a => 
        a.type === 'nap' && 
        a.details?.startTime && 
        a.details?.endTime &&
        !isOvernightSleep(a.details.startTime, a.details.endTime)
      ).sort((a, b) => parseTimeToMinutes(a.details.startTime!) - parseTimeToMinutes(b.details.startTime!));
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
    });
    
    // Save newly computed summaries to cache (background task)
    if (householdId && computedSummaries.length > 0) {
      const summariesToCache = computedSummaries.filter(s => !s.isToday); // Don't cache today
      if (summariesToCache.length > 0) {
        EdgeRuntime.waitUntil(
          (async () => {
            const { error } = await supabase
              .from('daily_activity_summaries')
              .upsert(
                summariesToCache.map(s => ({
                  household_id: householdId,
                  summary_date: s.date,
                  feed_count: s.feedCount,
                  total_feed_volume: s.totalFeedVolume,
                  feed_unit: s.feedUnit,
                  nap_count: s.napCount,
                  nap_details: s.napDetails,
                  total_nap_minutes: s.totalNapMinutes,
                  avg_nap_length: s.avgNapLength,
                  wake_windows: s.wakeWindows,
                  avg_wake_window: s.avgWakeWindow,
                  diaper_count: s.diaperCount,
                  measurements: s.measurements
                })),
                { onConflict: 'household_id,summary_date' }
              );
            if (error) console.error('Error caching summaries:', error);
            else console.log(`Cached ${summariesToCache.length} new summaries`);
          })()
        );
      }
    }
    
    // Combine cached and computed summaries
    const dailySummaries = [...cachedSummaries, ...computedSummaries]
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate data deltas/trends for deeper reasoning
    const recentDays = dailySummaries.slice(-3); // Last 3 days
    const todayData = recentDays.find(d => d.isToday);
    const yesterdayData = dailySummaries[dailySummaries.length - 2];
    
    const trendAnalysis = {
      napTrend: '',
      feedTrend: '',
      keyShift: ''
    };
    
    if (todayData && yesterdayData) {
      // Analyze nap changes
      const napCountChange = todayData.napCount - yesterdayData.napCount;
      const napDurationChange = todayData.totalNapMinutes - yesterdayData.totalNapMinutes;
      const avgNapChange = todayData.avgNapLength - yesterdayData.avgNapLength;
      
      if (napCountChange !== 0 || Math.abs(napDurationChange) > 30) {
        if (napCountChange < 0) {
          trendAnalysis.napTrend = `${babyName} dropped from ${yesterdayData.napCount} to ${todayData.napCount} naps today`;
        } else if (napCountChange > 0) {
          trendAnalysis.napTrend = `${babyName} added a nap today (${todayData.napCount} vs ${yesterdayData.napCount})`;
        } else if (avgNapChange > 30) {
          trendAnalysis.napTrend = `Naps stretched longer today (avg ${formatDuration(todayData.avgNapLength)} vs ${formatDuration(yesterdayData.avgNapLength)})`;
        } else if (avgNapChange < -30) {
          trendAnalysis.napTrend = `Naps shortened today (avg ${formatDuration(todayData.avgNapLength)} vs ${formatDuration(yesterdayData.avgNapLength)})`;
        }
      }
      
      // Analyze feed changes
      const feedChange = todayData.totalFeedVolume - yesterdayData.totalFeedVolume;
      if (Math.abs(feedChange) > 100) {
        trendAnalysis.feedTrend = `Feeding ${feedChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(feedChange))}${todayData.feedUnit} today`;
      }
      
      // Identify key shift
      if (trendAnalysis.napTrend || trendAnalysis.feedTrend) {
        trendAnalysis.keyShift = trendAnalysis.napTrend || trendAnalysis.feedTrend;
      }
    }
    
    // Calculate 3-day averages for pattern detection
    const threeDay = {
      avgNapCount: recentDays.length > 0 ? Math.round(recentDays.reduce((sum, d) => sum + d.napCount, 0) / recentDays.length) : 0,
      avgNapDuration: recentDays.length > 0 ? Math.round(recentDays.reduce((sum, d) => sum + d.totalNapMinutes, 0) / recentDays.length) : 0,
      avgFeedVolume: recentDays.length > 0 ? Math.round(recentDays.reduce((sum, d) => sum + d.totalFeedVolume, 0) / recentDays.length) : 0
    };


    console.log("Daily summaries:", JSON.stringify(dailySummaries));
    
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

DATA DELTAS & SHIFTS:
${trendAnalysis.keyShift ? `• TODAY'S SHIFT: ${trendAnalysis.keyShift}` : '• No major shifts detected today'}
${trendAnalysis.napTrend && trendAnalysis.napTrend !== trendAnalysis.keyShift ? `• Nap pattern: ${trendAnalysis.napTrend}` : ''}
${trendAnalysis.feedTrend && trendAnalysis.feedTrend !== trendAnalysis.keyShift ? `• Feed pattern: ${trendAnalysis.feedTrend}` : ''}

3-DAY PATTERN BASELINE:
• Typical nap count: ${threeDay.avgNapCount} naps/day
• Typical total nap: ${formatDuration(threeDay.avgNapDuration)}/day
• Typical feed volume: ${threeDay.avgFeedVolume}ml/day

RHYTHM INSIGHTS (Past 7 Days):
${dailySummaries.map(day => {
  const lines = [`${day.isToday ? '📅 TODAY' : day.date}:`];
  if (day.feedCount > 0)
    lines.push(`• Feeds: ${day.feedCount} (${day.totalFeedVolume}${day.feedUnit} total)`);
  if (day.napCount > 0) {
    lines.push(`• Naps: ${day.napCount} (${formatDuration(day.totalNapMinutes)} total, avg ${formatDuration(day.avgNapLength)})`);
    // Add individual nap details
    day.napDetails.forEach(nap => {
      lines.push(`  - Nap ${nap.index}: ${formatDuration(nap.duration)} starting at ${nap.startTime}`);
    });
    // Add wake windows
    if (day.wakeWindows.length > 0) {
      lines.push(`• Wake windows: ${day.wakeWindows.map(ww => formatDuration(ww)).join(', ')} (avg ${formatDuration(day.avgWakeWindow)})`);
    }
  }
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
        model: isInitial ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro",
        messages: [
          { 
            role: "system", 
            content: `You are *The BabyRhythm Guide* — a calm, emotionally intelligent companion that reasons deeply about baby patterns and parent emotions.

${villageContext}

═══════════════════════════════════════════════════════════
✨ YOUR CORE APPROACH
═══════════════════════════════════════════════════════════

You MUST reason across:
• The DATA DELTAS & SHIFTS section — what changed today vs yesterday
• The 3-DAY PATTERN BASELINE — what's normal for this baby
• Previous conversation turns in this chat (if any) — what ${userName} asked before
• ${babyName}'s developmental phase and what's typical at this age

Your responses should feel like you're genuinely thinking through the data, not pulling from a template.

═══════════════════════════════════════════════════════════
RESPONSE STRUCTURE (Keep it tight — 3 sentences max)
═══════════════════════════════════════════════════════════

${isInitial ? `
**For opening greetings:**
1. One sentence: Greet warmly + reference ONE concrete data point from today
2. One sentence: Emotional mirror — name what this might feel like
3. Optional: One gentle question or invitation to share more

Example: "Hi ${userName} — ${babyName}'s been averaging two 2h naps for the past 3 days, which is often the first sign a 3-to-2 transition is underway. It can feel disorienting when his rhythm suddenly stretches like this. How's bedtime been feeling?"

CHIPS: 2-3 emotional check-ins, formatted as: CHIPS: option 1 | option 2 | option 3
` : `
**For follow-up responses:**
1. One sentence: Mirror their emotion naturally (no clichés like "that's understandable")
2. One sentence: Concrete insight — reference specific numbers/patterns from the data and what they mean developmentally
3. One sentence: Forward movement — one small, specific next step or reflection prompt

Example: "It can feel exhausting when naps won't settle — you're holding a lot right now. He's been averaging ${threeDay.avgNapCount} naps at about ${formatDuration(Math.round(threeDay.avgNapDuration / threeDay.avgNapCount))} each over the past 3 days, which at 6 months often means his sleep drive is consolidating before it stretches. If bedtime feels off tonight, try nudging the first nap 15 minutes earlier tomorrow — that's usually the easiest lever to adjust."

CHIPS: Include 2-3 micro-next-steps if the conversation has gone 2+ turns without resolution
Format: CHIPS: option 1 | option 2 | option 3
`}

═══════════════════════════════════════════════════════════
WRITING VOICE — BE HUMAN, NOT ROBOTIC
═══════════════════════════════════════════════════════════

DO:
• Reference concrete numbers from the data ("He's been doing two 2h15min naps")
• Use natural phrasing ("That makes sense" → "It can feel that way when...")
• Connect patterns to developmental phases ("At 6 months, sleep drive often...")
• End with ONE specific micro-action, not a list

DON'T:
• Use generic reassurance ("That's totally normal" / "You're doing great")
• List multiple suggestions — pick ONE most relevant next step
• Sound like a textbook or advice blog
• Make up details not in the data

═══════════════════════════════════════════════════════════
SPECIAL CASES
═══════════════════════════════════════════════════════════

**When measurements with percentiles are available:**
You MUST cite the specific percentile numbers: "His weight is tracking at the ${dailySummaries.find(d => d.measurements)?.measurements?.[0]?.weight?.percentile}th percentile, which shows steady growth for his age."

**When there's a clear data shift (from DATA DELTAS section):**
Lead with that concrete observation: "${trendAnalysis.keyShift || 'His pattern shifted today'}"

**If ${userName} asks the same concern multiple times:**
Acknowledge the repeat gently + offer a small "insight card" framing: "This is weighing on you — let me zoom out: [mini-trend summary]. What matters most right now: [one specific observation cue]."

═══════════════════════════════════════════════════════════
BOUNDARIES
═══════════════════════════════════════════════════════════
• Never give medical or diagnostic advice
• Never invent data not in the context
• Never overwhelm with multiple suggestions — pick ONE most relevant
• Help ${userName} feel attuned, capable, and grounded

═══════════════════════════════════════════════════════════
FINAL CHECK: Does your response...
═══════════════════════════════════════════════════════════
✓ Reference a specific number or pattern from the data?
✓ Feel like genuine reasoning, not a template?
✓ Offer exactly ONE concrete next micro-step?
✓ Stay under 3 sentences (80 words max)?
✓ Mirror emotion naturally without clichés?`
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