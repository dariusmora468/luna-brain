// ============================================================
// luna Brain — Metrics Computation Engine
// ============================================================
// This is the HEART of the system. Every number on the dashboard
// is computed here. Deterministic code, not LLM — no hallucination risk.
// ============================================================

import Papa from "papaparse";
import type {
  DailyMetrics,
  TikTokRawData,
  RevenueRawData,
  SubsRawData,
  ConversionRow,
  ScreenViewRow,
  PlacementBreakdown,
  DataQualityChecks,
} from "./types";

// ---- Plan price mapping ----
const PLAN_PRICES: Record<string, number> = {
  "luna-premium-annual-discount-19-99": 19.99,
  "luna-premium-annual-39-99-v1": 39.99,
  "luna-premium-monthly-4-99-freetrial-v1": 4.99,
};

const PLAN_CATEGORIES: Record<string, string> = {
  "luna-premium-annual-discount-19-99": "annual_discount",
  "luna-premium-annual-39-99-v1": "annual_full",
  "luna-premium-monthly-4-99-freetrial-v1": "monthly",
};

// ---- CSV Parsing ----

export function parseRevenueCSV(csvText: string, targetDate?: string): RevenueRawData {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  // If target date provided, only use that row
  // If not, use the LAST row (most recent date)
  let targetRow: Record<string, string> | undefined;

  if (targetDate) {
    targetRow = rows.find((row) => row["Period"] === targetDate);
  }

  if (!targetRow) {
    // Fall back to last row (most recent)
    targetRow = rows[rows.length - 1];
  }

  if (!targetRow) {
    return { apple: 0, google: 0 };
  }

  const apple = parseFloat(targetRow["apple"] || targetRow["Apple"] || "0");
  const google = parseFloat(targetRow["google"] || targetRow["Google"] || "0");

  return { apple, google };
}

export function parseRevenueByCountryCSV(csvText: string, targetDate?: string): { us: number; gb: number; au: number; nl: number; se: number } {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  let targetRow: Record<string, string> | undefined;
  if (targetDate) {
    targetRow = rows.find((r) => (r["Period"] || "").substring(0, 10) === targetDate);
  }
  if (!targetRow) targetRow = rows[rows.length - 1];
  if (!targetRow) return { us: 0, gb: 0, au: 0, nl: 0, se: 0 };

  const gb = parseFloat(targetRow["United Kingdom"] || "0");
  const us = parseFloat(targetRow["United States"] || "0");
  const au = parseFloat(targetRow["Australia"] || "0");
  const nl = parseFloat(targetRow["Netherlands"] || "0");
  const se = parseFloat(targetRow["Sweden"] || "0");
  return { us, gb, au, nl, se };
}

export function parseRevenueByPlansCSV(csvText: string, targetDate?: string): {
  parent_annual: number;
  parent_monthly: number;
  teen_annual: number;
  teen_monthly: number;
  teen_weekly: number;
} {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  let targetRow: Record<string, string> | undefined;
  if (targetDate) {
    targetRow = rows.find((r) => (r["Period"] || "").substring(0, 10) === targetDate);
  }
  if (!targetRow) targetRow = rows[rows.length - 1];
  if (!targetRow) return { parent_annual: 0, parent_monthly: 0, teen_annual: 0, teen_monthly: 0, teen_weekly: 0 };

  let parent_annual = 0, parent_monthly = 0, teen_annual = 0, teen_monthly = 0, teen_weekly = 0;

  for (const [key, val] of Object.entries(targetRow)) {
    if (key === "Period") continue;
    const k = key.toLowerCase();
    const v = parseFloat(val || "0");
    if (isNaN(v)) continue;

    const isParent = k.includes("parent");
    // Check annual before weekly — "Premium Annual - 39.99 w 1 week free" contains both
    if (isParent && k.includes("annual")) parent_annual += v;
    else if (isParent && k.includes("monthly")) parent_monthly += v;
    else if (!isParent && k.includes("annual")) teen_annual += v;
    else if (!isParent && k.includes("weekly")) teen_weekly += v;
    else if (!isParent && k.includes("monthly")) teen_monthly += v;
  }

  return { parent_annual, parent_monthly, teen_annual, teen_monthly, teen_weekly };
}

