-- ============================================================
-- luna Brain — Activities Timeline Table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'luna',
  date DATE NOT NULL,
  category TEXT NOT NULL, -- 'campaign', 'paywall', 'product', 'aso', 'growth', 'other'
  title TEXT NOT NULL,
  description TEXT,
  auto_detected BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual', -- 'manual', 'tiktok_api', 'purchasely_api', 'app_store_api'
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_client_date ON activities(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(client_id, category);

-- RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON activities FOR SELECT USING (true);
