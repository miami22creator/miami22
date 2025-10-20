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

    console.log('Fetching market news from Finnhub...');

    // Obtener noticias generales del mercado
    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`
    );

    if (!newsResponse.ok) {
      throw new Error(`Finnhub API error: ${newsResponse.status}`);
    }

    const news = await newsResponse.json();
    console.log(`Fetched ${news.length} news articles`);

    // Obtener todos los activos activos
    const { data: assets } = await supabaseClient
      .from('assets')
      .select('id, symbol, name')
      .eq('active', true);

    const newsToInsert = [];
    const processedUrls = new Set();

    for (const article of news) {
      // Evitar duplicados
      if (processedUrls.has(article.url)) continue;
      processedUrls.add(article.url);

      // Verificar si ya existe en la BD
      const { data: existing } = await supabaseClient
        .from('market_news')
        .select('id')
        .eq('url', article.url)
        .single();

      if (existing) continue;

      // Análisis de sentimiento simple basado en palabras clave
      const sentiment = analyzeSentiment(article.headline + ' ' + article.summary);

      // Buscar activos relacionados
      let relatedAsset = null;
      for (const asset of assets || []) {
        if (
          article.headline.toLowerCase().includes(asset.symbol.toLowerCase()) ||
          article.headline.toLowerCase().includes(asset.name.toLowerCase()) ||
          (article.summary && article.summary.toLowerCase().includes(asset.symbol.toLowerCase()))
        ) {
          relatedAsset = asset;
          break;
        }
      }

      // Extraer keywords
      const keywords = extractKeywords(article.headline);

      newsToInsert.push({
        asset_id: relatedAsset?.id || null,
        headline: article.headline,
        summary: article.summary || '',
        source: article.source,
        url: article.url,
        published_at: new Date(article.datetime * 1000).toISOString(),
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
        relevance_score: relatedAsset ? 0.8 : 0.3,
        category: article.category || 'general',
        keywords: keywords
      });
    }

    if (newsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('market_news')
        .insert(newsToInsert);

      if (insertError) {
        console.error('Error inserting news:', insertError);
        throw insertError;
      }

      console.log(`Inserted ${newsToInsert.length} new articles`);
    } else {
      console.log('No new articles to insert');
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: news.length,
        inserted: newsToInsert.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching market news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeSentiment(text: string): { score: number; label: string } {
  const positive = ['bull', 'bullish', 'gain', 'surge', 'rally', 'rise', 'jump', 'growth', 'profit', 'strong', 'positive', 'up', 'high', 'beat', 'outperform', 'upgrade'];
  const negative = ['bear', 'bearish', 'loss', 'drop', 'fall', 'decline', 'plunge', 'crash', 'weak', 'negative', 'down', 'low', 'miss', 'underperform', 'downgrade'];

  const lowerText = text.toLowerCase();
  let score = 0;

  positive.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });

  negative.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });

  // Normalizar entre -1 y 1
  score = Math.max(-1, Math.min(1, score));

  let label: string;
  if (score > 0.2) label = 'positive';
  else if (score < -0.2) label = 'negative';
  else label = 'neutral';

  return { score, label };
}

function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
  const words = text.toLowerCase().split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5);
  return [...new Set(words)];
}