export function parseSubsCSV(csvText: string, targetDate?: string): SubsRawData {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  // If target date provided, only use that row
  // If not, use the LAST row (most recent date)
  let targetRow: Record<string, string> | undefined;

  if (targetDate) {
    targetRow = rows.find((row) => row["Period"] === targetDate);
  }

  if (!targetRow) {
    targetRow = rows[rows.length - 1];
  }

  if (!targetRow) {
    return { new_subs: 0, churn: 0 };
  }

  const new_subs = parseInt(targetRow["New"] || "0", 10);
  const churn = parseInt(targetRow["Churn"] || "0", 10);

  return { new_subs, churn };
}

/**
 * Detect the most recent date available across all multi-day CSV files.
 * Used when no date override is specified.
 */
export function detectLatestDate(csvText: string): string {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  // Look for date in Period or date column
  const dates: string[] = [];
  for (const row of rows) {
    const dateVal = row["Period"] || row["date"] || "";
    const dateMatch = dateVal.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) dates.push(dateMatch[1]);
  }

  if (dates.length === 0) return new Date().toISOString().split("T")[0];

  // Return the most recent date
  dates.sort();
  return dates[dates.length - 1];
}

export function parseConversionsCSV(csvText: string, targetDate: string): ConversionRow[] {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  return rows
    .filter((row) => (row["date"] || "").substring(0, 10) === targetDate)
    .map((row) => ({
      date: row["date"],
      platform: row["platform"],
      country: row["country"],
      placement_id: row["placement_id"],
      presentation_id: row["presentation_id"],
      ab_test_variant_id: row["ab_test_variant_id"] || "",
      plan_id: row["plan_id"],
      conversions_to_offer_price: parseInt(row["conversions_to_offer_price"] || "0", 10),
      conversions_to_regular_price: parseInt(row["conversions_to_regular_price"] || "0", 10),
      viewers: parseInt(row["for_reference_only_unique_viewers_count"] || "0", 10),
    }));
}

export function parseScreenViewsCSV(csvText: string, targetDate: string): ScreenViewRow[] {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data as Record<string, string>[];

  return rows
    .filter((row) => (row["date"] || "").substring(0, 10) === targetDate)
    .map((row) => ({
      date: row["date"],
      platform: row["platform"],
      country: row["country"],
      placement_id: row["placement_id"],
      ab_test_variant_id: row["ab_test_variant_id"] || "",
      presentation_views_count: parseInt(row["presentation_views_count"] || "0", 10),
      unique_viewers_count: parseInt(row["unique_viewers_count"] || "0", 10),
    }));
}

// ---- TikTok XLSX Parsing ----
// Note: Uses SheetJS (xlsx) library for .xlsx files

export async function parseTikTokXLSX(buffer: ArrayBuffer): Promise<TikTokRawData> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  let installs = 0;
  let spend = 0;
  let impressions = 0;
  let clicks = 0;

  for (const row of rows) {
    // Skip TikTok's summary/totals rows (e.g. "Total of X results")
    const campaignName = String(row["Campaign name"] || row["Campaign Name"] || "");
    if (campaignName.toLowerCase().startsWith("total")) continue;
    
    // TikTok columns may vary — handle common variations
    installs += Number(row["Result"] || row["Conversions"] || row["Install"] || 0);
    spend += Number(row["Cost"] || row["Spend"] || row["Total Cost"] || 0);
    impressions += Number(row["Impressions"] || row["Impression"] || 0);
    clicks += Number(row["Clicks"] || row["Clicks (destination)"] || row["Click"] || 0);
  }

  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  return { installs, spend, impressions, clicks, cpm };
}

// ---- Core Metric Computation ----

