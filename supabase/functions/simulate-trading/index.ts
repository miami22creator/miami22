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
    const { capital, minConfidence, daysBack } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Simulating trading with capital: $${capital}, min confidence: ${minConfidence}%, days back: ${daysBack}`);

    // Obtener correlaciones históricas con señales
    const { data: historicalData, error: histError } = await supabaseClient
      .from('price_correlations')
      .select(`
        *,
        assets!inner (
          symbol,
          name,
          type
        )
      `)
      .not('signal_type', 'is', null)
      .not('price_after', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (histError) throw histError;

    console.log(`Found ${historicalData?.length || 0} historical predictions`);

    // Filtrar por confianza mínima si se especifica
    const filteredData = minConfidence 
      ? historicalData?.filter(d => (d.signal_confidence || 0) >= minConfidence)
      : historicalData;

    console.log(`After confidence filter: ${filteredData?.length || 0} predictions`);

    if (!filteredData || filteredData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No hay suficientes datos históricos con esa confianza mínima',
          recommendations: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calcular métricas de simulación
    const totalTrades = filteredData.length;
    const capitalPerTrade = capital / totalTrades;
    
    let totalGain = 0;
    const tradeResults = filteredData.map(trade => {
      const priceChange = trade.price_change_percent || 0;
      let tradeGain = 0;

      // Simular ganancia/pérdida según tipo de señal
      if (trade.signal_type === 'CALL' && priceChange > 0) {
        tradeGain = capitalPerTrade * (priceChange / 100);
      } else if (trade.signal_type === 'PUT' && priceChange < 0) {
        tradeGain = capitalPerTrade * (Math.abs(priceChange) / 100);
      } else if (trade.signal_type === 'NEUTRAL' && Math.abs(priceChange) < 2) {
        tradeGain = capitalPerTrade * 0.005; // Pequeña ganancia por estabilidad
      } else {
        // Pérdida
        tradeGain = -capitalPerTrade * (Math.abs(priceChange) / 100);
      }

      totalGain += tradeGain;

      return {
        symbol: Array.isArray(trade.assets) ? trade.assets[0]?.symbol : trade.assets?.symbol,
        signal: trade.signal_type,
        confidence: trade.signal_confidence,
        priceChange: priceChange,
        correct: trade.prediction_correct,
        gain: tradeGain,
        invested: capitalPerTrade
      };
    });

    const finalCapital = capital + totalGain;
    const roi = ((totalGain / capital) * 100);
    const correctTrades = filteredData.filter(t => t.prediction_correct).length;
    const accuracy = (correctTrades / totalTrades) * 100;

    // Agrupar por activo para identificar mejores/peores
    const assetPerformance = new Map<string, { total: number, correct: number, gain: number }>();
    tradeResults.forEach(t => {
      const current = assetPerformance.get(t.symbol) || { total: 0, correct: 0, gain: 0 };
      assetPerformance.set(t.symbol, {
        total: current.total + 1,
        correct: current.correct + (t.correct ? 1 : 0),
        gain: current.gain + t.gain
      });
    });

    const bestAssets = Array.from(assetPerformance.entries())
      .sort((a, b) => b[1].gain - a[1].gain)
      .slice(0, 5);

    const worstAssets = Array.from(assetPerformance.entries())
      .sort((a, b) => a[1].gain - b[1].gain)
      .slice(0, 5);

    // Usar Lovable AI para generar recomendaciones inteligentes
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let aiRecommendations = [];
    if (LOVABLE_API_KEY) {
      try {
        const aiPrompt = `Eres un analista de trading experto. Analiza estos resultados de simulación y da 3-5 recomendaciones accionables concretas:

Resultados:
- Capital inicial: $${capital}
- Capital final: $${finalCapital.toFixed(2)}
- ROI: ${roi.toFixed(2)}%
- Accuracy: ${accuracy.toFixed(2)}%
- Total trades: ${totalTrades}
- Confianza mínima: ${minConfidence}%

Mejores activos:
${bestAssets.map(([symbol, data]) => `- ${symbol}: ${data.correct}/${data.total} correctas, $${data.gain.toFixed(2)} ganancia`).join('\n')}

Peores activos:
${worstAssets.map(([symbol, data]) => `- ${symbol}: ${data.correct}/${data.total} correctas, $${data.gain.toFixed(2)} pérdida`).join('\n')}

Da recomendaciones específicas sobre:
1. Ajuste de confianza mínima
2. Qué activos evitar/priorizar
3. Gestión de riesgo
4. Timing de entrada/salida
5. Diversificación`;

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
                content: 'Eres un analista de trading experto. Da recomendaciones concretas, prácticas y numeradas. Cada recomendación debe ser accionable.' 
              },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const recommendations = aiData.choices[0].message.content;
          // Dividir en líneas y filtrar recomendaciones numeradas
          aiRecommendations = recommendations
            .split('\n')
            .filter((line: string) => /^\d+\./.test(line.trim()))
            .map((rec: string) => rec.trim());
        }
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
      }
    }

    const result = {
      simulation: {
        initialCapital: capital,
        finalCapital: finalCapital,
        totalGain: totalGain,
        roi: roi,
        accuracy: accuracy,
        totalTrades: totalTrades,
        correctTrades: correctTrades,
        minConfidence: minConfidence,
        daysBack: daysBack
      },
      bestAssets: bestAssets.map(([symbol, data]) => ({
        symbol,
        accuracy: ((data.correct / data.total) * 100).toFixed(2),
        totalTrades: data.total,
        gain: data.gain.toFixed(2)
      })),
      worstAssets: worstAssets.map(([symbol, data]) => ({
        symbol,
        accuracy: ((data.correct / data.total) * 100).toFixed(2),
        totalTrades: data.total,
        loss: data.gain.toFixed(2)
      })),
      tradeResults: tradeResults.slice(0, 10), // Solo las primeras 10 para el resumen
      aiRecommendations: aiRecommendations,
      recommendation: roi > 5 ? 'SAFE_TO_INVEST' : roi > 0 ? 'MODERATE_RISK' : 'HIGH_RISK'
    };

    console.log(`Simulation complete: ROI ${roi.toFixed(2)}%, Accuracy ${accuracy.toFixed(2)}%`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in simulate-trading:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});