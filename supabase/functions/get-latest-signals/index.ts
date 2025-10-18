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
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    );

    // Obtener las últimas señales con información del activo
    const { data, error } = await supabaseClient
      .from('trading_signals')
      .select(`
        *,
        assets (
          symbol,
          name,
          type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Obtener los últimos indicadores para cada activo
    const signalsWithIndicators = await Promise.all(
      data.map(async (signal: any) => {
        const { data: indicators } = await supabaseClient
          .from('technical_indicators')
          .select('*')
          .eq('asset_id', signal.asset_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...signal,
          indicators
        };
      })
    );

    return new Response(
      JSON.stringify(signalsWithIndicators),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching signals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
