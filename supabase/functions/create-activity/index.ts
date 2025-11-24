import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationError {
  field: string;
  message: string;
}

function validateInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.household_id || typeof data.household_id !== 'string') {
    errors.push({ field: 'household_id', message: 'household_id is required' });
  }

  if (!data.type || !['feed', 'diaper', 'nap', 'note', 'measure', 'photo', 'solids'].includes(data.type)) {
    errors.push({ field: 'type', message: 'type must be one of: feed, diaper, nap, note, measure, photo, solids' });
  }

  if (!data.date_local || typeof data.date_local !== 'string') {
    errors.push({ field: 'date_local', message: 'date_local is required (YYYY-MM-DD)' });
  }

  if (!data.time_local || typeof data.time_local !== 'string') {
    errors.push({ field: 'time_local', message: 'time_local is required (HH:MM in 24h format) - represents when the ACTIVITY occurred, not when logged' });
  }

  if (!data.offset_minutes || typeof data.offset_minutes !== 'number') {
    errors.push({ field: 'offset_minutes', message: 'offset_minutes is required (number)' });
  }

  if (!data.tz || typeof data.tz !== 'string') {
    errors.push({ field: 'tz', message: 'tz is required (IANA timezone)' });
  }

  if (!data.details || typeof data.details !== 'object') {
    errors.push({ field: 'details', message: 'details is required (object)' });
  }

  return errors;
}

/**
 * SERVER-SIDE TIMEZONE CONVERSION
 * Single source of truth: interpret local date/time in IANA timezone to get UTC
 * 
 * CRITICAL: date_local and time_local represent when the ACTIVITY occurred,
 * NOT when it was logged. For naps started from a timer, this is the start time.
 * For feeds, this is when the feed occurred.
 * 
 * Since Deno edge functions don't have full IANA timezone database access without heavy dependencies,
 * we accept offset_minutes from client but validate and use it server-side.
 * 
 * This function:
 * 1. Takes local date/time + offset for when ACTIVITY occurred
 * 2. Computes UTC by applying the offset
 * 3. Returns UTC ISO string
 */
function localToUTC(
  dateLocal: string, 
  timeLocal: string, 
  offsetMinutes: number
): string {
  // Parse local date and time
  const [year, month, day] = dateLocal.split('-').map(Number);
  const [hour, minute] = timeLocal.split(':').map(Number);

  // Create a timestamp for the local time (treat as if UTC for now)
  const localAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  
  // Apply the timezone offset to get true UTC
  // offsetMinutes is how many minutes BEHIND UTC the timezone is
  // For PST (UTC-8), offsetMinutes = +480
  // So to convert local PST to UTC, we ADD 480 minutes (8 hours)
  const timestamp_utc_ms = localAsUTC + (offsetMinutes * 60 * 1000);
  
  const timestamp_utc = new Date(timestamp_utc_ms).toISOString();
  
  console.log('🕐 Server timezone conversion:', {
    input: { dateLocal, timeLocal, offsetMinutes },
    localAsUTC: new Date(localAsUTC).toISOString(),
    timestamp_utc
  });
  
  return timestamp_utc;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestData = await req.json();
    
    // Validate input
    const validationErrors = validateInput(requestData);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ errors: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { household_id, type, date_local, time_local, tz, offset_minutes, details, client_utc } = requestData;

    // SERVER COMPUTES UTC (single source of truth)
    const timestamp_utc = localToUTC(date_local, time_local, offset_minutes);

    // Guard: If client also sent UTC, validate it matches
    if (client_utc) {
      const clientTime = new Date(client_utc).getTime();
      const serverTime = new Date(timestamp_utc).getTime();
      const diffSeconds = Math.abs(clientTime - serverTime) / 1000;

      if (diffSeconds > 60) {
        console.warn('⚠️ TIME_MISMATCH detected:', {
          household_id,
          client_utc,
          server_utc: timestamp_utc,
          diff_seconds: diffSeconds
        });
        // Use server-computed UTC (override client)
      }
    }

    // Insert activity with server-computed UTC
    const { data, error } = await supabase
      .from('activities')
      .insert({
        household_id,
        type,
        logged_at: timestamp_utc,  // Server-computed UTC timestamp
        timezone: tz,               // IANA timezone
        details: {
          ...details,
          offset_minutes,           // Snapshot of offset at creation time
          date_local,               // Store original local parts for audit
          time_local
        },
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
