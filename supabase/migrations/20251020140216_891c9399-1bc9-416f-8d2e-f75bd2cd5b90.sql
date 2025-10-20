-- Crear cron job para validar predicciones diariamente a las 9 AM
SELECT cron.schedule(
  'validate-predictions-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/validate-predictions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);