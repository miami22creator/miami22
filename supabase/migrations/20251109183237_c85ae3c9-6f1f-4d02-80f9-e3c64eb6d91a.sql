-- Add NLP analysis columns to market_news table
ALTER TABLE market_news 
ADD COLUMN IF NOT EXISTS nlp_analysis JSONB,
ADD COLUMN IF NOT EXISTS nlp_analyzed_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_news_nlp_analyzed 
ON market_news(nlp_analyzed_at) 
WHERE nlp_analysis IS NOT NULL;