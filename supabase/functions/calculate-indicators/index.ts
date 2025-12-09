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

    const { assetSymbol } = await req.json();
    console.log(`Processing ${assetSymbol}...`);

    // Obtener asset
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('symbol', assetSymbol)
      .single();

    if (assetError) throw assetError;

    // Convertir símbolo para Finnhub (crypto usa formato diferente)
    const finnhubSymbol = convertToFinnhubSymbol(assetSymbol, asset.type);
    console.log(`Finnhub symbol: ${finnhubSymbol}`);

    // Obtener datos en tiempo real de Finnhub
    const marketData = await fetchFinnhubData(finnhubSymbol, FINNHUB_API_KEY);
    
    // MEJORA #1: No generar señal si no hay datos suficientes
    if (!marketData.hasEnoughData) {
      console.log(`Insufficient data for ${assetSymbol}, skipping signal generation`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          reason: 'Insufficient historical data',
          symbol: assetSymbol
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calcular indicadores técnicos basados en datos históricos
    const indicators = calculateTechnicalIndicators(marketData);
    
    // Obtener impacto social y de noticias
    const socialImpact = await fetchSocialAndNewsImpact(supabaseClient, asset.id);
    
    // MEJORA: Obtener histórico de accuracy para este activo
    const assetAccuracy = await getAssetAccuracy(supabaseClient, asset.id);
    
    const signal = generateSignal(indicators, marketData, socialImpact, assetAccuracy, asset.type);

    console.log(`Indicators calculated for ${assetSymbol}:`, indicators);
    console.log(`Asset accuracy history:`, assetAccuracy);
    console.log(`Social impact:`, socialImpact);
    console.log(`Signal generated:`, signal);

    // MEJORA #2: Solo guardar señal si tiene confianza suficiente y no es SKIP
    if (signal.type === 'SKIP') {
      console.log(`Signal skipped for ${assetSymbol}: ${signal.message}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: signal.message,
          indicators 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Guardar indicadores
    const { error: indicatorError } = await supabaseClient
      .from('technical_indicators')
      .insert({
        asset_id: asset.id,
        ...indicators
      });

    if (indicatorError) {
      console.error('Error saving indicators:', indicatorError);
      throw indicatorError;
    }

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

    if (signalError) {
      console.error('Error saving signal:', signalError);
      throw signalError;
    }

    // Si hay una señal fuerte (MEJORA: subir umbral a 80%), crear alerta
    if (signal.confidence >= 80) {
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

// Convertir símbolos a formato Finnhub
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

// Obtener datos de Finnhub
async function fetchFinnhubData(symbol: string, apiKey: string) {
  try {
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    console.log('Quote data:', quoteData);

    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 24 * 60 * 60);
    
    const candlesUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
    const candlesResponse = await fetch(candlesUrl);
    const candlesData = await candlesResponse.json();

    console.log('Candles data status:', candlesData.s);

    // MEJORA #1: Verificar si hay datos suficientes
    const hasEnoughData = candlesData.s === 'ok' && 
                          candlesData.c && 
                          candlesData.c.length >= 14;

    return {
      hasEnoughData,
      currentPrice: quoteData.c || 0,
      change: quoteData.dp || 0,
      high: quoteData.h || quoteData.c,
      low: quoteData.l || quoteData.c,
      open: quoteData.o || quoteData.c,
      previousClose: quoteData.pc || quoteData.c,
      candles: {
        close: candlesData.c || [],
        high: candlesData.h || [],
        low: candlesData.l || [],
        open: candlesData.o || [],
        volume: candlesData.v || [],
        timestamp: candlesData.t || []
      }
    };
  } catch (error) {
    console.error('Error fetching Finnhub data:', error);
    throw error;
  }
}

// MEJORA: Obtener accuracy histórico del activo
async function getAssetAccuracy(supabaseClient: any, assetId: string) {
  const { data } = await supabaseClient
    .from('price_correlations')
    .select('prediction_correct, signal_type, price_change_percent')
    .eq('asset_id', assetId)
    .not('prediction_correct', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!data || data.length < 10) {
    return { 
      hasHistory: false, 
      accuracy: 0,
      avgChange: 0,
      volatility: 'unknown',
      callAccuracy: 0,
      putAccuracy: 0
    };
  }

  const correct = data.filter((d: any) => d.prediction_correct).length;
  const calls = data.filter((d: any) => d.signal_type === 'CALL');
  const puts = data.filter((d: any) => d.signal_type === 'PUT');
  
  const callCorrect = calls.filter((d: any) => d.prediction_correct).length;
  const putCorrect = puts.filter((d: any) => d.prediction_correct).length;
  
  const changes = data.map((d: any) => Math.abs(d.price_change_percent || 0));
  const avgAbsChange = changes.reduce((a: number, b: number) => a + b, 0) / changes.length;
  
  // Determinar volatilidad
  let volatility = 'medium';
  if (avgAbsChange > 5) volatility = 'high';
  else if (avgAbsChange < 2) volatility = 'low';

  return {
    hasHistory: true,
    accuracy: (correct / data.length) * 100,
    avgChange: avgAbsChange,
    volatility,
    callAccuracy: calls.length > 0 ? (callCorrect / calls.length) * 100 : 0,
    putAccuracy: puts.length > 0 ? (putCorrect / puts.length) * 100 : 0
  };
}

// Calcular indicadores técnicos reales
function calculateTechnicalIndicators(marketData: any) {
  const closes = marketData.candles.close;
  const highs = marketData.candles.high;
  const lows = marketData.candles.low;
  const volumes = marketData.candles.volume;

  // RSI (14 períodos)
  const rsi = calculateRSI(closes, 14);

  // MACD
  const macd = calculateMACD(closes);

  // EMAs
  const ema50 = calculateEMA(closes, Math.min(50, closes.length));
  const ema200 = calculateEMA(closes, Math.min(200, closes.length));

  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);

  // ATR (Average True Range)
  const atr = calculateATR(highs, lows, closes, 14);

  // Volume promedio
  const avgVolume = volumes.length > 0 
    ? volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length 
    : 0;

  // OBV Change
  const obvChange = volumes.length >= 2 
    ? ((volumes[volumes.length - 1] - volumes[volumes.length - 2]) / (volumes[volumes.length - 2] || 1))
    : 0;

  return {
    rsi: parseFloat(rsi.toFixed(2)),
    macd: parseFloat(macd.toFixed(4)),
    ema_50: parseFloat(ema50.toFixed(2)),
    ema_200: parseFloat(ema200.toFixed(2)),
    bollinger_upper: parseFloat(bb.upper.toFixed(2)),
    bollinger_lower: parseFloat(bb.lower.toFixed(2)),
    atr: parseFloat(atr.toFixed(4)),
    volume: Math.floor(avgVolume),
    obv_change: parseFloat(obvChange.toFixed(4))
  };
}

// Calcular RSI
function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calcular MACD
function calculateMACD(closes: number[]): number {
  const ema12 = calculateEMA(closes, Math.min(12, closes.length));
  const ema26 = calculateEMA(closes, Math.min(26, closes.length));
  return ema12 - ema26;
}

// Calcular EMA
function calculateEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  if (closes.length < period) period = closes.length;
  
  const multiplier = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calcular Bollinger Bands
function calculateBollingerBands(closes: number[], period: number, stdDev: number) {
  if (closes.length < period) {
    const price = closes[closes.length - 1] || 100;
    return { upper: price * 1.02, lower: price * 0.98, middle: price };
  }
  
  const recentCloses = closes.slice(-period);
  const sma = recentCloses.reduce((a, b) => a + b, 0) / period;
  
  const squaredDiffs = recentCloses.map(close => Math.pow(close - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    lower: sma - (standardDeviation * stdDev),
    middle: sma
  };
}

// Calcular ATR
function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 1;
  
  const trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / period;
}

// Obtener impacto de redes sociales y noticias
async function fetchSocialAndNewsImpact(supabaseClient: any, assetId: string) {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  
  // MEJORA #3: Solo obtener posts de influencers con accuracy > 40%
  const { data: socialPosts } = await supabaseClient
    .from('social_posts')
    .select(`
      sentiment_label,
      sentiment_score,
      urgency_level,
      influencers!inner (
        influence_score,
        accuracy_score,
        total_predictions
      )
    `)
    .eq('asset_id', assetId)
    .gte('posted_at', twoDaysAgo)
    .order('posted_at', { ascending: false });

  // Filtrar posts de influencers con buen track record
  const filteredPosts = (socialPosts || []).filter((post: any) => {
    const influencer = post.influencers;
    // Solo considerar influencers con:
    // - Al menos 10 predicciones
    // - Accuracy > 40% (mejor que random)
    return influencer && 
           influencer.total_predictions >= 10 && 
           influencer.accuracy_score > 40;
  });

  console.log(`Filtered social posts: ${filteredPosts.length} of ${socialPosts?.length || 0} (only accuracy > 40%)`);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: news } = await supabaseClient
    .from('market_news')
    .select('sentiment_label, sentiment_score, relevance_score, nlp_analysis, source')
    .eq('asset_id', assetId)
    .gte('published_at', oneDayAgo)
    .order('published_at', { ascending: false });

  return {
    socialPosts: filteredPosts,
    allSocialPosts: socialPosts?.length || 0,
    filteredCount: filteredPosts.length,
    news: news || []
  };
}

// MEJORADO: Generar señales con lógica más conservadora
function generateSignal(
  indicators: any, 
  marketData: any, 
  socialImpact: any, 
  assetAccuracy: any,
  assetType: string
) {
  // MEJORA #4: Skippear activos crypto (muy volátiles, accuracy muy bajo)
  if (assetType === 'crypto') {
    return {
      type: 'SKIP',
      confidence: 0,
      price: marketData.currentPrice,
      change: marketData.change,
      message: 'Crypto assets skipped due to high volatility and low prediction accuracy'
    };
  }

  // MEJORA: Skippear activos con accuracy histórico muy bajo
  if (assetAccuracy.hasHistory && assetAccuracy.accuracy < 25) {
    return {
      type: 'SKIP',
      confidence: 0,
      price: marketData.currentPrice,
      change: marketData.change,
      message: `Asset skipped: historical accuracy ${assetAccuracy.accuracy.toFixed(1)}% is too low`
    };
  }

  let signalType = 'NEUTRAL';
  let confidence = 50;
  let reasons: string[] = [];
  
  // Tendencia del mercado
  const marketBullish = indicators.ema_50 > indicators.ema_200;
  const currentPrice = marketData.currentPrice;
  
  // MEJORA: Usar ATR para determinar volatilidad esperada
  const atrPercent = (indicators.atr / currentPrice) * 100;
  const isHighVolatility = atrPercent > 3;
  
  // Si es muy volátil, ser más conservador
  if (isHighVolatility && assetAccuracy.volatility === 'high') {
    confidence -= 10;
    reasons.push('High volatility detected');
  }

  // ===== ANÁLISIS RSI (PESO REDUCIDO) =====
  if (indicators.rsi < 25) {
    signalType = 'CALL';
    confidence += 12;
    reasons.push('RSI extreme oversold (<25)');
  } else if (indicators.rsi < 35) {
    if (signalType === 'NEUTRAL') signalType = 'CALL';
    confidence += 6;
    reasons.push('RSI oversold');
  } else if (indicators.rsi > 75) {
    signalType = 'PUT';
    confidence += 10;
    reasons.push('RSI extreme overbought (>75)');
  } else if (indicators.rsi > 65) {
    if (signalType === 'NEUTRAL') signalType = 'PUT';
    confidence += 5;
    reasons.push('RSI overbought');
  }

  // ===== ANÁLISIS MACD (PESO REDUCIDO) =====
  const macdStrength = Math.abs(indicators.macd);
  if (indicators.macd > 0 && macdStrength > 0.5) {
    if (signalType === 'CALL') confidence += 8;
    else if (signalType === 'NEUTRAL') {
      signalType = 'CALL';
      confidence += 6;
    }
    reasons.push('MACD bullish');
  } else if (indicators.macd < 0 && macdStrength > 0.5) {
    if (signalType === 'PUT') confidence += 8;
    else if (signalType === 'NEUTRAL') {
      signalType = 'PUT';
      confidence += 6;
    }
    reasons.push('MACD bearish');
  }

  // ===== ANÁLISIS EMA (PESO MODERADO) =====
  if (marketBullish) {
    if (signalType === 'CALL') confidence += 8;
    else if (signalType === 'PUT') confidence -= 5;
    reasons.push('Golden cross active');
  } else {
    if (signalType === 'PUT') confidence += 8;
    else if (signalType === 'CALL') confidence -= 5;
    reasons.push('Death cross active');
  }

  // ===== ANÁLISIS BOLLINGER (NUEVO) =====
  if (currentPrice <= indicators.bollinger_lower) {
    if (signalType === 'CALL') confidence += 10;
    else if (signalType === 'NEUTRAL') {
      signalType = 'CALL';
      confidence += 8;
    }
    reasons.push('Price at lower Bollinger band');
  } else if (currentPrice >= indicators.bollinger_upper) {
    if (signalType === 'PUT') confidence += 10;
    else if (signalType === 'NEUTRAL') {
      signalType = 'PUT';
      confidence += 8;
    }
    reasons.push('Price at upper Bollinger band');
  }

  // ===== ANÁLISIS REDES SOCIALES (PESO REDUCIDO, SOLO INFLUENCERS BUENOS) =====
  if (socialImpact.filteredCount > 0) {
    let bullishCount = 0;
    let bearishCount = 0;

    for (const post of socialImpact.socialPosts) {
      if (post.sentiment_label === 'bullish') bullishCount++;
      else if (post.sentiment_label === 'bearish') bearishCount++;
    }

    const netSentiment = bullishCount - bearishCount;
    
    if (netSentiment >= 2) {
      if (signalType === 'CALL') confidence += 5;
      reasons.push(`Reliable influencers bullish (${bullishCount})`);
    } else if (netSentiment <= -2) {
      if (signalType === 'PUT') confidence += 5;
      reasons.push(`Reliable influencers bearish (${bearishCount})`);
    }
  }

  // ===== ANÁLISIS NOTICIAS NLP (PESO MODERADO) =====
  if (socialImpact.news.length > 0) {
    let nlpScore = 0;
    let nlpCount = 0;

    for (const article of socialImpact.news) {
      if (article.nlp_analysis && article.source === 'seeking_alpha') {
        const nlp = article.nlp_analysis;
        
        if (nlp.trading_signal === 'buy') {
          nlpScore += 1;
          nlpCount++;
        } else if (nlp.trading_signal === 'sell') {
          nlpScore -= 1;
          nlpCount++;
        }
      }
    }

    if (nlpCount > 0) {
      const avgNlpScore = nlpScore / nlpCount;
      
      if (avgNlpScore > 0.5) {
        if (signalType === 'CALL') confidence += 8;
        reasons.push('Seeking Alpha analysis bullish');
      } else if (avgNlpScore < -0.5) {
        if (signalType === 'PUT') confidence += 8;
        reasons.push('Seeking Alpha analysis bearish');
      }
    }
  }

  // ===== AJUSTE POR HISTORIAL DEL ACTIVO =====
  if (assetAccuracy.hasHistory) {
    // Si el activo tiene mejor accuracy en CALLs, favorecerlos
    if (assetAccuracy.callAccuracy > assetAccuracy.putAccuracy + 10) {
      if (signalType === 'CALL') confidence += 5;
      else if (signalType === 'PUT') confidence -= 5;
      reasons.push('Historical CALL accuracy higher');
    } else if (assetAccuracy.putAccuracy > assetAccuracy.callAccuracy + 10) {
      if (signalType === 'PUT') confidence += 5;
      else if (signalType === 'CALL') confidence -= 5;
      reasons.push('Historical PUT accuracy higher');
    }
    
    // Activos muy estables -> preferir NEUTRAL
    if (assetAccuracy.volatility === 'low' && assetAccuracy.avgChange < 1.5) {
      if (signalType !== 'NEUTRAL') {
        confidence -= 10;
        reasons.push('Low volatility asset, NEUTRAL likely');
      }
    }
  }

  // ===== SEÑALES CONTRADICTORIAS =====
  // Si RSI dice CALL pero MACD dice bearish, reducir confianza
  if (signalType === 'CALL' && indicators.macd < -0.5) {
    confidence -= 8;
    reasons.push('Conflicting: RSI bullish but MACD bearish');
  } else if (signalType === 'PUT' && indicators.macd > 0.5) {
    confidence -= 8;
    reasons.push('Conflicting: RSI bearish but MACD bullish');
  }

  // ===== UMBRAL MÍNIMO DE CONFIANZA =====
  // MEJORA #5: Solo emitir señal si confianza > 65%
  if (confidence < 65) {
    signalType = 'NEUTRAL';
    reasons.push('Confidence below threshold (65%)');
  }

  // Limitar confianza
  confidence = Math.max(40, Math.min(confidence, 92));

  return {
    type: signalType,
    confidence,
    price: marketData.currentPrice,
    change: marketData.change,
    message: reasons.join('. ')
  };
}
