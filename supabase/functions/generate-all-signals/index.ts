import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Step 1: Fetching fresh market news...');
    try {
      await supabase.functions.invoke('fetch-market-news');
      console.log('Market news fetched successfully');
    } catch (error) {
      console.error('Error fetching market news:', error);
    }

    console.log('Step 2: Fetching Seeking Alpha news...');
    try {
      await supabase.functions.invoke('fetch-seeking-alpha');
      console.log('Seeking Alpha news fetched successfully');
    } catch (error) {
      console.error('Error fetching Seeking Alpha:', error);
    }

    console.log('Step 3: Fetching social posts...');
    try {
      await supabase.functions.invoke('fetch-social-posts');
      console.log('Social posts fetched successfully');
    } catch (error) {
      console.error('Error fetching social posts:', error);
    }

    console.log('Step 4: Analyzing Seeking Alpha news with NLP...');
    try {
      // Obtener noticias de Seeking Alpha sin analizar
      const { data: unanalyzedNews } = await supabase
        .from('market_news')
        .select('id')
        .eq('source', 'seeking_alpha')
        .is('nlp_analyzed_at', null)
        .limit(10);

      if (unanalyzedNews && unanalyzedNews.length > 0) {
        console.log(`Analyzing ${unanalyzedNews.length} Seeking Alpha articles...`);
        for (const news of unanalyzedNews) {
          try {
            await supabase.functions.invoke('analyze-news-nlp', {
              body: { newsId: news.id }
            });
          } catch (error) {
            console.error(`Error analyzing news ${news.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in NLP analysis step:', error);
    }

    console.log('Step 5: Fetching active assets...');
    
    // Obtener todos los activos activos
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('symbol')
      .eq('active', true);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} active assets`);

    const results = [];
    
    console.log('Step 6: Generating trading signals for each asset...');
    
    // Generar señales para cada activo
    for (const asset of assets || []) {
      console.log(`Generating signal for ${asset.symbol}...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('calculate-indicators', {
          body: { assetSymbol: asset.symbol }
        });

        if (error) {
          console.error(`Error generating signal for ${asset.symbol}:`, error);
          results.push({ symbol: asset.symbol, success: false, error: error.message });
        } else {
          console.log(`Successfully generated signal for ${asset.symbol}`);
          results.push({ symbol: asset.symbol, success: true, data });
        }
      } catch (error) {
        console.error(`Exception generating signal for ${asset.symbol}:`, error);
        results.push({ 
          symbol: asset.symbol, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`Completed: ${successCount}/${results.length} signals generated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in generate-all-signals:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
