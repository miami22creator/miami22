import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postText, assetSymbol } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing sentiment for text:', postText);

    // Análisis de sentiment con Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a financial sentiment analysis expert. Analyze social media posts about stocks and crypto. Return ONLY a JSON object with: sentiment_label (bullish/bearish/neutral), sentiment_score (-1 to 1), urgency_level (low/medium/high/critical), and reasoning (brief explanation).'
          },
          {
            role: 'user',
            content: `Analyze this post about ${assetSymbol}: "${postText}"`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_sentiment',
              description: 'Return sentiment analysis result',
              parameters: {
                type: 'object',
                properties: {
                  sentiment_label: {
                    type: 'string',
                    enum: ['bullish', 'bearish', 'neutral']
                  },
                  sentiment_score: {
                    type: 'number',
                    description: 'Score from -1 (very bearish) to 1 (very bullish)'
                  },
                  urgency_level: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical']
                  },
                  reasoning: {
                    type: 'string'
                  }
                },
                required: ['sentiment_label', 'sentiment_score', 'urgency_level', 'reasoning'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_sentiment' } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', aiResult);

    // Extraer el análisis de la función llamada
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call found in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', analysis);

    // Buscar el asset
    const { data: asset } = await supabaseClient
      .from('assets')
      .select('id')
      .eq('symbol', assetSymbol)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          sentiment_label: analysis.sentiment_label,
          sentiment_score: analysis.sentiment_score,
          urgency_level: analysis.urgency_level,
          reasoning: analysis.reasoning,
          asset_id: asset?.id || null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
