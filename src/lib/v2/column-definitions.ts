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
const PURCHASELY_CONVERSION =
  "https://console.purchasely.io/app_LqxssVldDI20rClHxeoFUTvC6yoPOr/dashboards/conversion";
const TIKTOK_ADS =
  "https://ads.tiktok.com/i18n/manage/campaign?aadvid=7279002125701595138";
const ADJUST_DATASCAPE = "https://suite.adjust.com/datascape";
const GOOGLE_ADS = "https://ads.google.com";
const META_ADS = "https://adsmanager.facebook.com";

// ── Required missing columns (needed for full CAC/LTV calculation) ────────────
// These are currently empty in the Daily Actuals sheet.
export const REQUIRED_MISSING_KEYS = new Set([
  "viewers_teen",
  "viewers_parent",
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
  {
    key: "tiktok_spend",
    label: "TikTok Spend (£)",
    definition:
      "Total GBP spent on TikTok ads across all campaigns that day.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
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
  {
    key: "teen_spend",
    label: "Teen Spend (£)",
    definition:
      "GBP spent on Teen-targeted TikTok campaigns (UK Teen + US Teen combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend",
    label: "Parent Spend (£)",
    definition:
      "GBP spent on Parent-targeted TikTok campaigns (UK Parent + US Parent combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "adjust_total_installs",
    label: "Total Installs",
    definition:
      "App installs tracked by Adjust — includes paid (TikTok-attributed) + organic baseline (~200/day). Note: App Store Connect is ground truth for iOS but is delayed 1+ days.",
    source: "Adjust",
    sourceUrl: ADJUST_DATASCAPE,
    format: "number",
  },
  {
    key: "cpi_computed",
    label: "CPI (£)",
    definition:
      "Blended Cost Per Install = Total Spend ÷ Total Installs. Includes organic installs, so this understates true paid CPI.",
    source: "Computed",
    sourceUrl: null,
    isComputed: true,
    format: "gbp",
  },
  {
    key: "new_paid_subs",
    label: "New Paid Subs",
    definition:
      "New paying subscribers — 7-day lag applies (trial maturation delay). Pulled from Purchasely subscriptions dashboard.",
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
  {
    key: "viewers_teen",
    label: "Viewers Teen",
    definition:
      "Paywall viewers — Teen segment — from Purchasely. Currently empty in sheet. Fill from Purchasely conversion dashboard.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_CONVERSION,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "viewers_parent",
    label: "Viewers Parent",
    definition:
      "Paywall viewers — Parent segment — from Purchasely. Currently empty in sheet.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_CONVERSION,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "trials_teen",
    label: "Trials Teen",
    definition:
      "Trial starts — Teen segment — from Purchasely. Currently empty. Needed for Viewer-to-Trial conversion rate.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "trials_parent",
    label: "Trials Parent",
    definition:
      "Trial starts — Parent segment — from Purchasely. Currently empty.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "cac_computed",
    label: "CAC (£)",
    definition:
      "Customer Acquisition Cost = Total Spend ÷ New Paid Subs (7-day lag). Simplified estimate — full CAC-A method subtracts organic baseline (~67 subs/month) first.",
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
// When rolling up daily rows into weekly/monthly/quarterly buckets, each field
// should be either summed or re-computed.

export type AggregateMode = "sum" | "compute_cpi" | "compute_cac" | "compute_ltv_cac" | "last" | "skip";

export const AGGREGATE_MODE: Record<string, AggregateMode> = {
  date:                    "skip",        // becomes the period label
  tiktok_spend:            "sum",
  google_spend:            "sum",
  meta_spend:              "sum",
  teen_spend:              "sum",
  parent_spend:            "sum",
  adjust_total_installs:   "sum",
  cpi_computed:            "compute_cpi",  // = spend_sum / installs_sum
  new_paid_subs:           "sum",
  revenue:                 "sum",
  viewers_teen:            "sum",
  viewers_parent:          "sum",
  trials_teen:             "sum",
  trials_parent:           "sum",
  cac_computed:            "compute_cac",  // = spend_sum / subs_sum
  ltv_cac_computed:        "compute_ltv_cac",
};
