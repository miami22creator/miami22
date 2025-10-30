-- Crear tabla para rastrear versiones y mejoras del algoritmo
CREATE TABLE IF NOT EXISTS public.algorithm_improvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  accuracy_before NUMERIC,
  accuracy_after NUMERIC,
  changes_made JSONB NOT NULL,
  ai_recommendations TEXT,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.algorithm_improvements ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Allow public read access to algorithm_improvements" 
ON public.algorithm_improvements 
FOR SELECT 
USING (true);

-- Crear índice para búsquedas por versión
CREATE INDEX idx_algorithm_improvements_version ON public.algorithm_improvements(version);
CREATE INDEX idx_algorithm_improvements_created_at ON public.algorithm_improvements(created_at DESC);

-- Crear cron job para mejora semanal del algoritmo (Domingos a las 2 AM UTC)
SELECT cron.schedule(
  'improve-algorithm-weekly',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/improve-algorithm',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);