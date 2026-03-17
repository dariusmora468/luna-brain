// ============================================================
// luna Brain V2 — CSV Parsers
// Parses raw CSV rows (as Record<string, string>) into typed objects.
// Column keys = exact Google Sheet header names as exported.
// ============================================================

import { parseSheetDate, num, normalizePct } from "./helpers";

export type TabName = "daily_actuals" | "experiment_log" | "weekly_summary" | "monthly_metric";

// ── Daily Actuals ────────────────────────────────────────────

export interface DailyActualsRow {
  date: string;
  // Spend
  tiktok_spend: number | null;
  tiktok_spend_us: number | null;
  tiktok_spend_uk: number | null;
  tiktok_spend_row: number | null;
  google_spend: number | null;
  meta_spend: number | null;
  teen_spend: number | null;
  teen_spend_us: number | null;
  teen_spend_uk: number | null;
  teen_spend_row: number | null;
  parent_spend: number | null;
  parent_spend_us: number | null;
  parent_spend_uk: number | null;
  parent_spend_row: number | null;
  // Installs
  adjust_total_installs: number | null;
  installs_us: number | null;
  installs_uk: number | null;
  installs_row: number | null;
  est_paid_installs: number | null;
  teen_installs: number | null;
  parent_installs: number | null;
  // Subs
  new_paid_subs: number | null;
  // Revenue
  revenue: number | null;
  mrr: number | null;
  // Conversion (may be empty)
  viewers_teen: number | null;
  viewers_parent: number | null;
  trials_teen: number | null;
  trials_parent: number | null;
  // CPI source columns (future — null until added to sheet)
  tiktok_reported_installs: number | null; // TikTok Ads Manager reported installs
  mixpanel_installs: number | null;         // Mixpanel first app opens
  // Raw for flexible access
  raw: Record<string, string>;
}

export function parseDailyActualsRow(row: Record<string, string>): DailyActualsRow | null {
  // Try common column name variations
  const date = parseSheetDate(
    row["Date"] ?? row["date"] ?? row["DATE"] ?? ""
  );
  if (!date) return null;

  return {
    date,
    tiktok_spend: num(row["TikTok Spend (£)"] ?? row["TikTok Spend"] ?? row["Spend (£)"] ?? row["Total Spend"] ?? row["Spend"] ?? null),
    tiktok_spend_us: num(row["TikTok Spend US (£)"] ?? row["TikTok Spend US"] ?? null),
    tiktok_spend_uk: num(row["TikTok Spend UK (£)"] ?? row["TikTok Spend UK"] ?? null),
    tiktok_spend_row: num(row["TikTok Spend ROW (£)"] ?? row["TikTok Spend ROW"] ?? null),
    google_spend: num(row["Google Spend (£)"] ?? row["Google Spend"] ?? row["Google Ads Spend"] ?? null),
    meta_spend: num(row["Meta Spend (£)"] ?? row["Meta Spend"] ?? row["Facebook Spend"] ?? row["Meta Ads Spend"] ?? null),
    teen_spend: num(row["Teen Spend (£)"] ?? row["Teen Spend"] ?? row["Spend: UK Teen"] ?? row["Spend: US Teen"] ?? null),
    teen_spend_us: num(row["Teen Spend US (£)"] ?? row["Teen Spend US"] ?? null),
    teen_spend_uk: num(row["Teen Spend UK (£)"] ?? row["Teen Spend UK"] ?? null),
    teen_spend_row: num(row["Teen Spend ROW (£)"] ?? row["Teen Spend ROW"] ?? null),
    parent_spend: num(row["Parent Spend (£)"] ?? row["Parent Spend"] ?? row["Spend: UK Parent"] ?? row["Spend: US Parent"] ?? null),
    parent_spend_us: num(row["Parent Spend US (£)"] ?? row["Parent Spend US"] ?? null),
    parent_spend_uk: num(row["Parent Spend UK (£)"] ?? row["Parent Spend UK"] ?? null),
    parent_spend_row: num(row["Parent Spend ROW (£)"] ?? row["Parent Spend ROW"] ?? null),
    adjust_total_installs: num(row["Adjust Total Installs"] ?? row["Total Installs"] ?? row["Installs"] ?? null),
    installs_us: num(row["Installs US"] ?? null),
    installs_uk: num(row["Installs UK"] ?? null),
    installs_row: num(row["Installs ROW"] ?? null),
    est_paid_installs: num(row["Est. Paid Installs"] ?? row["Estimated Paid Installs"] ?? row["Est. Paid Installs"] ?? row["Paid Installs"] ?? null),
    teen_installs: num(row["Teen Installs"] ?? null),
    parent_installs: num(row["Parent Installs"] ?? null),
    new_paid_subs: num(row["New Paid Subs"] ?? row["New Paid Subscribers"] ?? row["New Subscribers"] ?? null),
    revenue: num(row["Revenue (£)"] ?? row["Revenue"] ?? null),
    mrr: num(row["MRR (£)"] ?? row["MRR"] ?? null),
    viewers_teen: num(row["Viewers Teen"] ?? row["Teen Viewers"] ?? row["Viewers: Teen"] ?? null),
    viewers_parent: num(row["Viewers Parent"] ?? row["Parent Viewers"] ?? row["Viewers: Parent"] ?? null),
    trials_teen: num(row["Trials Teen"] ?? row["Teen Trials"] ?? row["Trials: Teen"] ?? null),
    trials_parent: num(row["Trials Parent"] ?? row["Parent Trials"] ?? row["Trials: Parent"] ?? null),
    tiktok_reported_installs: num(row["TikTok Reported Installs"] ?? row["TikTok Attributed Installs"] ?? null),
    mixpanel_installs: num(row["Mixpanel Installs"] ?? row["Mixpanel First App Opens"] ?? null),
    raw: row,
  };
}

