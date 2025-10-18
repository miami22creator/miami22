import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TradingSignal {
  id: string;
  asset_id: string;
  signal: 'CALL' | 'PUT' | 'NEUTRAL';
  confidence: number;
  price: number;
  change_percent: number;
  created_at: string;
  assets: {
    symbol: string;
    name: string;
    type: string;
  };
  indicators?: {
    rsi: number;
    macd: number;
    ema_50: number;
    ema_200: number;
    volume: number;
  };
}

export interface Alert {
  id: string;
  asset_id: string;
  signal_type: 'CALL' | 'PUT';
  message: string;
  confidence: number;
  is_read: boolean;
  created_at: string;
  assets: {
    symbol: string;
  };
}

export const useTradingSignals = () => {
  return useQuery({
    queryKey: ['trading-signals'],
    queryFn: async () => {
      const { data, error } = await supabase
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

      // Obtener indicadores para cada señal
      const signalsWithIndicators = await Promise.all(
        data.map(async (signal) => {
          const { data: indicators } = await supabase
            .from('technical_indicators')
            .select('*')
            .eq('asset_id', signal.asset_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...signal,
            indicators
          };
        })
      );

      return signalsWithIndicators as TradingSignal[];
    },
    refetchInterval: 60000, // Actualizar cada minuto
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          assets (
            symbol
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Alert[];
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });
};

export const useAssets = () => {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('active', true)
        .order('symbol');

      if (error) throw error;
      return data;
    },
  });
};
