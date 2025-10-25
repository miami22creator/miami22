-- Hacer que post_id sea opcional en price_correlations
-- ya que no todas las señales vienen de posts de influencers
ALTER TABLE public.price_correlations 
ALTER COLUMN post_id DROP NOT NULL;

-- Agregar un comentario para documentar
COMMENT ON COLUMN public.price_correlations.post_id IS 'ID del post de influencer que generó la señal. NULL si la señal fue generada por algoritmo.';