// ── Experiment Log ───────────────────────────────────────────

export interface ExperimentRow {
  name: string;
  status: "Done" | "Running" | "Not Started" | string;
  focus_area: string;
  segment: string;
  start_date: string | null;
  end_date: string | null;
  hypothesis: string;
  result: string;
  decision: string;
  variant_a_metric: string;
  variant_b_metric: string;
  winner: string;
  days_running: number | null;
  // V3 unit economics — filled manually in the Experiment Log sheet
  realized_cac:    number | null;
  realized_ltv0:   number | null;
  projected_ltv:   number | null;
  ltv_cac:         number | null;
  cpi_during:      number | null;
  trial_starts:    number | null;
  conversion_rate: number | null;
  raw: Record<string, string>;
}

export function parseExperimentRow(row: Record<string, string>): ExperimentRow | null {
  const name =
    row["Experiment Name"] ??
    row["Name"] ??
    row["Experiment"] ??
    "";
  if (!name || name.trim() === "") return null;

  const startDate = parseSheetDate(row["Start Date"] ?? row["Start"] ?? null);
  const endDate = parseSheetDate(row["End Date"] ?? row["End"] ?? null);

  let daysRunning: number | null = null;
  if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    daysRunning = Math.round(ms / (1000 * 60 * 60 * 24));
  } else if (startDate) {
    const ms = Date.now() - new Date(startDate).getTime();
    daysRunning = Math.round(ms / (1000 * 60 * 60 * 24));
  }

  const realizedCac  = num(row["Realized CAC"]  ?? row["CAC (Realized)"] ?? row["CAC"] ?? null);
  const projectedLtv = num(row["Projected LTV"] ?? row["LTV (Projected)"] ?? null);
  const ltvCacRaw    = num(row["LTV:CAC"]        ?? row["LTV to CAC"]     ?? null);
  // Compute LTV:CAC from parts if not directly in sheet
  const ltvCac =
    ltvCacRaw !== null
      ? ltvCacRaw
      : projectedLtv !== null && realizedCac !== null && realizedCac > 0
      ? projectedLtv / realizedCac
      : null;

  return {
    name: name.trim(),
    status: (row["Status"] ?? "Not Started").trim(),
    focus_area: (row["Focus Area"] ?? row["Area"] ?? "").trim(),
    segment: (row["Segment"] ?? "").trim(),
    start_date: startDate,
    end_date: endDate,
    hypothesis: (row["Hypothesis"] ?? "").trim(),
    result: (row["Result"] ?? "").trim(),
    decision: (row["Decision"] ?? "TBD").trim(),
    variant_a_metric: (row["Variant A Metric"] ?? row["Variant A"] ?? row["A Metric"] ?? "").trim(),
    variant_b_metric: (row["Variant B Metric"] ?? row["Variant B"] ?? row["B Metric"] ?? "").trim(),
    winner: (row["Winner"] ?? "").trim(),
    days_running: daysRunning,
    realized_cac:    realizedCac,
    realized_ltv0:   num(row["Realized LTV0"] ?? row["LTV0"] ?? row["Realized LTV"] ?? null),
    projected_ltv:   projectedLtv,
    ltv_cac:         ltvCac,
    cpi_during:      num(row["CPI During Experiment"] ?? row["CPI During"] ?? null),
    trial_starts:    num(row["Trial Starts"] ?? row["Trials During Experiment"] ?? null),
    conversion_rate: num(row["Conversion Rate"] ?? row["CVR"] ?? null),
    raw: row,
  };
}

