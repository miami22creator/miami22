-- Add missing columns to market_news table for Seeking Alpha integration
ALTER TABLE market_news 
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS related_symbols TEXT[];

-- Create index for faster lookups by external_id
CREATE INDEX IF NOT EXISTS idx_market_news_external_id ON market_news(external_id);

-- Create index for related_symbols array searches
CREATE INDEX IF NOT EXISTS idx_market_news_related_symbols ON market_news USING GIN(related_symbols);