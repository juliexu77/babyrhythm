import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
interface ValidationError {
  field: string;
  message: string;
}

function validateInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (typeof data.scheduleText !== 'string') {
    errors.push({ field: 'scheduleText', message: 'Schedule text must be a string' });
  } else if (data.scheduleText.length === 0) {
    errors.push({ field: 'scheduleText', message: 'Schedule text cannot be empty' });
  } else if (data.scheduleText.length > 10000) {
    errors.push({ field: 'scheduleText', message: 'Schedule text cannot exceed 10,000 characters' });
  }
  
  return errors;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
    
    const { scheduleText } = requestData;

    const systemPrompt = `You are a baby care assistant. Parse the user's natural language description of their baby's schedule into structured activities.

Return a JSON array of activities with this exact format:
[
  {
    "id": "unique_id",
    "type": "feed" | "diaper" | "nap" | "play" | "bath",
    "time": "HH:MM AM/PM",
    "details": {
      "quantity": "amount for feeds",
      "diaperType": "wet/soiled/both for diapers", 
      "startTime": "start time for naps",
      "endTime": "end time for naps",
      "activity": "description for play/bath"
    }
  }
]

Guidelines:
- Extract specific times mentioned
- Infer activity types from context (feeding = feed, bottle = feed, diaper change = diaper, sleep/nap = nap, etc.)
- For feeds, try to extract quantities if mentioned
- For diapers, determine if wet, soiled, or both
- For naps, extract start and end times if given
- Only include details relevant to each activity type
- Generate realistic IDs
- Keep times in 12-hour format with AM/PM`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: scheduleText }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let activities;
    try {
      activities = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse schedule response');
    }

    return new Response(JSON.stringify({ activities }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-schedule function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      activities: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});