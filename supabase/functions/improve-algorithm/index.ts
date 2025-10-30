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

    console.log('Starting algorithm improvement analysis...');

    // Obtener últimas 100 predicciones validadas (últimas 2-3 semanas)
    const { data: correlations, error: corrError } = await supabaseClient
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
      .not('prediction_correct', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (corrError) throw corrError;

    if (!correlations || correlations.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient data for analysis. Need at least 10 validated predictions.',
          count: correlations?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Analyzing ${correlations.length} validated predictions...`);

    // Calcular accuracy actual
    const totalPredictions = correlations.length;
    const correctPredictions = correlations.filter(c => c.prediction_correct).length;
    const currentAccuracy = (correctPredictions / totalPredictions) * 100;

    // Analizar por tipo de señal
    const signalAnalysis = {
      CALL: { total: 0, correct: 0 },
      PUT: { total: 0, correct: 0 },
      NEUTRAL: { total: 0, correct: 0 }
    };

    correlations.forEach(c => {
      if (c.signal_type && signalAnalysis[c.signal_type as keyof typeof signalAnalysis]) {
        signalAnalysis[c.signal_type as keyof typeof signalAnalysis].total++;
        if (c.prediction_correct) {
          signalAnalysis[c.signal_type as keyof typeof signalAnalysis].correct++;
        }
      }
    });

    // Analizar por nivel de confianza
    const confidenceAnalysis = {
      high: { total: 0, correct: 0, range: '>=80%' },
      medium: { total: 0, correct: 0, range: '60-79%' },
      low: { total: 0, correct: 0, range: '<60%' }
    };

    correlations.forEach(c => {
      const conf = c.signal_confidence || 0;
      if (conf >= 80) {
        confidenceAnalysis.high.total++;
        if (c.prediction_correct) confidenceAnalysis.high.correct++;
      } else if (conf >= 60) {
        confidenceAnalysis.medium.total++;
        if (c.prediction_correct) confidenceAnalysis.medium.correct++;
      } else {
        confidenceAnalysis.low.total++;
        if (c.prediction_correct) confidenceAnalysis.low.correct++;
      }
    });

    // Analizar por activo
    const assetPerformance = new Map<string, { total: number, correct: number }>();
    correlations.forEach(c => {
      const symbol = Array.isArray(c.assets) ? c.assets[0]?.symbol : c.assets?.symbol;
      if (!symbol) return;
      
      const current = assetPerformance.get(symbol) || { total: 0, correct: 0 };
      assetPerformance.set(symbol, {
        total: current.total + 1,
        correct: current.correct + (c.prediction_correct ? 1 : 0)
      });
    });

    const bestAssets = Array.from(assetPerformance.entries())
      .filter(([_, data]) => data.total >= 3)
      .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
      .slice(0, 5);

    const worstAssets = Array.from(assetPerformance.entries())
      .filter(([_, data]) => data.total >= 3)
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 5);

    // Usar Lovable AI para generar recomendaciones de mejora
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let aiRecommendations = '';
    let proposedChanges: any = {
      confidence_adjustment: 'maintain',
      signal_filters: [],
      asset_filters: []
    };

    if (LOVABLE_API_KEY) {
      try {
        const aiPrompt = `Eres un experto en machine learning y trading algorítmico. Analiza estos resultados de predicción y genera recomendaciones CONCRETAS Y ACCIONABLES para mejorar el algoritmo:

📊 MÉTRICAS ACTUALES:
- Accuracy General: ${currentAccuracy.toFixed(2)}%
- Total Predicciones: ${totalPredictions}

Por Tipo de Señal:
- CALL: ${signalAnalysis.CALL.correct}/${signalAnalysis.CALL.total} (${((signalAnalysis.CALL.correct/signalAnalysis.CALL.total)*100 || 0).toFixed(1)}%)
- PUT: ${signalAnalysis.PUT.correct}/${signalAnalysis.PUT.total} (${((signalAnalysis.PUT.correct/signalAnalysis.PUT.total)*100 || 0).toFixed(1)}%)
- NEUTRAL: ${signalAnalysis.NEUTRAL.correct}/${signalAnalysis.NEUTRAL.total} (${((signalAnalysis.NEUTRAL.correct/signalAnalysis.NEUTRAL.total)*100 || 0).toFixed(1)}%)

Por Nivel de Confianza:
- Alta (≥80%): ${confidenceAnalysis.high.correct}/${confidenceAnalysis.high.total} (${((confidenceAnalysis.high.correct/confidenceAnalysis.high.total)*100 || 0).toFixed(1)}%)
- Media (60-79%): ${confidenceAnalysis.medium.correct}/${confidenceAnalysis.medium.total} (${((confidenceAnalysis.medium.correct/confidenceAnalysis.medium.total)*100 || 0).toFixed(1)}%)
- Baja (<60%): ${confidenceAnalysis.low.correct}/${confidenceAnalysis.low.total} (${((confidenceAnalysis.low.correct/confidenceAnalysis.low.total)*100 || 0).toFixed(1)}%)

Mejores Activos:
${bestAssets.map(([symbol, data]) => `- ${symbol}: ${data.correct}/${data.total} (${((data.correct/data.total)*100).toFixed(1)}%)`).join('\n')}

Peores Activos:
${worstAssets.map(([symbol, data]) => `- ${symbol}: ${data.correct}/${data.total} (${((data.correct/data.total)*100).toFixed(1)}%)`).join('\n')}

Proporciona:
1. Diagnóstico de los principales problemas
2. 5-7 recomendaciones específicas y accionables
3. Ajustes numéricos recomendados (umbrales RSI, MACD, confianza mínima, etc.)
4. Qué activos evitar o priorizar
5. Estrategias para mejorar cada tipo de señal

Sé ESPECÍFICO con números y umbrales concretos.`;

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
                content: 'Eres un experto en optimización de algoritmos de trading. Da recomendaciones técnicas, específicas y numeradas con valores concretos.' 
              },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiRecommendations = aiData.choices[0].message.content;

          // Generar cambios propuestos basados en el análisis
          proposedChanges = {
            confidence_adjustment: currentAccuracy < 50 ? 'increase_minimum' : currentAccuracy > 70 ? 'maintain' : 'optimize',
            signal_filters: [
              signalAnalysis.CALL.total > 0 && (signalAnalysis.CALL.correct / signalAnalysis.CALL.total) < 0.4 ? 'reduce_CALL_sensitivity' : null,
              signalAnalysis.PUT.total > 0 && (signalAnalysis.PUT.correct / signalAnalysis.PUT.total) < 0.4 ? 'reduce_PUT_sensitivity' : null,
              signalAnalysis.NEUTRAL.total > 0 && (signalAnalysis.NEUTRAL.correct / signalAnalysis.NEUTRAL.total) < 0.3 ? 'reduce_NEUTRAL_signals' : null
            ].filter(Boolean),
            asset_filters: worstAssets.slice(0, 2).map(([symbol, data]) => ({
              symbol,
              action: 'reduce_weight',
              reason: `Low accuracy: ${((data.correct/data.total)*100).toFixed(1)}%`
            })),
            priority_assets: bestAssets.slice(0, 3).map(([symbol, data]) => ({
              symbol,
              action: 'increase_weight',
              reason: `High accuracy: ${((data.correct/data.total)*100).toFixed(1)}%`
            }))
          };
        }
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
        aiRecommendations = 'AI analysis temporarily unavailable';
      }
    }

    // Determinar versión
    const { data: lastImprovement } = await supabaseClient
      .from('algorithm_improvements')
      .select('version')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentVersion = lastImprovement?.version || 'v1.0.0';
    const versionParts = currentVersion.replace('v', '').split('.');
    const newVersion = `v${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`;

    // Guardar análisis de mejora
    const { error: saveError } = await supabaseClient
      .from('algorithm_improvements')
      .insert({
        version: newVersion,
        accuracy_before: currentAccuracy,
        accuracy_after: null, // Se actualizará en la próxima ejecución
        changes_made: proposedChanges,
        ai_recommendations: aiRecommendations,
        metrics: {
          signal_analysis: signalAnalysis,
          confidence_analysis: confidenceAnalysis,
          best_assets: bestAssets.map(([symbol, data]) => ({
            symbol,
            accuracy: ((data.correct / data.total) * 100).toFixed(2),
            total: data.total
          })),
          worst_assets: worstAssets.map(([symbol, data]) => ({
            symbol,
            accuracy: ((data.correct / data.total) * 100).toFixed(2),
            total: data.total
          }))
        }
      });

    if (saveError) {
      console.error('Error saving improvement:', saveError);
      throw saveError;
    }

    console.log(`✅ Algorithm analysis complete. Version: ${newVersion}, Accuracy: ${currentAccuracy.toFixed(2)}%`);

    return new Response(
      JSON.stringify({
        success: true,
        version: newVersion,
        current_accuracy: currentAccuracy,
        analysis: {
          signal_performance: signalAnalysis,
          confidence_performance: confidenceAnalysis,
          best_assets: bestAssets.map(([symbol, data]) => ({ symbol, ...data })),
          worst_assets: worstAssets.map(([symbol, data]) => ({ symbol, ...data }))
        },
        proposed_changes: proposedChanges,
        ai_recommendations: aiRecommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in improve-algorithm:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
