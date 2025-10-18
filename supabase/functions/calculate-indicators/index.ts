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

    const { assetSymbol } = await req.json();

    // Obtener asset
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('symbol', assetSymbol)
      .single();

    if (assetError) throw assetError;

    // Simular cálculos de indicadores técnicos
    // En producción, estos datos vendrían de APIs como TradingView, Yahoo Finance, etc.
    const indicators = calculateTechnicalIndicators(assetSymbol);
    const signal = generateSignal(indicators);

    // Guardar indicadores
    const { error: indicatorError } = await supabaseClient
      .from('technical_indicators')
      .insert({
        asset_id: asset.id,
        ...indicators
      });

    if (indicatorError) throw indicatorError;

    // Guardar señal
    const { error: signalError } = await supabaseClient
      .from('trading_signals')
      .insert({
        asset_id: asset.id,
        signal: signal.type,
        confidence: signal.confidence,
        price: signal.price,
        change_percent: signal.change
      });

    if (signalError) throw signalError;

    // Si hay una señal fuerte, crear alerta
    if (signal.confidence >= 75) {
      await supabaseClient
        .from('alerts')
        .insert({
          asset_id: asset.id,
          signal_type: signal.type,
          message: signal.message,
          confidence: signal.confidence
        });
    }

    return new Response(
      JSON.stringify({ success: true, signal, indicators }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating indicators:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Función simulada para calcular indicadores técnicos
function calculateTechnicalIndicators(symbol: string) {
  // En producción, estos datos vendrían de APIs externas
  const baseRSI = Math.random() * 100;
  const baseMACD = (Math.random() - 0.5) * 2;
  
  return {
    rsi: parseFloat(baseRSI.toFixed(2)),
    macd: parseFloat(baseMACD.toFixed(4)),
    ema_50: parseFloat((Math.random() * 500 + 100).toFixed(2)),
    ema_200: parseFloat((Math.random() * 500 + 100).toFixed(2)),
    bollinger_upper: parseFloat((Math.random() * 500 + 150).toFixed(2)),
    bollinger_lower: parseFloat((Math.random() * 500 + 50).toFixed(2)),
    atr: parseFloat((Math.random() * 5).toFixed(4)),
    volume: Math.floor(Math.random() * 10000000),
    obv_change: parseFloat((Math.random() - 0.5).toFixed(4))
  };
}

// Función para generar señales basadas en indicadores
function generateSignal(indicators: any) {
  let signalType = 'NEUTRAL';
  let confidence = 50;
  let message = '';

  // Análisis RSI
  if (indicators.rsi < 30) {
    signalType = 'CALL';
    confidence += 15;
    message = 'RSI en zona de sobreventa. ';
  } else if (indicators.rsi > 70) {
    signalType = 'PUT';
    confidence += 15;
    message = 'RSI en zona de sobrecompra. ';
  }

  // Análisis MACD
  if (indicators.macd > 0) {
    if (signalType === 'CALL') confidence += 10;
    if (signalType === 'NEUTRAL') {
      signalType = 'CALL';
      confidence += 10;
    }
    message += 'MACD positivo. ';
  } else if (indicators.macd < 0) {
    if (signalType === 'PUT') confidence += 10;
    if (signalType === 'NEUTRAL') {
      signalType = 'PUT';
      confidence += 10;
    }
    message += 'MACD negativo. ';
  }

  // Análisis EMA
  if (indicators.ema_50 > indicators.ema_200) {
    if (signalType === 'CALL') confidence += 10;
    message += 'Cruce dorado detectado.';
  } else {
    if (signalType === 'PUT') confidence += 10;
    message += 'Cruce de muerte detectado.';
  }

  return {
    type: signalType,
    confidence: Math.min(confidence, 95),
    price: parseFloat((Math.random() * 500 + 50).toFixed(2)),
    change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
    message: message.trim()
  };
}
