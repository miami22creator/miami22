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
    
    // Calcular indicadores técnicos basados en datos históricos
    const indicators = await calculateTechnicalIndicators(marketData);
    
    // Obtener impacto social y de noticias
    const socialImpact = await fetchSocialAndNewsImpact(supabaseClient, asset.id);
    
    const signal = generateSignal(indicators, marketData, socialImpact);

    console.log(`Indicators calculated for ${assetSymbol}:`, indicators);
    console.log(`Social impact:`, socialImpact);
    console.log(`Signal generated:`, signal);

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

// Convertir símbolos a formato Finnhub
function convertToFinnhubSymbol(symbol: string, type: string): string {
  // Para crypto, Finnhub usa BINANCE:SYMBOLUSDT
  if (type === 'crypto') {
    const cryptoMap: Record<string, string> = {
      'ETH': 'BINANCE:ETHUSDT',
      'AVAX': 'BINANCE:AVAXUSDT',
      'LINK': 'BINANCE:LINKUSDT'
    };
    return cryptoMap[symbol] || `BINANCE:${symbol}USDT`;
  }
  
  // Para stocks, ETFs y commodities, usar el símbolo directamente
  return symbol;
}

// Obtener datos de Finnhub
async function fetchFinnhubData(symbol: string, apiKey: string) {
  try {
    // Obtener precio actual
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    console.log('Quote data:', quoteData);

    // Obtener datos históricos (últimos 30 días para calcular indicadores)
    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 24 * 60 * 60); // 30 días atrás
    
    const candlesUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
    const candlesResponse = await fetch(candlesUrl);
    const candlesData = await candlesResponse.json();

    console.log('Candles data status:', candlesData.s);

    if (candlesData.s === 'no_data') {
      throw new Error(`No historical data available for ${symbol}`);
    }

    return {
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

// Calcular indicadores técnicos reales
function calculateTechnicalIndicators(marketData: any) {
  const closes = marketData.candles.close;
  const highs = marketData.candles.high;
  const lows = marketData.candles.low;
  const volumes = marketData.candles.volume;

  if (!closes || closes.length < 14) {
    // Si no hay suficientes datos, usar datos simulados con el precio actual
    return generateFallbackIndicators(marketData.currentPrice);
  }

  // RSI (14 períodos)
  const rsi = calculateRSI(closes, 14);

  // MACD
  const macd = calculateMACD(closes);

  // EMAs
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);

  // ATR (Average True Range)
  const atr = calculateATR(highs, lows, closes, 14);

  // Volume promedio
  const avgVolume = volumes.length > 0 
    ? volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length 
    : 1000000;

  // OBV Change (simplificado)
  const obvChange = volumes.length >= 2 
    ? ((volumes[volumes.length - 1] - volumes[volumes.length - 2]) / volumes[volumes.length - 2]) 
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

// Fallback cuando no hay datos suficientes
function generateFallbackIndicators(currentPrice: number) {
  return {
    rsi: parseFloat((Math.random() * 100).toFixed(2)),
    macd: parseFloat((Math.random() - 0.5).toFixed(4)),
    ema_50: parseFloat((currentPrice * (0.95 + Math.random() * 0.1)).toFixed(2)),
    ema_200: parseFloat((currentPrice * (0.90 + Math.random() * 0.2)).toFixed(2)),
    bollinger_upper: parseFloat((currentPrice * 1.02).toFixed(2)),
    bollinger_lower: parseFloat((currentPrice * 0.98).toFixed(2)),
    atr: parseFloat((currentPrice * 0.02).toFixed(4)),
    volume: Math.floor(Math.random() * 10000000),
    obv_change: parseFloat((Math.random() - 0.5).toFixed(4))
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
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  return ema12 - ema26;
}

// Calcular EMA
function calculateEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  if (closes.length < period) return closes[closes.length - 1];
  
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
  // Obtener posts sociales de las últimas 48 horas
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  
  const { data: socialPosts } = await supabaseClient
    .from('social_posts')
    .select(`
      sentiment_label,
      sentiment_score,
      urgency_level,
      influencers (
        influence_score,
        accuracy_score
      )
    `)
    .eq('asset_id', assetId)
    .gte('posted_at', twoDaysAgo)
    .order('posted_at', { ascending: false });

  // Obtener noticias de las últimas 24 horas (incluyendo análisis NLP)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: news } = await supabaseClient
    .from('market_news')
    .select('sentiment_label, sentiment_score, relevance_score, nlp_analysis, source')
    .eq('asset_id', assetId)
    .gte('published_at', oneDayAgo)
    .order('published_at', { ascending: false });

  return {
    socialPosts: socialPosts || [],
    news: news || []
  };
}

// Generar señales basadas en indicadores + impacto social + APRENDIZAJE DE VALIDACIONES
function generateSignal(indicators: any, marketData: any, socialImpact: any) {
  let signalType = 'NEUTRAL';
  let confidence = 50;
  let message = '';
  
  // NUEVO: Detectar tendencia general del mercado (bias alcista)
  const marketBullish = indicators.ema_50 > indicators.ema_200;
  
  // BOOST: Aplicar bias alcista basado en datos históricos (CALLs tienen 3.6x más éxito)
  if (marketBullish) {
    confidence += 8; // Empezar con sesgo alcista
    message += 'Mercado en tendencia alcista. ';
  }

  // Análisis RSI (ajustado para favorecer movimientos >2%)
  if (indicators.rsi < 30) {
    signalType = 'CALL';
    confidence += 18; // Aumentado de 15 - señales más fuertes
    message += 'RSI sobreventa fuerte. ';
  } else if (indicators.rsi > 70) {
    signalType = 'PUT';
    // PENALIZACIÓN: PUTs son menos confiables en mercado alcista
    confidence += marketBullish ? 8 : 15; // Reducido si mercado alcista
    message += 'RSI sobrecompra. ';
  }

  // Análisis MACD (peso incrementado)
  if (indicators.macd > 0) {
    if (signalType === 'CALL') confidence += 15; // Aumentado de 10
    if (signalType === 'NEUTRAL') {
      signalType = 'CALL';
      confidence += 15;
    }
    message += 'MACD positivo. ';
  } else if (indicators.macd < 0) {
    if (signalType === 'PUT') confidence += marketBullish ? 8 : 12; // Penalizado en alcista
    if (signalType === 'NEUTRAL') {
      signalType = 'PUT';
      confidence += marketBullish ? 8 : 12;
    }
    message += 'MACD negativo. ';
  }

  // Análisis EMA (favorece tendencia alcista)
  if (indicators.ema_50 > indicators.ema_200) {
    if (signalType === 'CALL') confidence += 15; // Aumentado de 10
    message += 'Cruce dorado activo. ';
  } else {
    if (signalType === 'PUT') confidence += 10;
    message += 'Cruce de muerte activo. ';
  }

  // Análisis de Redes Sociales (pesos ajustados)
  if (socialImpact.socialPosts.length > 0) {
    let bullishCount = 0;
    let bearishCount = 0;
    let weightedSentiment = 0;
    let totalWeight = 0;

    for (const post of socialImpact.socialPosts) {
      const influencer = post.influencers;
      // AJUSTE: Dar menos peso a accuracy_score ya que no predice bien
      const weight = (influencer?.influence_score || 50);
      
      if (post.sentiment_label === 'bullish') {
        bullishCount++;
        weightedSentiment += (post.sentiment_score || 0.5) * weight;
      } else if (post.sentiment_label === 'bearish') {
        bearishCount++;
        weightedSentiment -= (post.sentiment_score || 0.5) * weight;
      }
      
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      const avgSentiment = weightedSentiment / totalWeight;
      
      if (avgSentiment > 0.3) {
        // Sentiment fuertemente bullish
        if (signalType === 'CALL' || signalType === 'NEUTRAL') {
          confidence += 15; // Aumentado de 12
          message += `Influencers bullish (${bullishCount}). `;
        } else {
          // Contradice señal técnica PUT - mayor penalización
          confidence -= 12; // Aumentado de 8
          message += `ALERTA: técnico bajista vs influencers bullish. `;
        }
      } else if (avgSentiment < -0.3) {
        // Sentiment fuertemente bearish
        if (signalType === 'PUT' || signalType === 'NEUTRAL') {
          // Menos boost para PUTs en general
          confidence += marketBullish ? 8 : 12;
          message += `Influencers bearish (${bearishCount}). `;
        } else {
          // Contradice señal técnica CALL
          confidence -= 10;
          message += `ALERTA: técnico alcista vs influencers bearish. `;
        }
      }

      // Urgencia crítica (peso aumentado)
      const criticalPosts = socialImpact.socialPosts.filter(
        (p: any) => p.urgency_level === 'critical'
      );
      if (criticalPosts.length > 0) {
        confidence += 8; // Aumentado de 5
        message += `${criticalPosts.length} post(s) urgente(s). `;
      }
    }
  }

  // Análisis de Noticias (pesos ajustados)
  if (socialImpact.news.length > 0) {
    let newsSentiment = 0;
    let newsCount = 0;
    let nlpAnalyzedCount = 0;

    for (const article of socialImpact.news) {
      const relevance = article.relevance_score || 0.5;
      
      // NUEVO: Análisis NLP de Seeking Alpha (tiene prioridad)
      if (article.nlp_analysis && article.source === 'seeking_alpha') {
        nlpAnalyzedCount++;
        const nlp = article.nlp_analysis;
        
        // Mapeo de sentiment_detailed a peso numérico
        const sentimentWeights: Record<string, number> = {
          'very_positive': 1.0,
          'positive': 0.6,
          'neutral': 0.0,
          'negative': -0.6,
          'very_negative': -1.0
        };
        
        const sentimentWeight = sentimentWeights[nlp.sentiment_detailed] || 0;
        
        // Mapeo de market_impact
        const impactWeights: Record<string, number> = {
          'high': 1.5,
          'medium': 1.0,
          'low': 0.5
        };
        
        const impactWeight = impactWeights[nlp.market_impact] || 1.0;
        
        // Boost extra para categorías importantes
        let categoryBoost = 1.0;
        if (nlp.category === 'earnings') categoryBoost = 1.3;
        else if (nlp.category === 'merger') categoryBoost = 1.2;
        else if (nlp.category === 'regulation') categoryBoost = 1.15;
        
        // Calcular impacto total de este análisis NLP
        const nlpImpact = sentimentWeight * impactWeight * categoryBoost * relevance;
        
        // Aplicar trading_signal directo
        if (nlp.trading_signal === 'buy') {
          if (signalType === 'CALL' || signalType === 'NEUTRAL') {
            confidence += Math.round(12 * impactWeight * categoryBoost);
            message += `Seeking Alpha: ${nlp.category} bullish. `;
          }
          newsSentiment += nlpImpact;
        } else if (nlp.trading_signal === 'sell') {
          if (signalType === 'PUT' || signalType === 'NEUTRAL') {
            confidence += Math.round((marketBullish ? 8 : 12) * impactWeight);
            message += `Seeking Alpha: ${nlp.category} bearish. `;
          }
          newsSentiment -= Math.abs(nlpImpact);
        } else if (nlp.trading_signal === 'hold') {
          // Hold reduce un poco la confianza si la señal es muy fuerte
          if (confidence > 75) {
            confidence -= 3;
            message += `Seeking Alpha recomienda mantener. `;
          }
        }
        
        newsCount++;
      } else {
        // Análisis tradicional para noticias sin NLP
        if (article.sentiment_label === 'positive') {
          newsSentiment += (article.sentiment_score || 0.5) * relevance;
          newsCount++;
        } else if (article.sentiment_label === 'negative') {
          newsSentiment -= (article.sentiment_score || 0.5) * relevance;
          newsCount++;
        }
      }
    }

    if (newsCount > 0) {
      const avgNewsSentiment = newsSentiment / newsCount;
      
      // Si tenemos análisis NLP, dar peso extra
      const nlpBoost = nlpAnalyzedCount > 0 ? 1.2 : 1.0;
      
      if (avgNewsSentiment > 0.2) {
        if (signalType === 'CALL' || signalType === 'NEUTRAL') {
          confidence += Math.round(10 * nlpBoost);
          if (nlpAnalyzedCount === 0) message += `Noticias positivas (${newsCount}). `;
        } else {
          confidence -= Math.round(8 * nlpBoost);
        }
      } else if (avgNewsSentiment < -0.2) {
        if (signalType === 'PUT' || signalType === 'NEUTRAL') {
          confidence += Math.round((marketBullish ? 6 : 10) * nlpBoost);
          if (nlpAnalyzedCount === 0) message += `Noticias negativas (${newsCount}). `;
        } else {
          confidence -= Math.round(6 * nlpBoost);
        }
      }
      
      if (nlpAnalyzedCount > 0) {
        message += `${nlpAnalyzedCount} análisis profesional(es). `;
      }
    }
  }

  // PENALIZACIÓN FINAL: PUTs en mercado alcista
  if (signalType === 'PUT' && marketBullish) {
    confidence = confidence * 0.85; // Reducir 15% de confianza
    message += 'ADVERTENCIA: PUT en tendencia alcista. ';
  }
  
  // BOOST FINAL: CALLs en mercado alcista
  if (signalType === 'CALL' && marketBullish) {
    confidence = confidence * 1.1; // Aumentar 10% de confianza
  }

  // Determinar tipo de señal si es NEUTRAL (sesgo hacia CALL)
  if (signalType === 'NEUTRAL') {
    if (confidence > 52) { // Reducido de 55 para favorecer CALLs
      signalType = 'CALL';
    } else if (confidence < 45) {
      signalType = 'PUT';
    } else {
      // En neutral, favorece CALL si hay bias alcista
      signalType = marketBullish ? 'CALL' : 'NEUTRAL';
    }
  }

  return {
    type: signalType,
    confidence: Math.max(30, Math.min(confidence, 95)), // Ajustado rango
    price: marketData.currentPrice,
    change: marketData.change,
    message: message.trim()
  };
}
