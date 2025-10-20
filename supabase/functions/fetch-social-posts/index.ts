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

    console.log('Fetching social posts...');

    // Obtener influencers activos
    const { data: influencers } = await supabaseClient
      .from('influencers')
      .select('*')
      .eq('is_active', true);

    if (!influencers || influencers.length === 0) {
      throw new Error('No active influencers found');
    }

    // Obtener activos activos
    const { data: assets } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('active', true);

    if (!assets || assets.length === 0) {
      throw new Error('No active assets found');
    }

    // Obtener noticias recientes para generar posts relevantes
    const { data: recentNews } = await supabaseClient
      .from('market_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(10);

    const postsToInsert = [];
    
    // Generar posts para algunos influencers seleccionados aleatoriamente
    const selectedInfluencers = influencers
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, influencers.length));

    for (const influencer of selectedInfluencers) {
      // Seleccionar un activo aleatorio
      const asset = assets[Math.floor(Math.random() * assets.length)];
      
      // Generar contenido del post basado en el influencer y noticias
      const post = generatePost(influencer, asset, recentNews);
      
      if (post) {
        postsToInsert.push(post);
      }
    }

    if (postsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('social_posts')
        .insert(postsToInsert);

      if (insertError) {
        console.error('Error inserting posts:', insertError);
        throw insertError;
      }

      console.log(`Inserted ${postsToInsert.length} new posts`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: postsToInsert.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching social posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePost(influencer: any, asset: any, recentNews: any[] | null) {
  const templates = {
    'Federal Reserve': [
      `Monitoring ${asset.symbol} closely. Economic indicators suggest cautious approach. Interest rate decisions will reflect market conditions.`,
      `${asset.name} performance aligns with broader market trends. Federal Reserve remains committed to stable economic growth.`,
      `Market volatility in ${asset.symbol} noted. The Fed continues to assess economic data for policy adjustments.`
    ],
    'US Treasury': [
      `${asset.name} showing strong fundamentals. Treasury Department supports continued economic expansion.`,
      `Fiscal policy considerations for ${asset.symbol} sector. Government remains committed to market stability.`,
      `Treasury analysis of ${asset.name} indicates positive outlook for American economy.`
    ],
    'Donald Trump': [
      `${asset.name} is doing GREAT! American companies are the best in the world. ${asset.symbol} will continue to WIN!`,
      `Just spoke with executives at ${asset.name}. They're bringing jobs back to America! ${asset.symbol} is fantastic!`,
      `${asset.symbol} is BOOMING! This is what happens when we put America FIRST!`
    ]
  };

  const otherTemplates = [
    `Bullish on ${asset.symbol}. ${asset.name} fundamentals looking strong.`,
    `Watching ${asset.symbol} closely. Market dynamics shifting.`,
    `${asset.name} showing interesting price action. Could be a major move coming.`,
    `Technical analysis on ${asset.symbol} suggests potential breakout. ${asset.name} worth watching.`,
    `${asset.symbol} earnings could surprise. ${asset.name} has solid growth potential.`
  ];

  let postText: string;
  const influencerTemplates = templates[influencer.name as keyof typeof templates];
  
  if (influencerTemplates) {
    postText = influencerTemplates[Math.floor(Math.random() * influencerTemplates.length)];
  } else {
    postText = otherTemplates[Math.floor(Math.random() * otherTemplates.length)];
  }

  // Análisis de sentimiento basado en el contenido
  const sentiment = analyzeSentiment(postText, influencer.name);

  // Generar engagement aleatorio basado en la influencia
  const baseEngagement = influencer.followers_count * 0.001;
  const engagement = Math.floor(baseEngagement * (0.5 + Math.random()));

  // Determinar urgencia basada en el influencer
  const urgencyLevel = determineUrgency(influencer.name, sentiment.label);

  return {
    influencer_id: influencer.id,
    asset_id: asset.id,
    post_text: postText,
    post_url: `https://twitter.com/${influencer.username}/status/${Date.now()}`,
    posted_at: new Date().toISOString(),
    sentiment_score: sentiment.score,
    sentiment_label: sentiment.label,
    engagement_count: engagement,
    urgency_level: urgencyLevel
  };
}

function analyzeSentiment(text: string, influencerName: string): { score: number; label: string } {
  const bullish = ['great', 'strong', 'bullish', 'win', 'boom', 'growth', 'positive', 'breakout', 'surge', 'up', 'fantastic'];
  const bearish = ['concern', 'cautious', 'bearish', 'weak', 'decline', 'volatility', 'risk', 'down'];
  
  const lowerText = text.toLowerCase();
  let score = 0;

  bullish.forEach(word => {
    if (lowerText.includes(word)) score += 0.15;
  });

  bearish.forEach(word => {
    if (lowerText.includes(word)) score -= 0.15;
  });

  // Ajustar por influencer
  if (influencerName === 'Donald Trump' && score > 0) {
    score = Math.min(1, score * 1.3); // Trump tiende a ser más bullish
  } else if (influencerName === 'Federal Reserve' && score !== 0) {
    score = score * 0.7; // Fed es más cauteloso
  }

  score = Math.max(-1, Math.min(1, score));

  let label: string;
  if (score > 0.2) label = 'bullish';
  else if (score < -0.2) label = 'bearish';
  else label = 'neutral';

  return { score, label };
}

function determineUrgency(influencerName: string, sentiment: string): string {
  // Federal Reserve y US Treasury siempre tienen alta urgencia
  if (influencerName === 'Federal Reserve' || influencerName === 'US Treasury') {
    return 'high';
  }
  
  // Donald Trump y sentimiento extremo = crítico
  if (influencerName === 'Donald Trump' && sentiment !== 'neutral') {
    return 'high';
  }

  // Otros casos
  if (sentiment === 'bullish' || sentiment === 'bearish') {
    return 'medium';
  }

  return 'low';
}
