// ============================================================
// Luna Brain V3 — Column Definitions for the Metrics / Data Sheet view
// Each entry maps a DailyActualsRow field key to display metadata.
// ============================================================

export interface ColumnDef {
  /** Matches a DailyActualsRow field key, or a computed key like "cac_computed" */
  key: string;
  /** Display name shown in the table header */
  label: string;
  /** Plain English explanation of how the number is calculated */
  definition: string;
  /** Name of the source system */
  source: string;
  /** Exact URL to the page where this number comes from. null = computed or TBD. */
  sourceUrl: string | null;
  /** If true, this field is currently empty in the sheet and needed for CAC/LTV → amber highlight */
  requiredMissing?: boolean;
  /** If true, this is CAC or LTV:CAC → orange styling */
  isCore?: boolean;
  /** If true, derived from other columns (not read directly from the sheet) */
  isComputed?: boolean;
  /** Format hint for rendering */
  format?: "gbp" | "number" | "pct" | "date" | "ratio" | "text";
}

const PURCHASELY_SUBSCRIPTIONS =
  "https://console.purchasely.io/app_LqxssVldDI20rClHxeoFUTvC6yoPOr/dashboards/subscriptions";
const TIKTOK_ADS =
  "https://ads.tiktok.com/i18n/manage/campaign?aadvid=7279002125701595138";
const ADJUST_DATASCAPE = "https://suite.adjust.com/datascape";
const GOOGLE_ADS = "https://ads.google.com";
const META_ADS = "https://adsmanager.facebook.com";

// ── Required missing columns (needed for full CAC/LTV calculation) ────────────
export const REQUIRED_MISSING_KEYS = new Set([
  "trials_teen",
  "trials_parent",
]);

// ── Column definitions ────────────────────────────────────────────────────────

export const DAILY_COLUMNS: ColumnDef[] = [
  {
    key: "date",
    label: "Date",
    definition: "Calendar date for this row of data.",
    source: "Manual",
    sourceUrl: null,
    format: "date",
  },
  // ── TikTok Spend ──
  {
    key: "tiktok_spend",
    label: "TikTok Spend (£)",
    definition: "Total GBP spent on TikTok ads across all campaigns that day.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend",
    label: "TikTok Teen Spend (£)",
    definition: "GBP spent on Teen-targeted TikTok campaigns (UK Teen + US Teen combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend",
    label: "TikTok Parent Spend (£)",
    definition: "GBP spent on Parent-targeted TikTok campaigns (UK Parent + US Parent combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  // ── Other platforms ──
  {
    key: "google_spend",
    label: "Google Spend (£)",
    definition: "Total GBP spent on Google Ads (UAC / App campaigns) that day.",
    source: "Google Ads",
    sourceUrl: GOOGLE_ADS,
    format: "gbp",
  },
  {
    key: "meta_spend",
    label: "Meta Spend (£)",
    definition: "Total GBP spent on Meta Ads (Facebook + Instagram) that day.",
    source: "Meta Ads Manager",
    sourceUrl: META_ADS,
    format: "gbp",
  },
  // ── Installs & CPI ──
  {
    key: "adjust_total_installs",
    label: "Total Installs",
    definition:
      "App installs tracked by Adjust — includes paid + organic baseline (~200/day).",
    source: "Adjust",
    sourceUrl: ADJUST_DATASCAPE,
    format: "number",
  },
  {
    key: "cpi_computed",
    label: "CPI (£)",
    definition:
      "Blended Cost Per Install = TikTok Spend ÷ Total Installs. Includes organic installs, so this understates true paid CPI.",
    source: "Computed",
    sourceUrl: null,
    isComputed: true,
    format: "gbp",
  },
  // ── Subscribers & Revenue ──
  {
    key: "new_paid_subs",
    label: "New Paid Subs",
    definition:
      "New paying subscribers — 7-day lag applies (trial maturation delay). Pulled from Purchasely.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    format: "number",
  },
  {
    key: "revenue",
    label: "Revenue (£)",
    definition: "Total subscription revenue from Purchasely for the day (GBP).",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    format: "gbp",
  },
  // ── Trials ──
  {
    key: "trials_teen",
    label: "Trials Teen",
    definition: "Trial starts — Teen segment — from Purchasely. Needed for conversion rate.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "trials_parent",
    label: "Trials Parent",
    definition: "Trial starts — Parent segment — from Purchasely.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    requiredMissing: true,
    format: "number",
  },
  // ── Core metrics ──
  {
    key: "cac_computed",
    label: "CAC (£)",
    definition:
      "Customer Acquisition Cost = TikTok Spend ÷ New Paid Subs (7-day lag).",
    source: "Computed",
    sourceUrl: null,
    isCore: true,
    isComputed: true,
    format: "gbp",
  },
  {
    key: "ltv_cac_computed",
    label: "LTV:CAC",
    definition:
      "Ratio of Projected LTV to CAC. Target ≥ 3:1. Shows — until Projected LTV is available from the Monthly sheet.",
    source: "Computed",
    sourceUrl: null,
    isCore: true,
    isComputed: true,
    format: "ratio",
  },
];

// ── Aggregation hints ─────────────────────────────────────────────────────────
export type AggregateMode = "sum" | "compute_cpi" | "compute_cac" | "compute_ltv_cac" | "last" | "skip";

export const AGGREGATE_MODE: Record<string, AggregateMode> = {
  date:                    "skip",
  tiktok_spend:            "sum",
  teen_spend:              "sum",
  parent_spend:            "sum",
  google_spend:            "sum",
  meta_spend:              "sum",
  adjust_total_installs:   "sum",
  cpi_computed:            "compute_cpi",
  new_paid_subs:           "sum",
  revenue:                 "sum",
  trials_teen:             "sum",
  trials_parent:           "sum",
  cac_computed:            "compute_cac",
  ltv_cac_computed:        "compute_ltv_cac",
};