// ── Weekly Summary ───────────────────────────────────────────

export interface WeeklySummaryRow {
  week_ending: string | null;
  // This week
  spend_tw: number | null;
  installs_tw: number | null;
  new_subs_tw: number | null;
  revenue_tw: number | null;
  mrr_tw: number | null;
  cpi_tw: number | null;
  // Last week (prior period)
  spend_lw: number | null;
  installs_lw: number | null;
  new_subs_lw: number | null;
  revenue_lw: number | null;
  mrr_lw: number | null;
  cpi_lw: number | null;
  // Optional
  active_subs: number | null;
  net_new_subs: number | null;
  weeks_to_1m_arr: number | null;
  raw: Record<string, string>;
}

export function parseWeeklySummaryRow(row: Record<string, string>): WeeklySummaryRow | null {
  const weekEnding = parseSheetDate(
    row["Week Ending"] ?? row["Week"] ?? row["Date"] ?? null
  );
  // Allow rows without dates through for flexibility
  return {
    week_ending: weekEnding,
    spend_tw: num(row["Spend (£) TW"] ?? row["Spend TW"] ?? row["This Week Spend"] ?? null),
    installs_tw: num(row["Installs TW"] ?? row["This Week Installs"] ?? null),
    new_subs_tw: num(row["New Paid Subs TW"] ?? row["New Subs TW"] ?? row["This Week Subs"] ?? null),
    revenue_tw: num(row["Revenue (£) TW"] ?? row["Revenue TW"] ?? null),
    mrr_tw: num(row["MRR (£) TW"] ?? row["MRR TW"] ?? null),
    cpi_tw: num(row["CPI TW"] ?? row["CPI (£) TW"] ?? null),
    spend_lw: num(row["Spend (£) LW"] ?? row["Spend LW"] ?? row["Last Week Spend"] ?? null),
    installs_lw: num(row["Installs LW"] ?? row["Last Week Installs"] ?? null),
    new_subs_lw: num(row["New Paid Subs LW"] ?? row["New Subs LW"] ?? row["Last Week Subs"] ?? null),
    revenue_lw: num(row["Revenue (£) LW"] ?? row["Revenue LW"] ?? null),
    mrr_lw: num(row["MRR (£) LW"] ?? row["MRR LW"] ?? null),
    cpi_lw: num(row["CPI LW"] ?? row["CPI (£) LW"] ?? null),
    active_subs: num(row["Active Subs"] ?? null),
    net_new_subs: num(row["Net New Subs"] ?? null),
    weeks_to_1m_arr: num(row["Weeks to £1M ARR"] ?? row["Weeks to 1M ARR"] ?? null),
    raw: row,
  };
}

// ── Monthly Metric ───────────────────────────────────────────

