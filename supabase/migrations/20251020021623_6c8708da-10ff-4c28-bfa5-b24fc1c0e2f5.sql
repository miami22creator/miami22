-- Tabla para almacenar noticias y su análisis de sentimiento
CREATE TABLE public.market_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id),
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sentiment_score NUMERIC,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  relevance_score NUMERIC,
  category TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_market_news_asset_id ON public.market_news(asset_id);
CREATE INDEX idx_market_news_published_at ON public.market_news(published_at DESC);
CREATE INDEX idx_market_news_sentiment ON public.market_news(sentiment_label, sentiment_score);

-- RLS policies
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to market_news"
ON public.market_news
FOR SELECT
TO public
USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_market_news_updated_at
BEFORE UPDATE ON public.market_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();