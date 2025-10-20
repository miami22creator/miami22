-- Tabla de influencers
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'reddit', 'telegram')),
  followers_count BIGINT,
  influence_score NUMERIC DEFAULT 50.0,
  accuracy_score NUMERIC DEFAULT 0.0,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de posts de redes sociales
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  post_text TEXT NOT NULL,
  post_url TEXT,
  sentiment_score NUMERIC,
  sentiment_label TEXT CHECK (sentiment_label IN ('bullish', 'bearish', 'neutral')),
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  engagement_count INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de correlación histórica
CREATE TABLE public.price_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  price_before NUMERIC NOT NULL,
  price_after NUMERIC,
  price_change_percent NUMERIC,
  time_to_impact_hours INTEGER,
  prediction_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  measured_at TIMESTAMP WITH TIME ZONE
);

-- Índices para mejorar performance
CREATE INDEX idx_social_posts_influencer ON public.social_posts(influencer_id);
CREATE INDEX idx_social_posts_asset ON public.social_posts(asset_id);
CREATE INDEX idx_social_posts_posted_at ON public.social_posts(posted_at DESC);
CREATE INDEX idx_price_correlations_post ON public.price_correlations(post_id);
CREATE INDEX idx_price_correlations_asset ON public.price_correlations(asset_id);

-- RLS Policies
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_correlations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to influencers" ON public.influencers
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to social_posts" ON public.social_posts
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to price_correlations" ON public.price_correlations
  FOR SELECT USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar influencers iniciales
INSERT INTO public.influencers (name, username, platform, followers_count, influence_score) VALUES
('Elon Musk', 'elonmusk', 'twitter', 180000000, 95.0),
('Jim Cramer', 'jimcramer', 'twitter', 2000000, 75.0),
('Cathie Wood', 'cathiedwood', 'twitter', 1500000, 85.0),
('Michael Saylor', 'saylor', 'twitter', 3000000, 90.0),
('Chamath Palihapitiya', 'chamath', 'twitter', 1700000, 80.0);