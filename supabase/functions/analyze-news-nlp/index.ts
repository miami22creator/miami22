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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching unanalyzed news from Seeking Alpha...');

    // Obtener noticias que no tienen análisis NLP
    const { data: news, error: newsError } = await supabase
      .from('market_news')
      .select('*')
      .eq('source', 'seeking_alpha')
      .is('nlp_analysis', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (newsError) {
      console.error('Error fetching news:', newsError);
      throw newsError;
    }

    if (!news || news.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No news to analyze',
          analyzed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${news.length} news articles to analyze`);
    let analyzedCount = 0;

    for (const article of news) {
      try {
        const analysisPrompt = `Analiza esta noticia financiera y extrae:
1. Entidades mencionadas (empresas, personas, indicadores económicos)
2. Sentimiento detallado (muy negativo, negativo, neutral, positivo, muy positivo)
3. Categoría (earnings, merger, regulation, market_movement, economic_data, other)
4. Señales de trading implícitas (comprar, vender, mantener, ninguna)
5. Nivel de impacto en mercado (bajo, medio, alto)
6. Keywords financieros relevantes

Título: ${article.title}
Resumen: ${article.summary}

Responde en formato JSON con esta estructura:
{
  "entities": ["entity1", "entity2"],
  "sentiment_detailed": "positive",
  "category": "earnings",
  "trading_signal": "buy",
  "market_impact": "high",
  "financial_keywords": ["keyword1", "keyword2"]
}`;

        console.log(`Analyzing article: ${article.title.substring(0, 50)}...`);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Eres un experto en análisis financiero y NLP. Respondes siempre en formato JSON válido.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            temperature: 0.3
          }),
        });

        if (!aiResponse.ok) {
          console.error('AI API error:', aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const analysisText = aiData.choices[0].message.content;
        
        // Extraer JSON del contenido
        let nlpAnalysis;
        try {
          // Intentar parsear directamente
          nlpAnalysis = JSON.parse(analysisText);
        } catch {
          // Si falla, buscar JSON entre ```json y ```
          const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            nlpAnalysis = JSON.parse(jsonMatch[1]);
          } else {
            // Buscar cualquier objeto JSON
            const objectMatch = analysisText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
              nlpAnalysis = JSON.parse(objectMatch[0]);
            } else {
              console.error('Could not extract JSON from AI response');
              continue;
            }
          }
        }

        // Actualizar el artículo con el análisis NLP
        const { error: updateError } = await supabase
          .from('market_news')
          .update({
            nlp_analysis: nlpAnalysis,
            nlp_analyzed_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (!updateError) {
          analyzedCount++;
          console.log(`Successfully analyzed article: ${article.id}`);
        } else {
          console.error('Error updating article:', updateError);
        }

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (articleError) {
        console.error(`Error analyzing article ${article.id}:`, articleError);
      }
    }

    console.log(`Successfully analyzed ${analyzedCount} articles`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Analyzed ${analyzedCount} articles with NLP`,
        analyzed: analyzedCount,
        total: news.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-news-nlp function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to analyze news with NLP'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
