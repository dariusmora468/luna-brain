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
const APP_STORE_CONNECT =
  "https://appstoreconnect.apple.com/analytics/app/d30/1632059799/metrics?chartType=singleaxis&groupDimensionKey=storefront&measureKey=totalDownloads&zoomType=day";
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
    key: "tiktok_spend_us",
    label: "TikTok Spend US (£)",
    definition: "GBP spent on TikTok campaigns targeting the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "tiktok_spend_uk",
    label: "TikTok Spend UK (£)",
    definition: "GBP spent on TikTok campaigns targeting the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "tiktok_spend_row",
    label: "TikTok Spend ROW (£)",
    definition: "GBP spent on TikTok campaigns targeting all regions outside US and UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend",
    label: "TikTok Teen Spend (£)",
    definition: "GBP spent on Teen-targeted TikTok campaigns (all regions combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_us",
    label: "TikTok Teen Spend US (£)",
    definition: "GBP spent on Teen-targeted TikTok campaigns in the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_uk",
    label: "TikTok Teen Spend UK (£)",
    definition: "GBP spent on Teen-targeted TikTok campaigns in the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_row",
    label: "TikTok Teen Spend ROW (£)",
    definition: "GBP spent on Teen-targeted TikTok campaigns outside US and UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend",
    label: "TikTok Parent Spend (£)",
    definition: "GBP spent on Parent-targeted TikTok campaigns (all regions combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_us",
    label: "TikTok Parent Spend US (£)",
    definition: "GBP spent on Parent-targeted TikTok campaigns in the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_uk",
    label: "TikTok Parent Spend UK (£)",
    definition: "GBP spent on Parent-targeted TikTok campaigns in the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_row",
    label: "TikTok Parent Spend ROW (£)",
    definition: "GBP spent on Parent-targeted TikTok campaigns outside US and UK.",
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
      "Total app downloads from App Store Connect — paid + organic, all countries.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_us",
    label: "Installs US",
    definition: "App downloads from the US App Store.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_uk",
    label: "Installs UK",
    definition: "App downloads from the UK App Store.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_row",
    label: "Installs ROW",
    definition: "App downloads from all App Stores outside US and UK.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
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
  tiktok_spend_us:         "sum",
  tiktok_spend_uk:         "sum",
  tiktok_spend_row:        "sum",
  teen_spend:              "sum",
  teen_spend_us:           "sum",
  teen_spend_uk:           "sum",
  teen_spend_row:          "sum",
  parent_spend:            "sum",
  parent_spend_us:         "sum",
  parent_spend_uk:         "sum",
  parent_spend_row:        "sum",
  google_spend:            "sum",
  meta_spend:              "sum",
  adjust_total_installs:   "sum",
  installs_us:             "sum",
  installs_uk:             "sum",
  installs_row:            "sum",
  cpi_computed:            "compute_cpi",
  new_paid_subs:           "sum",
  revenue:                 "sum",
  trials_teen:             "sum",
  trials_parent:           "sum",
  cac_computed:            "compute_cac",
  ltv_cac_computed:        "compute_ltv_cac",
};
