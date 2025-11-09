-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.prediction_accuracy_by_asset CASCADE;
DROP VIEW IF EXISTS public.prediction_accuracy_by_period CASCADE;
DROP VIEW IF EXISTS public.prediction_accuracy_by_signal_type CASCADE;
DROP VIEW IF EXISTS public.cron_jobs_status CASCADE;

-- Recreate prediction_accuracy_by_asset without SECURITY DEFINER
CREATE VIEW public.prediction_accuracy_by_asset AS
SELECT 
  a.symbol,
  a.name,
  a.type,
  count(*) AS total_predictions,
  sum(CASE WHEN pc.prediction_correct = true THEN 1 ELSE 0 END) AS correct_predictions,
  round(((sum(CASE WHEN pc.prediction_correct = true THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100::numeric), 2) AS accuracy_percent,
  avg(pc.price_change_percent) AS avg_price_change
FROM price_correlations pc
JOIN assets a ON pc.asset_id = a.id
WHERE pc.measured_at IS NOT NULL
GROUP BY a.symbol, a.name, a.type
ORDER BY accuracy_percent DESC;

-- Recreate prediction_accuracy_by_period without SECURITY DEFINER
CREATE VIEW public.prediction_accuracy_by_period AS
SELECT 
  date_trunc('day', measured_at) AS period,
  count(*) AS total_predictions,
  sum(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END) AS correct_predictions,
  round(((sum(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100::numeric), 2) AS accuracy_percent
FROM price_correlations
WHERE measured_at IS NOT NULL
GROUP BY date_trunc('day', measured_at)
ORDER BY period DESC;

-- Recreate prediction_accuracy_by_signal_type without SECURITY DEFINER
CREATE VIEW public.prediction_accuracy_by_signal_type AS
SELECT 
  signal_type,
  count(*) AS total_predictions,
  sum(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END) AS correct_predictions,
  round(((sum(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END)::numeric / count(*)::numeric) * 100::numeric), 2) AS accuracy_percent,
  avg(signal_confidence) AS avg_confidence
FROM price_correlations
WHERE signal_type IS NOT NULL AND measured_at IS NOT NULL
GROUP BY signal_type
ORDER BY accuracy_percent DESC;

-- Recreate cron_jobs_status without SECURITY DEFINER
CREATE VIEW public.cron_jobs_status AS
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = ANY (ARRAY['generate-daily-signals', 'validate-daily-predictions']);

-- Enable RLS on views (PostgreSQL supports RLS on views)
ALTER VIEW public.prediction_accuracy_by_asset SET (security_invoker = true);
ALTER VIEW public.prediction_accuracy_by_period SET (security_invoker = true);
ALTER VIEW public.prediction_accuracy_by_signal_type SET (security_invoker = true);
ALTER VIEW public.cron_jobs_status SET (security_invoker = true);

-- Grant SELECT on views to authenticated users only
GRANT SELECT ON public.prediction_accuracy_by_asset TO authenticated;
GRANT SELECT ON public.prediction_accuracy_by_period TO authenticated;
GRANT SELECT ON public.prediction_accuracy_by_signal_type TO authenticated;
GRANT SELECT ON public.cron_jobs_status TO authenticated;

-- Revoke public access
REVOKE ALL ON public.prediction_accuracy_by_asset FROM anon, public;
REVOKE ALL ON public.prediction_accuracy_by_period FROM anon, public;
REVOKE ALL ON public.prediction_accuracy_by_signal_type FROM anon, public;
REVOKE ALL ON public.cron_jobs_status FROM anon, public;