export interface MonthlyMetricRow {
  month: string | null; // e.g. "Feb 2026"
  // Section 1: ARR Target
  arr: number | null;
  required_monthly_growth_rate: number | null;
  // Section 2: Company Revenue
  mrr: number | null;
  net_new_paid_subs: number | null;
  monthly_churn_pct: number | null;
  teen_revenue: number | null;
  parent_revenue: number | null;
  // Section 3: US Teen Acquisition
  teen_ad_spend: number | null;
  teen_first_app_opens: number | null;
  teen_cpi: number | null;
  teen_new_paid_subs: number | null;
  // Section 4: US Teen Conversion
  teen_open_to_trial_pct: number | null;
  teen_trial_to_paid_pct: number | null;
  teen_open_to_paid_pct: number | null;
  // Section 5: US Teen LTV
  teen_plan_mix_annual_pct: number | null;
  teen_plan_mix_monthly_pct: number | null;
  teen_ltv0: number | null;
  teen_d90_ltv: number | null;
  teen_projected_ltv: number | null;
  // Section 6: US Teen Unit Economics
  teen_cac: number | null;
  teen_ltv_cac: number | null;
  // Section 7: US Parent Acquisition
  parent_ad_spend: number | null;
  parent_first_app_opens: number | null;
  parent_cpi: number | null;
  parent_new_paid_subs: number | null;
  // Section 8: US Parent Conversion
  parent_open_to_trial_pct: number | null;
  parent_trial_to_paid_pct: number | null;
  parent_open_to_paid_pct: number | null;
  // Section 9: US Parent LTV
  parent_plan_mix_annual_pct: number | null;
  parent_plan_mix_monthly_pct: number | null;
  parent_ltv0: number | null;
  parent_d90_ltv: number | null;
  parent_projected_ltv: number | null;
  // Section 10: US Parent Unit Economics
  parent_cac: number | null;
  parent_ltv_cac: number | null;
  raw: Record<string, string>;
}

