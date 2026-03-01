-- ============================================================
-- luna Brain — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Core metrics table (one row per day per client)
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'luna',
  date DATE NOT NULL,

  -- TikTok Ads
  tiktok_installs INT NOT NULL DEFAULT 0,
  tiktok_spend_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,
  tiktok_impressions INT NOT NULL DEFAULT 0,
  tiktok_clicks INT NOT NULL DEFAULT 0,
  tiktok_cpm DECIMAL(10,2),

  -- Store Revenue
  apple_revenue_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,
  google_revenue_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_revenue_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Subscriptions
  new_subscriptions INT NOT NULL DEFAULT 0,
  churn INT NOT NULL DEFAULT 0,
  net_subscriptions INT NOT NULL DEFAULT 0,

  -- Trials
  total_trials INT NOT NULL DEFAULT 0,
  onboarding_trials INT NOT NULL DEFAULT 0,
  non_onboarding_trials INT NOT NULL DEFAULT 0,
  annual_discount_trials INT NOT NULL DEFAULT 0,
  annual_full_trials INT NOT NULL DEFAULT 0,
  monthly_trials INT NOT NULL DEFAULT 0,

  -- Derived metrics
  cost_per_install_gbp DECIMAL(10,2),
  cost_per_trial_gbp DECIMAL(10,2),
  cost_per_subscriber_gbp DECIMAL(10,2),
  install_to_trial_cr DECIMAL(5,2),
  roas_7d DECIMAL(6,2),
  potential_trial_value_gbp DECIMAL(10,2),

  -- A/B Testing
  ab_variant_a_viewers INT,
  ab_variant_a_trials INT,
  ab_variant_b_viewers INT,
  ab_variant_b_trials INT,
  ab_test_significance DECIMAL(5,2),

  -- Market breakdown
  us_trials INT NOT NULL DEFAULT 0,
  gb_trials INT NOT NULL DEFAULT 0,
  us_revenue_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,
  gb_revenue_gbp DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- JSON columns
  placement_breakdown JSONB,
  data_quality_checks JSONB,
  notes TEXT,

  -- Timestamps
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one row per client per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_client_date
  ON metrics(client_id, date);

-- Fast lookups for dashboard (most recent first)
CREATE INDEX IF NOT EXISTS idx_metrics_client_date_desc
  ON metrics(client_id, date DESC);

-- Daily insights (Phase 2: AI-generated narratives)
CREATE TABLE IF NOT EXISTS daily_insights (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'luna',
  date DATE NOT NULL,
  executive_summary TEXT,
  key_changes JSONB,
  opportunities JSONB,
  risks JSONB,
  slack_messages JSONB,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_client_date
  ON daily_insights(client_id, date);

-- Pipeline logs (debugging)
CREATE TABLE IF NOT EXISTS data_pipeline_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'luna',
  date DATE NOT NULL,
  step TEXT,
  status TEXT,
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (optional but recommended)
-- ============================================================

-- Enable RLS on metrics
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use this)
CREATE POLICY "Service role full access" ON metrics
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon key read-only access (for client-side queries)
CREATE POLICY "Anon read access" ON metrics
  FOR SELECT USING (true);

-- Same for insights
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON daily_insights
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON daily_insights
  FOR SELECT USING (true);
