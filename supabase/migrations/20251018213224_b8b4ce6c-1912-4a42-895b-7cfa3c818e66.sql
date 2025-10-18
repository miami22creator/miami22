-- Crear tabla para activos seguidos
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'etf', 'commodity', 'crypto')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla para señales de trading
CREATE TABLE public.trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  signal TEXT NOT NULL CHECK (signal IN ('CALL', 'PUT', 'NEUTRAL')),
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  price NUMERIC(12,2) NOT NULL,
  change_percent NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla para indicadores técnicos
CREATE TABLE public.technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  rsi NUMERIC(6,2),
  macd NUMERIC(8,4),
  ema_50 NUMERIC(12,2),
  ema_200 NUMERIC(12,2),
  bollinger_upper NUMERIC(12,2),
  bollinger_lower NUMERIC(12,2),
  atr NUMERIC(8,4),
  volume BIGINT,
  obv_change NUMERIC(8,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla para alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('CALL', 'PUT')),
  message TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: permitir lectura pública (no requiere autenticación para ver el dashboard)
CREATE POLICY "Allow public read access to assets"
  ON public.assets FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to trading_signals"
  ON public.trading_signals FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to technical_indicators"
  ON public.technical_indicators FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to alerts"
  ON public.alerts FOR SELECT
  USING (true);

-- Insertar activos iniciales
INSERT INTO public.assets (symbol, name, type) VALUES
  ('TSLA', 'Tesla Inc.', 'stock'),
  ('NVDA', 'NVIDIA Corporation', 'stock'),
  ('SPY', 'S&P 500 ETF', 'etf'),
  ('GLD', 'Gold ETF', 'commodity'),
  ('AMD', 'Advanced Micro Devices', 'stock'),
  ('PLTR', 'Palantir Technologies', 'stock'),
  ('MSTR', 'MicroStrategy', 'stock'),
  ('ETH', 'Ethereum', 'crypto'),
  ('AVAX', 'Avalanche', 'crypto'),
  ('LINK', 'Chainlink', 'crypto');

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp en assets
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índices para mejorar performance
CREATE INDEX idx_trading_signals_asset_id ON public.trading_signals(asset_id);
CREATE INDEX idx_trading_signals_created_at ON public.trading_signals(created_at DESC);
CREATE INDEX idx_technical_indicators_asset_id ON public.technical_indicators(asset_id);
CREATE INDEX idx_technical_indicators_created_at ON public.technical_indicators(created_at DESC);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);

-- Habilitar realtime para actualizaciones en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;