export function parseMonthlyMetricRow(row: Record<string, string>): MonthlyMetricRow | null {
  const month = row["Month"] ?? row["month"] ?? row["Period"] ?? null;
  if (!month || month.trim() === "") return null;

  return {
    month: month.trim(),
    // Section 1
    arr: num(row["ARR (£)"] ?? row["ARR"] ?? null),
    required_monthly_growth_rate: normalizePct(num(row["Required Monthly Growth Rate"] ?? row["Required Growth Rate"] ?? null)),
    // Section 2
    mrr: num(row["MRR (£)"] ?? row["MRR"] ?? null),
    net_new_paid_subs: num(row["Net New Paid Subs"] ?? row["Net New Subscribers"] ?? row["New Paying Total"] ?? null),
    monthly_churn_pct: normalizePct(num(row["Monthly Churn %"] ?? row["Churn %"] ?? row["Churn"] ?? null)),
    teen_revenue: num(row["Teen Revenue (£)"] ?? row["Teen Revenue"] ?? row["Revenue: Teen"] ?? null),
    parent_revenue: num(row["Parent Revenue (£)"] ?? row["Parent Revenue"] ?? row["Revenue: Parent"] ?? null),
    // Section 3
    teen_ad_spend: num(row["Teen Ad Spend (£)"] ?? row["Teen Spend"] ?? row["US Teen Ad Spend"] ?? row["Spend: US Teen"] ?? row["Spend: UK Teen"] ?? null),
    teen_first_app_opens: num(row["Teen First App Opens"] ?? row["Teen App Opens"] ?? row["Teen Accounts (Mixpanel)"] ?? null),
    teen_cpi: num(row["Teen CPI (£)"] ?? row["Teen CPI"] ?? row["CPI: US Teen"] ?? row["CPI: UK Teen"] ?? null),
    teen_new_paid_subs: num(row["Teen New Paid Subs"] ?? row["Teen New Subscribers"] ?? row["Paid: Teen"] ?? null),
    // Section 4
    teen_open_to_trial_pct: normalizePct(num(row["Teen Open-to-Trial %"] ?? row["Teen Open to Trial %"] ?? row["Acct→Trial (Teen)"] ?? null)),
    teen_trial_to_paid_pct: normalizePct(num(row["Teen Trial-to-Paid %"] ?? row["Teen Trial to Paid %"] ?? row["Trial→Paid (Teen)"] ?? null)),
    teen_open_to_paid_pct: normalizePct(num(row["Teen Open-to-Paid %"] ?? row["Teen Open to Paid %"] ?? row["Acct→Paid (Teen, calculated)"] ?? null)),
    // Section 5
    teen_plan_mix_annual_pct: normalizePct(num(row["Teen Plan Mix Annual %"] ?? row["Teen Annual %"] ?? row["Teen Annual £39.99"] ?? row["Teen Annual £19.99"] ?? null)),
    teen_plan_mix_monthly_pct: normalizePct(num(row["Teen Plan Mix Monthly %"] ?? row["Teen Monthly %"] ?? row["Teen Monthly"] ?? null)),
    teen_ltv0: num(row["Teen LTV0 (£)"] ?? row["Teen LTV0"] ?? null),
    teen_d90_ltv: num(row["Teen D90 LTV (£)"] ?? row["Teen D90 LTV"] ?? null),
    teen_projected_ltv: num(row["Teen Projected LTV (£)"] ?? row["Teen Projected LTV"] ?? row["Teen Proj LTV"] ?? null),
    // Section 6
    teen_cac: num(row["Teen CAC (£)"] ?? row["Teen CAC"] ?? row["CAC-A: Teen"] ?? null),
    teen_ltv_cac: num(row["Teen LTV:CAC"] ?? row["Teen LTV/CAC"] ?? row["Teen LTV:CAC-A"] ?? null),
    // Section 7
    parent_ad_spend: num(row["Parent Ad Spend (£)"] ?? row["Parent Spend"] ?? row["US Parent Ad Spend"] ?? row["Spend: US Parent"] ?? row["Spend: UK Parent"] ?? null),
    parent_first_app_opens: num(row["Parent First App Opens"] ?? row["Parent App Opens"] ?? null),
    parent_cpi: num(row["Parent CPI (£)"] ?? row["Parent CPI"] ?? row["CPI: UK Parent"] ?? null),
    parent_new_paid_subs: num(row["Parent New Paid Subs"] ?? row["Parent New Subscribers"] ?? row["Paid: Parent"] ?? null),
    // Section 8
    parent_open_to_trial_pct: normalizePct(num(row["Parent Open-to-Trial %"] ?? row["Parent Open to Trial %"] ?? null)),
    parent_trial_to_paid_pct: normalizePct(num(row["Parent Trial-to-Paid %"] ?? row["Parent Trial to Paid %"] ?? null)),
    parent_open_to_paid_pct: normalizePct(num(row["Parent Open-to-Paid %"] ?? row["Parent Open to Paid %"] ?? null)),
    // Section 9
    parent_plan_mix_annual_pct: normalizePct(num(row["Parent Plan Mix Annual %"] ?? row["Parent Annual %"] ?? row["Parent Annual"] ?? null)),
    parent_plan_mix_monthly_pct: normalizePct(num(row["Parent Plan Mix Monthly %"] ?? row["Parent Monthly %"] ?? row["Parent Monthly"] ?? null)),
    parent_ltv0: num(row["Parent LTV0 (£)"] ?? row["Parent LTV0"] ?? null),
    parent_d90_ltv: num(row["Parent D90 LTV (£)"] ?? row["Parent D90 LTV"] ?? null),
    parent_projected_ltv: num(row["Parent Projected LTV (£)"] ?? row["Parent Projected LTV"] ?? row["Parent Proj LTV"] ?? null),
    // Section 10
    parent_cac: num(row["Parent CAC (£)"] ?? row["Parent CAC"] ?? row["CAC-A: Parent"] ?? null),
    parent_ltv_cac: num(row["Parent LTV:CAC"] ?? row["Parent LTV/CAC"] ?? null),
    raw: row,
  };
}
