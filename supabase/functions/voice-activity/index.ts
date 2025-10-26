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
      "time": ISO 8601 timestamp (default to current time if not specified)
    }
  ]
}

CRITICAL: 
- If user mentions "woke up", "wake up", "awake", "up at", this should ALWAYS be type "wake" to end an ongoing sleep.
- If user describes MULTIPLE activities, return them ALL in the activities array in chronological order
- Each activity should have its own time based on when it occurred

FEEDING RULES:
- User may say "fed", "ate", "nursed", "breastfed" for ANY type of feeding
- Determine type by CONTEXT not keywords:
  * If volume mentioned (ml, oz, bottle) → feedType="bottle", use "amount" + "unit"
  * If duration + side mentioned (minutes, left, right, both sides) → feedType="breast", use "duration" + "side"
  * Keywords "nursed", "nursing", "breast" → feedType="breast"
- Bottle feeding: Use "amount" + "unit" (ml/oz), feedType="bottle"
- Nursing/breastfeeding: Use "duration" (minutes) + "side" (left/right/both), feedType="breast"

Examples:
- "Fed 120ml bottle" → {"activities":[{"type":"feed","details":{"amount":120,"unit":"ml","feedType":"bottle"},"time":"2025-01-26T10:30:00Z"}]}
- "Woke up at 7am, ate 200ml, and fell asleep at 9am" → {"activities":[{"type":"wake","details":{},"time":"2025-01-26T07:00:00Z"},{"type":"feed","details":{"amount":200,"unit":"ml","feedType":"bottle"},"time":"2025-01-26T07:00:00Z"},{"type":"nap","details":{"quality":"good"},"time":"2025-01-26T09:00:00Z"}]}
- "Nursed 10 minutes left side and dirty diaper" → {"activities":[{"type":"feed","details":{"duration":10,"feedType":"breast","side":"left"},"time":"2025-01-26T10:30:00Z"},{"type":"diaper","details":{"type":"dirty"},"time":"2025-01-26T10:30:00Z"}]}
- "Ate 4 oz bottle" → {"activities":[{"type":"feed","details":{"amount":4,"unit":"oz","feedType":"bottle"},"time":"2025-01-26T10:30:00Z"}]}
- "Baby seems fussy today" → {"activities":[{"type":"note","details":{"text":"Baby seems fussy today"},"time":"2025-01-26T10:30:00Z"}]}`
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
