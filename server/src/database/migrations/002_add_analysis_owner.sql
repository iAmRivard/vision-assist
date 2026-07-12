ALTER TABLE vision_analyses ADD COLUMN IF NOT EXISTS owner_hash CHAR(64);
CREATE INDEX IF NOT EXISTS idx_vision_analyses_owner_created_at
  ON vision_analyses(owner_hash, created_at DESC);
