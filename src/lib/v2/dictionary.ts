// ============================================================
// luna Brain V2 — Metric Data Dictionary
// Central source of truth for metric labels, definitions, and sources.
// Used by MetricTooltip and the /v2/dictionary page.
// ============================================================

export interface MetricDefinition {
  /** Short display label (used in tooltips and dictionary page headings). */
  label: string;
  /** Full definition — what the metric measures and how it's calculated. */
  definition: string;
  /** Where the raw data comes from. */
  source: string;
  /** True if this metric is an approximation, not an exact figure. */
  approx?: boolean;
  /** Condition under which the metric should be treated as provisional / unreliable. */
  provisional_rule?: string;
  /** Grouping for the dictionary page. */
  group: "daily" | "weekly" | "monthly_company" | "monthly_teen" | "monthly_parent";
}

export const DICTIONARY: Record<string, MetricDefinition> = {
  // ── Daily ──────────────────────────────────────────────────

  tiktok_spend: {
    label: "TikTok Spend",
    definition: "Total ad spend in GBP reported by TikTok Ads Manager for the day. This is the authoritative spend figure.",
    source: "TikTok Ads Manager",
    group: "daily",
  },
  teen_spend: {
    label: "Teen Spend",
    definition: "Ad spend attributed to the Teen segment campaign. Subset of total TikTok Spend.",
    source: "TikTok Ads Manager",
    group: "daily",
  },
  parent_spend: {
    label: "Parent Spend",
    definition: "Ad spend attributed to the Parent segment campaign. Subset of total TikTok Spend.",
    source: "TikTok Ads Manager",
    group: "daily",
  },
  adjust_installs: {
    label: "Installs (Adjust)",
    definition:
      "Total installs tracked by Adjust — includes both paid (TikTok-attributed) and organic installs. Using this as a CPI denominator understates the true paid CPI because organic installs dilute the count.",
    source: "Adjust",
    approx: true,
    group: "daily",
  },
  tiktok_reported_installs: {
    label: "Installs (TikTok)",
    definition:
      "Installs reported directly by TikTok Ads Manager. More accurate for measuring paid acquisition efficiency than Adjust total installs.",
    source: "TikTok Ads Manager",
    approx: true,
    group: "daily",
  },
  mixpanel_installs: {
    label: "First App Opens (Mixpanel)",
    definition:
      "First-time app opens tracked by Mixpanel. Used as a proxy for real installs. Slightly different from store installs due to network latency and untracked sessions.",
    source: "Mixpanel",
    approx: true,
    group: "daily",
  },
  cpi_adjust: {
    label: "CPI (Adjust)",
    definition:
      "Cost per install calculated as TikTok Spend ÷ Adjust Total Installs. Includes organic installs in the denominator, which makes CPI appear lower (better) than the true paid CPI. Use with caution — prefer CPI (TikTok) or CPI (Mixpanel) when those columns are populated.",
    source: "Computed — Spend ÷ Adjust installs",
    approx: true,
    group: "daily",
  },
  cpi_tiktok: {
    label: "CPI (TikTok)",
    definition:
      "Cost per install calculated as TikTok Spend ÷ TikTok Reported Installs. More accurate for paid acquisition as it excludes organic installs. Available once the 'TikTok Reported Installs' column is added to the sheet.",
    source: "Computed — Spend ÷ TikTok Ads Manager installs",
    approx: true,
    group: "daily",
  },
  cpi_mixpanel: {
    label: "CPI (Mixpanel)",
    definition:
      "Cost per install calculated as TikTok Spend ÷ Mixpanel First App Opens. Uses Mixpanel-tracked opens as a proxy for paid installs. Available once the 'Mixpanel Installs' column is added to the sheet.",
    source: "Computed — Spend ÷ Mixpanel first app opens",
    approx: true,
    group: "daily",
  },
  new_paid_subs: {
    label: "New Paid Subs",
    definition: "Gross new paid subscribers acquired on the day. Does not net out churned subscribers.",
    source: "Purchasely / Sheet formula",
    group: "daily",
  },
  revenue: {
    label: "Revenue",
    definition:
      "Daily revenue recognised in GBP. Typically subscription payments processed on that day. May differ from MRR due to annual plan recognition timing.",
    source: "Purchasely / Sheet formula",
    group: "daily",
  },
  mrr: {
    label: "MRR",
    definition:
      "Monthly Recurring Revenue — the total subscription revenue expected per month from all active paid subscribers at this point in time. Recorded periodically (e.g. end of week/month) rather than daily — gaps between entries are normal.",
    source: "Sheet formula",
    group: "daily",
  },

  // ── Weekly ─────────────────────────────────────────────────

  spend_tw: {
    label: "Spend (This Week)",
    definition: "Sum of daily TikTok Spend for all days in the calendar week (Monday–Sunday). Computed automatically from daily actuals.",
    source: "Computed from Daily Actuals",
    group: "weekly",
  },
  installs_tw: {
    label: "Installs (This Week)",
    definition: "Sum of Adjust Total Installs for all days in the calendar week. Computed automatically from daily actuals.",
    source: "Computed from Daily Actuals",
    approx: true,
    group: "weekly",
  },
  new_subs_tw: {
    label: "New Paid Subs (This Week)",
    definition: "Sum of New Paid Subs for all days in the calendar week. Computed automatically from daily actuals.",
    source: "Computed from Daily Actuals",
    group: "weekly",
  },
  revenue_tw: {
    label: "Revenue (This Week)",
    definition: "Sum of daily Revenue for all days in the calendar week. Computed automatically from daily actuals.",
    source: "Computed from Daily Actuals",
    group: "weekly",
  },
  mrr_tw: {
    label: "MRR (End of Week)",
    definition:
      "MRR as of the last day in the week that has an MRR entry. Point-in-time snapshot, not a sum. May be null if no MRR was recorded during the week.",
    source: "Computed from Daily Actuals",
    group: "weekly",
  },
  cpi_tw: {
    label: "CPI (This Week)",
    definition:
      "Weekly CPI = total weekly spend ÷ total weekly Adjust installs. Includes organic installs — see CPI notes on the Daily view for caveats.",
    source: "Computed from Daily Actuals",
    approx: true,
    group: "weekly",
  },

  // ── Monthly — Company ───────────────────────────────────────

  arr: {
    label: "ARR",
    definition:
      "Annual Recurring Revenue in GBP. Should equal MRR × 12. If it differs by more than 5%, check the sheet formula — this usually indicates annual plan recognition is not being smoothed correctly.",
    source: "Sheet formula",
    group: "monthly_company",
  },
  required_monthly_growth_rate: {
    label: "Required Monthly Growth Rate",
    definition:
      "The month-on-month MRR growth rate required to hit the £1M ARR target from the current level. Computed in the sheet; used as a benchmark when evaluating actual growth.",
    source: "Sheet formula",
    group: "monthly_company",
  },
  monthly_mrr: {
    label: "MRR",
    definition:
      "Monthly Recurring Revenue as of end of this month. Total subscription revenue expected per month from all active paid subscribers.",
    source: "Sheet formula",
    group: "monthly_company",
  },
  net_new_paid_subs: {
    label: "Net New Paid Subs",
    definition:
      "Gross new paid subscribers acquired this month, minus subscribers who churned this month. This is the true subscriber growth figure — a positive number means the subscriber base is growing, a negative number means churn exceeded acquisition.",
    source: "Sheet formula",
    group: "monthly_company",
  },
  monthly_churn_pct: {
    label: "Monthly Churn %",
    definition:
      "Percentage of active subscribers at the start of the month who cancelled during the month. Industry benchmark for healthy consumer subscription: <3–5% monthly churn.",
    source: "Sheet formula",
    group: "monthly_company",
  },
  teen_revenue: {
    label: "Teen Revenue",
    definition:
      "Revenue attributed to the Teen segment for this month. Sourced from Purchasely plan_id prefixes — approximate because plan assignment can lag or mismatch edge cases.",
    source: "Purchasely",
    approx: true,
    group: "monthly_company",
  },
  parent_revenue: {
    label: "Parent Revenue",
    definition:
      "Revenue attributed to the Parent segment for this month. Sourced from Purchasely plan_id prefixes — approximate.",
    source: "Purchasely",
    approx: true,
    group: "monthly_company",
  },

  // ── Monthly — Teen ──────────────────────────────────────────

  teen_ad_spend: {
    label: "Teen Ad Spend",
    definition: "Total TikTok ad spend in GBP for Teen segment campaigns this month.",
    source: "TikTok Ads Manager",
    group: "monthly_teen",
  },
  teen_first_app_opens: {
    label: "Teen First App Opens",
    definition:
      "Number of first-time app opens by users who came through Teen campaigns. Sourced from Mixpanel or TikTok attribution — used as the top of the Teen acquisition funnel.",
    source: "Mixpanel / TikTok Ads Manager",
    approx: true,
    group: "monthly_teen",
  },
  teen_cpi: {
    label: "Teen CPI",
    definition:
      "Teen ad spend ÷ Teen first app opens (or Adjust teen installs). Cost to acquire one Teen user to reach the app. Note: this is based on installs/opens, not paid conversions.",
    source: "Computed",
    approx: true,
    group: "monthly_teen",
  },
  teen_new_paid_subs: {
    label: "Teen New Paid Subs",
    definition: "Gross new paid subscribers from the Teen segment this month.",
    source: "Purchasely",
    group: "monthly_teen",
  },
  open_to_trial_pct: {
    label: "Open-to-Trial %",
    definition:
      "Percentage of first app opens that start a free trial. Measures top-of-funnel activation. A drop here usually points to onboarding or paywall friction.",
    source: "Purchasely",
    approx: true,
    group: "monthly_teen",
  },
  trial_to_paid_pct: {
    label: "Trial-to-Paid %",
    definition:
      "Percentage of free trials that convert to a paid subscription after the trial period ends. The key monetisation conversion rate.",
    source: "Sheet formula",
    group: "monthly_teen",
  },
  open_to_paid_pct: {
    label: "Open-to-Paid %",
    definition:
      "Percentage of first app opens that become paid subscribers. Mathematically should approximate Open-to-Trial % × Trial-to-Paid % ÷ 100. If this diverges by more than 10%, check the source formula.",
    source: "Purchasely",
    approx: true,
    group: "monthly_teen",
  },
  plan_mix_annual_pct: {
    label: "Annual Plan Mix %",
    definition:
      "Percentage of new subscribers who chose the annual plan. Annual and monthly plan mix percentages should sum to 100%.",
    source: "Sheet formula",
    group: "monthly_teen",
  },
  plan_mix_monthly_pct: {
    label: "Monthly Plan Mix %",
    definition:
      "Percentage of new subscribers who chose the monthly plan. Annual + Monthly should sum to 100%.",
    source: "Sheet formula",
    group: "monthly_teen",
  },
  ltv0: {
    label: "LTV0",
    definition:
      "Lifetime value at day 0 — the initial payment received when a subscriber first converts, before any renewals. For an annual subscriber this is the full annual fee; for a monthly subscriber it is one month's fee.",
    source: "Purchasely",
    approx: true,
    group: "monthly_teen",
  },
  d90_ltv: {
    label: "D90 LTV",
    definition:
      "Lifetime value measured at day 90 — includes the initial payment plus any renewals that occurred within the first 90 days. For annual subscribers this is identical to LTV0 (no renewal in 90 days); for monthly subscribers it includes up to 3 renewal payments.",
    source: "Purchasely",
    approx: true,
    provisional_rule: "Less than 90 days of data available for this cohort",
    group: "monthly_teen",
  },
  projected_ltv: {
    label: "Projected LTV",
    definition:
      "Estimated total lifetime value for a subscriber cohort, projected forward using observed renewal rates and a churn curve model. Becomes more accurate as cohorts age.",
    source: "Sheet formula",
    approx: true,
    provisional_rule: "Cohort is less than 90 days old — projection relies on limited observed data",
    group: "monthly_teen",
  },
  cac: {
    label: "CAC",
    definition:
      "Customer Acquisition Cost — total ad spend for the segment divided by the number of new paid subscribers acquired. Represents the average cost to convert one paying customer.",
    source: "Computed — Ad Spend ÷ New Paid Subs",
    approx: true,
    group: "monthly_teen",
  },
  ltv_cac: {
    label: "LTV:CAC",
    definition:
      "Ratio of projected LTV to Customer Acquisition Cost. The core unit economics health metric. SaaS benchmarks: ≥3x = healthy (growing efficiently), 1–3x = below target (marginal economics), <1x = critical (spending more to acquire a customer than they are worth).",
    source: "Computed",
    group: "monthly_teen",
  },

  // ── Monthly — Parent ────────────────────────────────────────

  parent_ad_spend: {
    label: "Parent Ad Spend",
    definition: "Total TikTok ad spend in GBP for Parent segment campaigns this month.",
    source: "TikTok Ads Manager",
    group: "monthly_parent",
  },
  parent_first_app_opens: {
    label: "Parent First App Opens",
    definition:
      "Number of first-time app opens by users who came through Parent campaigns. Top of the Parent acquisition funnel.",
    source: "Mixpanel / TikTok Ads Manager",
    approx: true,
    group: "monthly_parent",
  },
  parent_cpi: {
    label: "Parent CPI",
    definition: "Parent ad spend ÷ Parent first app opens. Cost to acquire one Parent user.",
    source: "Computed",
    approx: true,
    group: "monthly_parent",
  },
  parent_new_paid_subs: {
    label: "Parent New Paid Subs",
    definition: "Gross new paid subscribers from the Parent segment this month.",
    source: "Purchasely",
    group: "monthly_parent",
  },
};
