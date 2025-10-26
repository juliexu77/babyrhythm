import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Parse the transcription using Lovable AI
    const parseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a baby activity parser. Extract structured activity data from voice transcriptions.
            
Current time: ${new Date().toISOString()}

Return ONLY valid JSON in this exact format:
{
  "activities": [
    {
      "type": "feed" | "diaper" | "nap" | "wake" | "note",
      "details": {
        // For bottle feed: { "amount": number, "unit": "ml" | "oz", "feedType": "bottle" }
        // For nursing/breast: { "duration": number (minutes), "feedType": "breast", "side": "left" | "right" | "both" }
        // For diaper: { "type": "wet" | "dirty" | "both" }
        // For nap: { "duration": number (minutes), "quality": "good" | "fair" | "poor" }
        // For wake: {} (ends ongoing sleep)
        // For note: { "text": string }
      },
      "time": ISO 8601 timestamp (MUST parse time from text, default to current time if not specified)
    }
  ]
}

CRITICAL TIME PARSING:
- Always extract times mentioned in the transcript (e.g., "at 7am", "7 AM", "at 9am")
- Convert times to ISO 8601 with today's date
- If no time specified, use current time
- "7am" or "7 AM" → set hour to 7, minute to 0
- "9:30am" → set hour to 9, minute to 30

CRITICAL DETAIL EXTRACTION:
- ALWAYS extract numbers for amounts (ml, oz) and durations (minutes, hours)
- "200ml" or "200 ml" → amount: 200, unit: "ml"
- "4oz" or "4 oz" → amount: 4, unit: "oz"
- "10 minutes" → duration: 10
- "2 hours" → duration: 120 (convert to minutes)

MULTIPLE ACTIVITIES:
- If user describes MULTIPLE activities, return them ALL in chronological order
- Each activity gets its appropriate time based on when it was mentioned

FEEDING RULES:
- User may say "fed", "ate", "nursed", "breastfed" for ANY type of feeding
- Determine type by CONTEXT:
  * If volume mentioned (ml, oz, bottle) → feedType="bottle", extract "amount" + "unit"
  * If duration + side mentioned → feedType="breast", extract "duration" + "side"

Examples:
- "Fed 120ml bottle" → {"activities":[{"type":"feed","details":{"amount":120,"unit":"ml","feedType":"bottle"},"time":"<current_time>"}]}
- "Woke up at 7am, ate 200ml, fell asleep at 9am" → {"activities":[{"type":"wake","details":{},"time":"<today_at_7am>"},{"type":"feed","details":{"amount":200,"unit":"ml","feedType":"bottle"},"time":"<today_at_7am>"},{"type":"nap","details":{"quality":"good"},"time":"<today_at_9am>"}]}
- "Nursed 10 minutes left side" → {"activities":[{"type":"feed","details":{"duration":10,"feedType":"breast","side":"left"},"time":"<current_time>"}]}`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "parse_activity",
            description: "Parse baby activities from transcription (can be multiple)",
            parameters: {
              type: "object",
              properties: {
                activities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["feed", "diaper", "nap", "wake", "note"]
                      },
                      details: {
                        type: "object"
                      },
                      time: {
                        type: "string",
                        format: "date-time"
                      }
                    },
                    required: ["type", "details", "time"],
                    additionalProperties: false
                  }
                }
              },
              required: ["activities"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "parse_activity" } }
      }),
    });

    if (!parseResponse.ok) {
      if (parseResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (parseResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const error = await parseResponse.text();
      console.error('Parse error:', error);
      throw new Error(`Parsing failed: ${error}`);
    }

    const parseResult = await parseResponse.json();
    const toolCall = parseResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No structured output from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        transcript,
        activities: result.activities 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice activity error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
