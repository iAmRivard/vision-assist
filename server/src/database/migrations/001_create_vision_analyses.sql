CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS vision_analyses (
  id UUID PRIMARY KEY,
  object_name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  brand VARCHAR(255),
  model VARCHAR(255),
  confidence DECIMAL(5,4),
  description TEXT,
  visible_text JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vision_analyses_created_at ON vision_analyses(created_at DESC);
