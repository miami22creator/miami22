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

    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    if (!FINNHUB_API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    console.log('Starting prediction validation...');

    // Obtener señales de hace 5 días (120 horas) para validar
    // Las opciones semanales típicamente expiran en 5 días
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: signals, error: signalsError } = await supabaseClient
      .from('trading_signals')
      .select(`
        id,
        asset_id,
        signal,
        price,
        confidence,
        created_at,
        assets!inner (
          symbol,
          type
        )
      `)
      .gte('created_at', sixDaysAgo)
      .lte('created_at', fiveDaysAgo)
      .order('created_at', { ascending: false });

    if (signalsError) throw signalsError;

    console.log(`Found ${signals?.length || 0} signals to validate`);

    let validatedCount = 0;
    let correctPredictions = 0;

    // Validar cada señal
    for (const signal of signals || []) {
      try {
        const asset = Array.isArray(signal.assets) ? signal.assets[0] : signal.assets;
        
        // Obtener precio actual
        const finnhubSymbol = convertToFinnhubSymbol(
          asset.symbol, 
          asset.type
        );
        
        const currentPrice = await fetchCurrentPrice(finnhubSymbol, FINNHUB_API_KEY);
        
        if (!currentPrice) {
          console.log(`No current price for ${asset.symbol}`);
          continue;
        }

        // Calcular cambio de precio después de 5 días
        const priceChange = ((currentPrice - signal.price) / signal.price) * 100;
        
        // Determinar si la predicción fue correcta (horizonte de 5 días)
        // CALL = esperamos que suba (cambio positivo > 2% en 5 días)
        // PUT = esperamos que baje (cambio negativo < -2% en 5 días)
        // NEUTRAL = se mantiene estable (variación < 2% en 5 días)
        let predictionCorrect = false;
        
        if (signal.signal === 'CALL' && priceChange > 2) {
          predictionCorrect = true;
        } else if (signal.signal === 'PUT' && priceChange < -2) {
          predictionCorrect = true;
        } else if (signal.signal === 'NEUTRAL' && Math.abs(priceChange) <= 2) {
          predictionCorrect = true;
        }

        if (predictionCorrect) {
          correctPredictions++;
        }

        console.log(
          `${asset.symbol}: ${signal.signal} @ $${signal.price} -> $${currentPrice} ` +
          `(${priceChange.toFixed(2)}%) = ${predictionCorrect ? 'CORRECT' : 'INCORRECT'}`
        );

        // Obtener posts sociales relacionados con este asset en el período (24h antes de la señal)
        const { data: relatedPosts } = await supabaseClient
          .from('social_posts')
          .select('id, influencer_id, sentiment_label')
          .eq('asset_id', signal.asset_id)
          .lte('posted_at', signal.created_at)
          .gte('posted_at', new Date(new Date(signal.created_at).getTime() - 24 * 60 * 60 * 1000).toISOString());

        // Crear registros de correlación para cada post (si hay posts relacionados)
        if (relatedPosts && relatedPosts.length > 0) {
          for (const post of relatedPosts) {
            const { error: corrError } = await supabaseClient
              .from('price_correlations')
              .insert({
                post_id: post.id,
                asset_id: signal.asset_id,
                price_before: signal.price,
                price_after: currentPrice,
                price_change_percent: priceChange,
                prediction_correct: predictionCorrect,
                time_to_impact_hours: 120,
                measured_at: new Date().toISOString(),
                signal_type: signal.signal,
                signal_confidence: signal.confidence
              });

            if (corrError) {
              console.error('Error saving correlation:', corrError);
            }
          }

          // Actualizar accuracy de influencers
          await updateInfluencerAccuracy(supabaseClient, relatedPosts, predictionCorrect);
        } else {
          // Si no hay posts relacionados, crear correlación directa de la señal
          const { error: corrError } = await supabaseClient
            .from('price_correlations')
            .insert({
              post_id: '00000000-0000-0000-0000-000000000000', // UUID placeholder
              asset_id: signal.asset_id,
              price_before: signal.price,
              price_after: currentPrice,
              price_change_percent: priceChange,
              prediction_correct: predictionCorrect,
              time_to_impact_hours: 120,
              measured_at: new Date().toISOString(),
              signal_type: signal.signal,
              signal_confidence: signal.confidence
            });

          if (corrError) {
            console.error('Error saving direct signal correlation:', corrError);
          }
        }

        validatedCount++;

      } catch (err) {
        console.error(`Error validating signal ${signal.id}:`, err);
      }
    }

    const accuracy = validatedCount > 0 
      ? ((correctPredictions / validatedCount) * 100).toFixed(2) 
      : 0;

    console.log(`Validation complete: ${correctPredictions}/${validatedCount} correct (${accuracy}%)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        validated: validatedCount,
        correct: correctPredictions,
        accuracy: parseFloat(accuracy as string)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-predictions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function convertToFinnhubSymbol(symbol: string, type: string): string {
  if (type === 'crypto') {
    const cryptoMap: Record<string, string> = {
      'ETH': 'BINANCE:ETHUSDT',
      'AVAX': 'BINANCE:AVAXUSDT',
      'LINK': 'BINANCE:LINKUSDT'
    };
    return cryptoMap[symbol] || `BINANCE:${symbol}USDT`;
  }
  return symbol;
}

async function fetchCurrentPrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.c || null; // current price
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

async function updateInfluencerAccuracy(
  supabaseClient: any, 
  posts: any[], 
  wasCorrect: boolean
) {
  // Agrupar posts por influencer
  const influencerPosts = new Map<string, number>();
  
  for (const post of posts) {
    const count = influencerPosts.get(post.influencer_id) || 0;
    influencerPosts.set(post.influencer_id, count + 1);
  }

  // Actualizar cada influencer
  for (const [influencerId, postCount] of influencerPosts) {
    const { data: influencer } = await supabaseClient
      .from('influencers')
      .select('total_predictions, correct_predictions')
      .eq('id', influencerId)
      .single();

    if (influencer) {
      const newTotal = (influencer.total_predictions || 0) + postCount;
      const newCorrect = (influencer.correct_predictions || 0) + (wasCorrect ? postCount : 0);
      const newAccuracy = (newCorrect / newTotal) * 100;

      await supabaseClient
        .from('influencers')
        .update({
          total_predictions: newTotal,
          correct_predictions: newCorrect,
          accuracy_score: newAccuracy
        })
        .eq('id', influencerId);

      console.log(
        `Updated influencer ${influencerId}: ` +
        `${newCorrect}/${newTotal} = ${newAccuracy.toFixed(2)}%`
      );
    }
  }
}
