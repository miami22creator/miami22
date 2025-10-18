-- Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear función que genera señales para todos los activos activos
CREATE OR REPLACE FUNCTION public.generate_all_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  asset_record RECORD;
  project_url TEXT := 'https://hmiypsikrqgomawbcimq.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM';
BEGIN
  -- Iterar sobre todos los activos activos
  FOR asset_record IN 
    SELECT symbol FROM public.assets WHERE active = true
  LOOP
    -- Llamar a la edge function para cada activo
    PERFORM net.http_post(
      url := project_url || '/functions/v1/calculate-indicators',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'assetSymbol', asset_record.symbol
      )
    );
  END LOOP;
END;
$$;

-- Configurar cron job para ejecutar cada 5 minutos
SELECT cron.schedule(
  'generate-trading-signals',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT public.generate_all_signals();
  $$
);

-- Crear tabla para registrar ejecuciones del cron
CREATE TABLE IF NOT EXISTS public.cron_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Habilitar RLS
ALTER TABLE public.cron_executions ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Allow public read access to cron_executions"
  ON public.cron_executions FOR SELECT
  USING (true);