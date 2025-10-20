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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { postText, influencerId } = await req.json();

    console.log('Analyzing post:', postText);

    // Analizar con Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Eres un experto en análisis de sentiment de mercados financieros. 
            Analiza posts de redes sociales y determina:
            1. sentiment_score: número entre -1 (muy bearish) y 1 (muy bullish)
            2. sentiment_label: 'bullish', 'bearish', o 'neutral'
            3. urgency_level: 'low', 'medium', 'high', o 'critical'
            4. mentioned_assets: array de símbolos de activos mencionados (ej: ['AAPL', 'TSLA'])
            5. reasoning: breve explicación del análisis
            
            Responde SOLO con JSON válido, sin texto adicional.`
          },
          {
            role: 'user',
            content: postText
          }
        ],
        tools: [
          {
            type: 'function',
            name: 'analyze_sentiment',
            description: 'Analiza el sentiment y urgencia de un post financiero',
            parameters: {
              type: 'object',
              properties: {
                sentiment_score: { 
                  type: 'number',
                  description: 'Score entre -1 (bearish) y 1 (bullish)'
                },
                sentiment_label: { 
                  type: 'string',
                  enum: ['bullish', 'bearish', 'neutral']
                },
                urgency_level: { 
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical']
                },
                mentioned_assets: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Símbolos de activos mencionados'
                },
                reasoning: {
                  type: 'string',
                  description: 'Breve explicación del análisis'
                }
              },
              required: ['sentiment_score', 'sentiment_label', 'urgency_level', 'mentioned_assets', 'reasoning'],
              additionalProperties: false
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_sentiment' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extraer análisis del tool call
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed analysis:', analysis);

    // Buscar asset_id si se menciona algún activo
    let assetId = null;
    if (analysis.mentioned_assets && analysis.mentioned_assets.length > 0) {
      const { data: asset } = await supabaseClient
        .from('assets')
        .select('id')
        .ilike('symbol', analysis.mentioned_assets[0])
        .single();
      
      assetId = asset?.id || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          sentiment_score: analysis.sentiment_score,
          sentiment_label: analysis.sentiment_label,
          urgency_level: analysis.urgency_level,
          asset_id: assetId,
          mentioned_assets: analysis.mentioned_assets,
          reasoning: analysis.reasoning
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
