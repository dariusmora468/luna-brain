// ============================================================
// luna Brain — Type Definitions
// ============================================================

export interface DailyMetrics {
  id?: number;
  client_id: string;
  date: string; // YYYY-MM-DD

  // TikTok Ads
  tiktok_installs: number;
  tiktok_spend_gbp: number;
  tiktok_impressions: number;
  tiktok_clicks: number;
  tiktok_cpm: number | null;

  // Store Revenue
  apple_revenue_gbp: number;
  google_revenue_gbp: number;
  total_revenue_gbp: number;

  // Subscriptions
  new_subscriptions: number;
  churn: number;
  net_subscriptions: number;

  // Trials (from Purchasely)
  total_trials: number;
  onboarding_trials: number;
  non_onboarding_trials: number;

  // Trial breakdown by plan
  annual_discount_trials: number; // £19.99
  annual_full_trials: number; // £39.99
  monthly_trials: number; // £4.99

  // Derived metrics
  cost_per_install_gbp: number | null;
  cost_per_trial_gbp: number | null;
  cost_per_subscriber_gbp: number | null;
  install_to_trial_cr: number | null; // percentage
  roas_7d: number | null;
  potential_trial_value_gbp: number | null;

  // A/B Testing
  ab_variant_a_viewers: number | null;
  ab_variant_a_trials: number | null;
  ab_variant_b_viewers: number | null;
  ab_variant_b_trials: number | null;
  ab_test_significance: number | null; // 0-100%

  // By Market
  us_trials: number;
  gb_trials: number;
  us_revenue_gbp: number;
  gb_revenue_gbp: number;

  // Non-onboarding placement detail
  placement_breakdown: PlacementBreakdown[] | null;

  // Metadata
  data_quality_checks: DataQualityChecks | null;
  notes: string | null;
  computed_at?: string;
  updated_at?: string;
}

export interface PlacementBreakdown {
  placement_id: string;
  trials: number;
  viewers: number;
  conversion_rate: number;
}

export interface DataQualityChecks {
  trials_sum_matches: boolean;
  revenue_sum_matches: boolean;
  market_split_matches: boolean;
  checksum_passed: boolean;
}

export interface DailyInsight {
  id?: number;
  client_id: string;
  date: string;
  executive_summary: string | null;
  key_changes: KeyChange[] | null;
  opportunities: Opportunity[] | null;
  risks: Risk[] | null;
  slack_messages: string[] | null;
  metrics_snapshot: DailyMetrics | null;
  created_at?: string;
}

export interface KeyChange {
  metric: string;
  direction: "up" | "down" | "flat";
  pct_change: number;
  narrative: string;
}

export interface Opportunity {
  title: string;
  description: string;
  potential_impact: string;
}

export interface Risk {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

// Raw file parsing types
export interface TikTokRawData {
  installs: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
}

export interface RevenueRawData {
  apple: number;
  google: number;
}

export interface SubsRawData {
  new_subs: number;
  churn: number;
}

export interface ConversionRow {
  date: string;
  platform: string;
  country: string;
  placement_id: string;
  presentation_id: string;
  ab_test_variant_id: string;
  plan_id: string;
  conversions_to_offer_price: number;
  conversions_to_regular_price: number;
  viewers: number;
}

export interface ScreenViewRow {
  date: string;
  platform: string;
  country: string;
  placement_id: string;
  ab_test_variant_id: string;
  presentation_views_count: number;
  unique_viewers_count: number;
}

// Dashboard display types
export interface MetricCardData {
  label: string;
  value: number;
  previousValue: number | null;
  format: "currency" | "number" | "decimal" | "percent";
  unit?: string;
}

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}
