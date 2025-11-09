import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching market news from Seeking Alpha...');

    // Obtener noticias del mercado desde Seeking Alpha
    const newsResponse = await fetch('https://seeking-alpha.p.rapidapi.com/news/v2/list?size=20', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'seeking-alpha.p.rapidapi.com'
      }
    });

    if (!newsResponse.ok) {
      console.error('Seeking Alpha API error:', newsResponse.status);
      throw new Error(`Seeking Alpha API returned ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    console.log('Received news data from Seeking Alpha');

    // Obtener activos activos de la base de datos
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, name')
      .eq('active', true);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    let insertedCount = 0;
    const articles = newsData.data || [];

    for (const article of articles) {
      try {
        const articleId = article.id;
        const title = article.attributes?.title || '';
        const summary = article.attributes?.summary || '';
        const publishedAt = article.attributes?.publishOn || new Date().toISOString();
        const url = article.links?.self ? `https://seekingalpha.com${article.links.self}` : '';
        
        // Verificar si ya existe
        const { data: existing } = await supabase
          .from('market_news')
          .select('id')
          .eq('external_id', `sa_${articleId}`)
          .maybeSingle();

        if (existing) {
          console.log(`Article already exists: ${articleId}`);
          continue;
        }

        // Analizar sentimiento
        const sentiment = analyzeSentiment(title + ' ' + summary);
        
        // Identificar activos relacionados
        const relatedAssets = assets?.filter(asset => {
          const searchText = (title + ' ' + summary).toLowerCase();
          return searchText.includes(asset.symbol.toLowerCase()) || 
                 searchText.includes(asset.name.toLowerCase());
        }) || [];

        // Extraer keywords
        const keywords = extractKeywords(title);

        // Insertar en la base de datos
        const { error: insertError } = await supabase
          .from('market_news')
          .insert({
            external_id: `sa_${articleId}`,
            title: title,
            summary: summary,
            url: url,
            source: 'seeking_alpha',
            published_at: publishedAt,
            sentiment_score: sentiment.score,
            sentiment_label: sentiment.label,
            related_symbols: relatedAssets.map(a => a.symbol),
            keywords: keywords
          });

        if (!insertError) {
          insertedCount++;
          console.log(`Inserted Seeking Alpha article: ${title.substring(0, 50)}...`);
        } else {
          console.error('Error inserting article:', insertError);
        }
      } catch (articleError) {
        console.error('Error processing article:', articleError);
      }
    }

    console.log(`Successfully processed ${insertedCount} Seeking Alpha articles`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Fetched and processed ${articles.length} articles from Seeking Alpha`,
        inserted: insertedCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-seeking-alpha function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch Seeking Alpha data'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function analyzeSentiment(text: string): { score: number; label: string } {
  const bullishWords = [
    'bullish', 'buy', 'strong', 'growth', 'profit', 'gains', 'rally', 
    'upgrade', 'positive', 'surge', 'soar', 'jump', 'outperform', 
    'beat expectations', 'momentum', 'upside', 'breakout'
  ];
  
  const bearishWords = [
    'bearish', 'sell', 'weak', 'decline', 'loss', 'crash', 'drop',
    'downgrade', 'negative', 'plunge', 'fall', 'underperform',
    'miss expectations', 'risk', 'downside', 'breakdown'
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  bullishWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });

  bearishWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });

  score = Math.max(-1, Math.min(1, score));

  let label = 'neutral';
  if (score > 0.2) label = 'positive';
  else if (score < -0.2) label = 'negative';

  return { score, label };
}

function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by'];
  const words = text.toLowerCase().split(/\W+/);
  const keywords = words
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5);
  
  return [...new Set(keywords)];
}
