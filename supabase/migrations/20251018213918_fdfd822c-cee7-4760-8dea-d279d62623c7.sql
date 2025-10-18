-- Corregir función generate_all_signals con search_path seguro
CREATE OR REPLACE FUNCTION public.generate_all_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  asset_record RECORD;
  project_url TEXT := 'https://hmiypsikrqgomawbcimq.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtaXlwc2lrcnFnb21hd2JjaW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTExOTgsImV4cCI6MjA3NjM2NzE5OH0.eF49jADvwpQ_GMFgEGVxjMLPVR8Ou0jwbkWbvW01GfM';
BEGIN
  FOR asset_record IN 
    SELECT symbol FROM public.assets WHERE active = true
  LOOP
    PERFORM extensions.http_post(
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

-- Corregir función update_updated_at_column con search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;