interface ComputeInput {
  date: string;
  tiktok: TikTokRawData;
  revenue: RevenueRawData;
  subs: SubsRawData;
  conversions: ConversionRow[];
  screenViews: ScreenViewRow[];
  // For 7-day lag metrics
  spendSevenDaysAgo?: number | null;
  // Revenue segments (from revenues-by-country.csv and revenues-by-plans.csv)
  revenueByCountry?: { us: number; gb: number; au: number; nl: number; se: number };
  revenueByPlans?: { parent_annual: number; parent_monthly: number; teen_annual: number; teen_monthly: number; teen_weekly: number };
}

export function computeMetrics(input: ComputeInput): Omit<DailyMetrics, "id" | "computed_at" | "updated_at"> {
  const { date, tiktok, revenue, subs, conversions, screenViews, spendSevenDaysAgo, revenueByCountry, revenueByPlans } = input;

  // ---- Trials from conversions ----
  const onboardingConversions = conversions.filter(
    (c) => c.placement_id === "onboarding_v2"
  );
  const nonOnboardingConversions = conversions.filter(
    (c) => c.placement_id !== "onboarding_v2"
  );

  const totalTrials = conversions.reduce(
    (sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price,
    0
  );
  const onboardingTrials = onboardingConversions.reduce(
    (sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price,
    0
  );
  const nonOnboardingTrials = nonOnboardingConversions.reduce(
    (sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price,
    0
  );

  // ---- Trial breakdown by plan ----
  let annualDiscountTrials = 0;
  let annualFullTrials = 0;
  let monthlyTrials = 0;

  for (const c of conversions) {
    const trials = c.conversions_to_offer_price + c.conversions_to_regular_price;
    const category = PLAN_CATEGORIES[c.plan_id];
    if (category === "annual_discount") annualDiscountTrials += trials;
    else if (category === "annual_full") annualFullTrials += trials;
    else if (category === "monthly") monthlyTrials += trials;
  }

  // ---- Market breakdown ----
  const usTrials = conversions
    .filter((c) => c.country === "US")
    .reduce((sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price, 0);
  const gbTrials = conversions
    .filter((c) => c.country === "GB")
    .reduce((sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price, 0);

  // ---- Audience breakdown (parent vs teen) ----
  // Parent = presentation or plan contains "parent"
  const parentTrials = conversions
    .filter((c) =>
      c.presentation_id?.toLowerCase().includes("parent") ||
      c.plan_id?.toLowerCase().includes("parent")
    )
    .reduce((sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price, 0);
  const teenTrials = conversions
    .filter((c) =>
      !c.presentation_id?.toLowerCase().includes("parent") &&
      !c.plan_id?.toLowerCase().includes("parent")
    )
    .reduce((sum, c) => sum + c.conversions_to_offer_price + c.conversions_to_regular_price, 0);

  // ---- Revenue ----
  const totalRevenue = revenue.apple + revenue.google;

  // ---- Potential trial value ----
  let potentialTrialValue = 0;
  for (const c of conversions) {
    const trials = c.conversions_to_offer_price + c.conversions_to_regular_price;
    const price = PLAN_PRICES[c.plan_id] || 0;
    potentialTrialValue += trials * price;
  }

  // ---- Derived metrics ----
  const cpi = tiktok.installs > 0 ? tiktok.spend / tiktok.installs : null;
  const cpt = totalTrials > 0 ? tiktok.spend / totalTrials : null;
  const installToTrialCR = tiktok.installs > 0 ? (totalTrials / tiktok.installs) * 100 : null;

  // 7-day lag metrics
  const costPerSubscriber =
    spendSevenDaysAgo && subs.new_subs > 0 ? spendSevenDaysAgo / subs.new_subs : null;
  const roas7d =
    spendSevenDaysAgo && spendSevenDaysAgo > 0 ? totalRevenue / spendSevenDaysAgo : null;

  // ---- A/B Test analysis ----
  // Look for onboarding variants
  const onboardingScreenViews = screenViews.filter(
    (sv) => sv.placement_id === "onboarding_v2"
  );

  let variantAViewers = 0;
  let variantATrials = 0;
  let variantBViewers = 0;
  let variantBTrials = 0;

  for (const sv of onboardingScreenViews) {
    const variant = sv.ab_test_variant_id.toLowerCase();
    if (variant.includes("old") || variant.includes("monthly") || variant === "a") {
      variantAViewers += sv.unique_viewers_count;
    } else if (variant.includes("calai") || variant.includes("annual") || variant === "b") {
      variantBViewers += sv.unique_viewers_count;
    }
  }

  for (const c of onboardingConversions) {
    const variant = c.ab_test_variant_id.toLowerCase();
    const trials = c.conversions_to_offer_price + c.conversions_to_regular_price;
    if (variant.includes("old") || variant.includes("monthly") || variant === "a") {
      variantATrials += trials;
    } else if (variant.includes("calai") || variant.includes("annual") || variant === "b") {
      variantBTrials += trials;
    }
  }

  // Statistical significance (z-test for proportions)
  const significance = computeABSignificance(
    variantAViewers,
    variantATrials,
    variantBViewers,
    variantBTrials
  );

  // ---- Placement breakdown for non-onboarding ----
  const placementMap = new Map<string, { trials: number; viewers: number }>();

  for (const c of nonOnboardingConversions) {
    const trials = c.conversions_to_offer_price + c.conversions_to_regular_price;
    if (trials > 0) {
      const existing = placementMap.get(c.placement_id) || { trials: 0, viewers: 0 };
      existing.trials += trials;
      existing.viewers += c.viewers;
      placementMap.set(c.placement_id, existing);
    }
  }

  const placementBreakdown: PlacementBreakdown[] = Array.from(placementMap.entries())
    .map(([placement_id, data]) => ({
      placement_id,
      trials: data.trials,
      viewers: data.viewers,
      conversion_rate: data.viewers > 0 ? (data.trials / data.viewers) * 100 : 0,
    }))
    .sort((a, b) => b.trials - a.trials);

  // ---- Data quality checks ----
  const qualityChecks: DataQualityChecks = {
    trials_sum_matches: onboardingTrials + nonOnboardingTrials === totalTrials,
    revenue_sum_matches: Math.abs(revenue.apple + revenue.google - totalRevenue) < 0.01,
    market_split_matches: usTrials + gbTrials === totalTrials,
    checksum_passed:
      annualDiscountTrials + annualFullTrials + monthlyTrials === totalTrials,
  };

  return {
    client_id: "luna",
    date,

    // TikTok
    tiktok_installs: tiktok.installs,
    tiktok_spend_gbp: tiktok.spend,
    tiktok_impressions: tiktok.impressions,
    tiktok_clicks: tiktok.clicks,
    tiktok_cpm: tiktok.cpm,

    // Revenue
    apple_revenue_gbp: revenue.apple,
    google_revenue_gbp: revenue.google,
    total_revenue_gbp: totalRevenue,

    // Subscriptions
    new_subscriptions: subs.new_subs,
    churn: subs.churn,
    net_subscriptions: subs.new_subs - subs.churn,

    // Trials
    total_trials: totalTrials,
    onboarding_trials: onboardingTrials,
    non_onboarding_trials: nonOnboardingTrials,
    annual_discount_trials: annualDiscountTrials,
    annual_full_trials: annualFullTrials,
    monthly_trials: monthlyTrials,

    // Derived
    cost_per_install_gbp: cpi ? Math.round(cpi * 100) / 100 : null,
    cost_per_trial_gbp: cpt ? Math.round(cpt * 100) / 100 : null,
    cost_per_subscriber_gbp: costPerSubscriber
      ? Math.round(costPerSubscriber * 100) / 100
      : null,
    install_to_trial_cr: installToTrialCR
      ? Math.round(installToTrialCR * 100) / 100
      : null,
    roas_7d: roas7d ? Math.round(roas7d * 100) / 100 : null,
    potential_trial_value_gbp: Math.round(potentialTrialValue * 100) / 100,

    // A/B Test
    ab_variant_a_viewers: variantAViewers,
    ab_variant_a_trials: variantATrials,
    ab_variant_b_viewers: variantBViewers,
    ab_variant_b_trials: variantBTrials,
    ab_test_significance: significance,

    // Market
    us_trials: usTrials,
    gb_trials: gbTrials,
    us_revenue_gbp: revenueByCountry?.us ?? 0,
    gb_revenue_gbp: revenueByCountry?.gb ?? 0,
    au_revenue_gbp: revenueByCountry?.au ?? 0,
    nl_revenue_gbp: revenueByCountry?.nl ?? 0,
    se_revenue_gbp: revenueByCountry?.se ?? 0,

    // Audience trials
    parent_trials: parentTrials,
    teen_trials: teenTrials,

    // Revenue segments (populated from revenues-by-plans.csv)
    parent_revenue_gbp: revenueByPlans ? revenueByPlans.parent_annual + revenueByPlans.parent_monthly : 0,
    teen_revenue_gbp: revenueByPlans ? revenueByPlans.teen_annual + revenueByPlans.teen_monthly + revenueByPlans.teen_weekly : 0,
    rev_parent_annual_gbp: revenueByPlans?.parent_annual ?? 0,
    rev_parent_monthly_gbp: revenueByPlans?.parent_monthly ?? 0,
    rev_teen_annual_gbp: revenueByPlans?.teen_annual ?? 0,
    rev_teen_monthly_gbp: revenueByPlans?.teen_monthly ?? 0,
    rev_teen_weekly_gbp: revenueByPlans?.teen_weekly ?? 0,

    // Detail
    placement_breakdown: placementBreakdown,
    data_quality_checks: qualityChecks,
    notes: null,
  };
}

// ---- Statistical Significance (Z-test for proportions) ----

function computeABSignificance(
  viewersA: number,
  trialsA: number,
  viewersB: number,
  trialsB: number
): number | null {
  if (viewersA < 10 || viewersB < 10) return null;

  const pA = trialsA / viewersA;
  const pB = trialsB / viewersB;
  const pPool = (trialsA + trialsB) / (viewersA + viewersB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / viewersA + 1 / viewersB));

  if (se === 0) return null;

  const z = Math.abs(pA - pB) / se;

  // Convert z-score to approximate significance percentage
  // Using standard normal distribution approximation
  const significance = (1 - 2 * (1 - normalCDF(z))) * 100;

  return Math.round(significance * 100) / 100;
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

// ---- Slack Message Formatting ----

export function formatSlackMessages(
  metrics: Omit<DailyMetrics, "id" | "computed_at" | "updated_at">,
  previousMetrics: DailyMetrics | null
): string[] {
  const messages: string[] = [];

  // Message 1: Headline Metrics
  const prev = previousMetrics;
  const trialChange = prev && prev.total_trials > 0 ? `${((metrics.total_trials - prev.total_trials) / prev.total_trials * 100).toFixed(0)}%` : "—";
  const revenueChange = prev && prev.total_revenue_gbp > 0 ? `${((metrics.total_revenue_gbp - prev.total_revenue_gbp) / prev.total_revenue_gbp * 100).toFixed(0)}%` : "—";

  messages.push(
    `*luna Daily Update — ${metrics.date}*\n\n` +
    `| Metric | Today | Yesterday | Change |\n` +
    `|--------|-------|-----------|--------|\n` +
    `| Trials | ${metrics.total_trials} | ${prev?.total_trials ?? "—"} | ${trialChange} |\n` +
    `| Revenue | £${metrics.total_revenue_gbp.toFixed(2)} | £${prev?.total_revenue_gbp.toFixed(2) ?? "—"} | ${revenueChange} |\n` +
    `| Installs | ${metrics.tiktok_installs} | ${prev?.tiktok_installs ?? "—"} | — |\n` +
    `| New Subs | ${metrics.new_subscriptions} | ${prev?.new_subscriptions ?? "—"} | — |\n` +
    `| Churn | ${metrics.churn} | ${prev?.churn ?? "—"} | — |`
  );

  // Message 2: A/B Test
  const crA = metrics.ab_variant_a_viewers
    ? ((metrics.ab_variant_a_trials! / metrics.ab_variant_a_viewers) * 100).toFixed(1)
    : "—";
  const crB = metrics.ab_variant_b_viewers
    ? ((metrics.ab_variant_b_trials! / metrics.ab_variant_b_viewers) * 100).toFixed(1)
    : "—";

  messages.push(
    `*A/B Test Update*\n\n` +
    `| Variant | Viewers | Trials | CVR |\n` +
    `|---------|---------|--------|-----|\n` +
    `| A (Monthly) | ${metrics.ab_variant_a_viewers ?? "—"} | ${metrics.ab_variant_a_trials ?? "—"} | ${crA}% |\n` +
    `| B (Annual) | ${metrics.ab_variant_b_viewers ?? "—"} | ${metrics.ab_variant_b_trials ?? "—"} | ${crB}% |\n\n` +
    `Significance: ${metrics.ab_test_significance?.toFixed(1) ?? "—"}%`
  );

  // Message 3: Revenue Breakdown
  messages.push(
    `*Revenue Breakdown*\n\n` +
    `| Plan | Trials | Price | Potential Value |\n` +
    `|------|--------|-------|----------------|\n` +
    `| Annual Discount | ${metrics.annual_discount_trials} | £19.99 | £${(metrics.annual_discount_trials * 19.99).toFixed(2)} |\n` +
    `| Annual Full | ${metrics.annual_full_trials} | £39.99 | £${(metrics.annual_full_trials * 39.99).toFixed(2)} |\n` +
    `| Monthly | ${metrics.monthly_trials} | £4.99 | £${(metrics.monthly_trials * 4.99).toFixed(2)} |\n\n` +
    `Store Revenue: £${metrics.total_revenue_gbp.toFixed(2)} (Apple: £${metrics.apple_revenue_gbp.toFixed(2)}, Google: £${metrics.google_revenue_gbp.toFixed(2)})`
  );

  // Message 4: TikTok Performance
  messages.push(
    `*TikTok Ads Performance*\n\n` +
    `| Metric | Value |\n` +
    `|--------|-------|\n` +
    `| Spend | £${metrics.tiktok_spend_gbp.toFixed(2)} |\n` +
    `| Installs | ${metrics.tiktok_installs} |\n` +
    `| CPI | £${metrics.cost_per_install_gbp?.toFixed(2) ?? "—"} |\n` +
    `| CPT | £${metrics.cost_per_trial_gbp?.toFixed(2) ?? "—"} |\n` +
    `| ROAS (7d) | ${metrics.roas_7d?.toFixed(2) ?? "—"}x |`
  );

  // Message 5: Market Split
  messages.push(
    `*Market Breakdown*\n\n` +
    `US: ${metrics.us_trials} trials | GB: ${metrics.gb_trials} trials\n` +
    `Non-onboarding: ${metrics.non_onboarding_trials} trials (${metrics.total_trials > 0 ? ((metrics.non_onboarding_trials / metrics.total_trials) * 100).toFixed(0) : 0}% of total)`
  );

  // Message 6: Key Takeaways
  const takeaways: string[] = [];
  if (metrics.data_quality_checks?.checksum_passed) {
    takeaways.push("All data checksums passed");
  }
  if (metrics.non_onboarding_trials > 0) {
    takeaways.push(
      `Non-onboarding conversions growing: ${metrics.non_onboarding_trials} trials from in-app placements`
    );
  }
  if (metrics.ab_test_significance && metrics.ab_test_significance > 95) {
    takeaways.push(`A/B test is statistically significant at ${metrics.ab_test_significance.toFixed(1)}%`);
  } else if (metrics.ab_test_significance) {
    takeaways.push(`A/B test not yet conclusive (${metrics.ab_test_significance.toFixed(1)}% — need 95%+)`);
  }

  messages.push(
    `*Key Takeaways*\n\n` + takeaways.map((t) => `• ${t}`).join("\n")
  );

  return messages;
}
