-- Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Programar generación automática de señales diariamente a las 8:00 AM UTC
-- (Esto es 3:00 AM EST, antes de la apertura del mercado a las 9:30 AM EST)
SELECT cron.schedule(
  'generate-daily-signals',
  '0 8 * * *', -- 8:00 AM UTC todos los días
  $$
  SELECT
    net.http_post(
        url:='https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/generate-all-signals',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Programar validación automática de predicciones diariamente a las 22:00 (10 PM) UTC
-- (Esto es 5:00 PM EST, después del cierre del mercado a las 4:00 PM EST)
SELECT cron.schedule(
  'validate-daily-predictions',
  '0 22 * * *', -- 10:00 PM UTC todos los días
  $$
  SELECT
    net.http_post(
        url:='https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/validate-predictions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Crear vista para monitorear los cron jobs
CREATE OR REPLACE VIEW public.cron_jobs_status AS
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
WHERE jobname IN ('generate-daily-signals', 'validate-daily-predictions');

-- Dar permisos de lectura a usuarios autenticados
GRANT SELECT ON public.cron_jobs_status TO authenticated;