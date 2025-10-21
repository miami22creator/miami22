-- Mejorar la tabla price_correlations para análisis histórico completo
-- Añadir información de la señal original para análisis detallado

ALTER TABLE price_correlations 
ADD COLUMN IF NOT EXISTS signal_type TEXT,
ADD COLUMN IF NOT EXISTS signal_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS validation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Crear índices para consultas de análisis rápido
CREATE INDEX IF NOT EXISTS idx_price_correlations_measured_at 
ON price_correlations(measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_correlations_asset_id 
ON price_correlations(asset_id);

CREATE INDEX IF NOT EXISTS idx_price_correlations_prediction_correct 
ON price_correlations(prediction_correct);

CREATE INDEX IF NOT EXISTS idx_price_correlations_signal_type 
ON price_correlations(signal_type);

-- Crear vista para análisis de accuracy por período
CREATE OR REPLACE VIEW prediction_accuracy_by_period AS
SELECT 
  DATE_TRUNC('day', measured_at) as period,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END) as correct_predictions,
  ROUND((SUM(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as accuracy_percent
FROM price_correlations
WHERE measured_at IS NOT NULL
GROUP BY DATE_TRUNC('day', measured_at)
ORDER BY period DESC;

-- Crear vista para análisis de accuracy por activo
CREATE OR REPLACE VIEW prediction_accuracy_by_asset AS
SELECT 
  a.symbol,
  a.name,
  a.type,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN pc.prediction_correct = true THEN 1 ELSE 0 END) as correct_predictions,
  ROUND((SUM(CASE WHEN pc.prediction_correct = true THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as accuracy_percent,
  AVG(pc.price_change_percent) as avg_price_change
FROM price_correlations pc
JOIN assets a ON pc.asset_id = a.id
WHERE pc.measured_at IS NOT NULL
GROUP BY a.symbol, a.name, a.type
ORDER BY accuracy_percent DESC;

-- Crear vista para análisis de accuracy por tipo de señal
CREATE OR REPLACE VIEW prediction_accuracy_by_signal_type AS
SELECT 
  signal_type,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END) as correct_predictions,
  ROUND((SUM(CASE WHEN prediction_correct = true THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as accuracy_percent,
  AVG(signal_confidence) as avg_confidence
FROM price_correlations
WHERE signal_type IS NOT NULL AND measured_at IS NOT NULL
GROUP BY signal_type
ORDER BY accuracy_percent DESC;