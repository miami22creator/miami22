-- Configurar cron jobs para obtener datos en vivo

-- Job para obtener noticias del mercado cada 15 minutos
SELECT cron.schedule(
  'fetch-market-news-job',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/fetch-market-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job para obtener posts sociales cada 10 minutos
SELECT cron.schedule(
  'fetch-social-posts-job',
  '*/10 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://hmiypsikrqgomawbcimq.supabase.co/functions/v1/fetch-social-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM'
    ),
    body := '{}'::jsonb
  );
  $$
);