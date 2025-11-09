-- Drop all public access policies and replace with authenticated-only policies

-- Trading Signals
DROP POLICY IF EXISTS "Allow public read access to trading_signals" ON public.trading_signals;
CREATE POLICY "Authenticated users can view trading signals"
  ON public.trading_signals FOR SELECT
  TO authenticated
  USING (true);

-- Technical Indicators
DROP POLICY IF EXISTS "Allow public read access to technical_indicators" ON public.technical_indicators;
CREATE POLICY "Authenticated users can view technical indicators"
  ON public.technical_indicators FOR SELECT
  TO authenticated
  USING (true);

-- Alerts
DROP POLICY IF EXISTS "Allow public read access to alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

-- Assets
DROP POLICY IF EXISTS "Allow public read access to assets" ON public.assets;
CREATE POLICY "Authenticated users can view assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

-- Market News
DROP POLICY IF EXISTS "Allow public read access to market_news" ON public.market_news;
CREATE POLICY "Authenticated users can view market news"
  ON public.market_news FOR SELECT
  TO authenticated
  USING (true);

-- Social Posts
DROP POLICY IF EXISTS "Allow public read access to social_posts" ON public.social_posts;
CREATE POLICY "Authenticated users can view social posts"
  ON public.social_posts FOR SELECT
  TO authenticated
  USING (true);

-- Influencers
DROP POLICY IF EXISTS "Allow public read access to influencers" ON public.influencers;
CREATE POLICY "Authenticated users can view influencers"
  ON public.influencers FOR SELECT
  TO authenticated
  USING (true);

-- Algorithm Improvements and Price Correlations already have authenticated policies
DROP POLICY IF EXISTS "Allow public read access to algorithm_improvements" ON public.algorithm_improvements;
DROP POLICY IF EXISTS "Allow public read access to price_correlations" ON public.price_correlations;

-- Cron Executions already has authenticated policy, just remove public one
DROP POLICY IF EXISTS "Allow public read access to cron_executions" ON public.cron_executions;