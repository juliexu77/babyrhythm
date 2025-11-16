import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { householdId } = await req.json();

    if (!householdId) {
      throw new Error('householdId is required');
    }

    console.log(`Clearing schedule cache for household: ${householdId}`);

    // Delete cached schedule predictions for this household
    const { error } = await supabase
      .from('daily_schedule_predictions')
      .delete()
      .eq('household_id', householdId);

    if (error) {
      console.error('Error clearing schedule cache:', error);
      throw error;
    }

    console.log(`Successfully cleared schedule cache for household: ${householdId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Schedule cache cleared successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in clear-schedule-cache function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
