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
  "trials_all",
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
  // ── TikTok iOS Spend ──
  {
    key: "tiktok_spend",
    label: "TikTok iOS Spend (£)",
    definition: "Total GBP spent on TikTok iOS campaigns across all regions that day.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "tiktok_spend_us",
    label: "TikTok iOS Spend US (£)",
    definition: "GBP spent on TikTok iOS campaigns targeting the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "tiktok_spend_uk",
    label: "TikTok iOS Spend UK (£)",
    definition: "GBP spent on TikTok iOS campaigns targeting the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "tiktok_spend_row",
    label: "TikTok iOS Spend ROW (£)",
    definition: "GBP spent on TikTok iOS campaigns targeting all regions outside US and UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend",
    label: "TikTok iOS Teen Spend (£)",
    definition: "GBP spent on Teen-targeted TikTok iOS campaigns (all regions combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_us",
    label: "TikTok iOS Teen Spend US (£)",
    definition: "GBP spent on Teen-targeted TikTok iOS campaigns in the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_uk",
    label: "TikTok iOS Teen Spend UK (£)",
    definition: "GBP spent on Teen-targeted TikTok iOS campaigns in the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "teen_spend_row",
    label: "TikTok iOS Teen Spend ROW (£)",
    definition: "GBP spent on Teen-targeted TikTok iOS campaigns outside US and UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend",
    label: "TikTok iOS Parent Spend (£)",
    definition: "GBP spent on Parent-targeted TikTok iOS campaigns (all regions combined).",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_us",
    label: "TikTok iOS Parent Spend US (£)",
    definition: "GBP spent on Parent-targeted TikTok iOS campaigns in the US.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_uk",
    label: "TikTok iOS Parent Spend UK (£)",
    definition: "GBP spent on Parent-targeted TikTok iOS campaigns in the UK.",
    source: "TikTok Ads Manager",
    sourceUrl: TIKTOK_ADS,
    format: "gbp",
  },
  {
    key: "parent_spend_row",
    label: "TikTok iOS Parent Spend ROW (£)",
    definition: "GBP spent on Parent-targeted TikTok iOS campaigns outside US and UK.",
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
    label: "iOS Installs",
    definition:
      "Total iOS app downloads from App Store Connect — paid + organic, all countries.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_us",
    label: "iOS Installs US",
    definition: "iOS app downloads from the US App Store.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_uk",
    label: "iOS Installs UK",
    definition: "iOS app downloads from the UK App Store.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_row",
    label: "iOS Installs ROW",
    definition: "iOS app downloads from all App Stores outside US and UK.",
    source: "App Store Connect",
    sourceUrl: APP_STORE_CONNECT,
    format: "number",
  },
  {
    key: "installs_android",
    label: "Android Installs",
    definition: "Total Android app downloads from Google Play Console.",
    source: "Google Play Console",
    sourceUrl: null,
    format: "number",
  },
  {
    key: "installs_android_us",
    label: "Android Installs US",
    definition: "Android app downloads from the US on Google Play.",
    source: "Google Play Console",
    sourceUrl: null,
    format: "number",
  },
  {
    key: "installs_android_uk",
    label: "Android Installs UK",
    definition: "Android app downloads from the UK on Google Play.",
    source: "Google Play Console",
    sourceUrl: null,
    format: "number",
  },
  {
    key: "installs_android_row",
    label: "Android Installs ROW",
    definition: "Android app downloads outside US and UK on Google Play.",
    source: "Google Play Console",
    sourceUrl: null,
    format: "number",
  },
  {
    key: "cpi_computed",
    label: "CPI All (£)",
    definition:
      "Blended Cost Per Install = TikTok iOS Spend ÷ (iOS + Android Installs). Understates true paid CPI due to organic.",
    source: "Computed",
    sourceUrl: null,
    isComputed: true,
    format: "gbp",
  },
  {
    key: "cpi_ios_computed",
    label: "CPI iOS (£)",
    definition:
      "iOS Cost Per Install = TikTok iOS Spend ÷ iOS Installs.",
    source: "Computed",
    sourceUrl: null,
    isComputed: true,
    format: "gbp",
  },
  {
    key: "cpi_android_computed",
    label: "CPI Android (£)",
    definition:
      "Android Cost Per Install = TikTok iOS Spend ÷ Android Installs. Note: no separate Android ad spend tracked yet.",
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
  {
    key: "cpt_computed",
    label: "CPT (£)",
    definition: "Cost Per Trial = Total Ad Spend ÷ Total Trials. Measures how much is spent to generate one free trial start.",
    source: "Computed",
    sourceUrl: null,
    isComputed: true,
    format: "gbp",
  },
  // ── Trials ──
  {
    key: "trials_all",
    label: "Trials (All)",
    definition: "Total trial starts across all countries — from Purchasely Conversion report (conversions_to_offer_price).",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    requiredMissing: true,
    format: "number",
  },
  {
    key: "trials_us",
    label: "Trials US",
    definition: "Trial starts in the US — from Purchasely Conversion report.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    format: "number",
  },
  {
    key: "trials_uk",
    label: "Trials UK",
    definition: "Trial starts in the UK — from Purchasely Conversion report.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
    format: "number",
  },
  {
    key: "trials_row",
    label: "Trials ROW",
    definition: "Trial starts outside US and UK — from Purchasely Conversion report.",
    source: "Purchasely",
    sourceUrl: PURCHASELY_SUBSCRIPTIONS,
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
  installs_android:        "sum",
  installs_android_us:     "sum",
  installs_android_uk:     "sum",
  installs_android_row:    "sum",
  cpi_computed:            "compute_cpi",
  cpi_ios_computed:        "compute_cpi",
  cpi_android_computed:    "compute_cpi",
  cpt_computed:            "compute_cac", // reuse compute_cac mode (spend ÷ count); computed in groupRows
  new_paid_subs:           "sum",
  revenue:                 "sum",
  trials_all:              "sum",
  trials_us:               "sum",
  trials_uk:               "sum",
  trials_row:              "sum",
  cac_computed:            "compute_cac",
  ltv_cac_computed:        "compute_ltv_cac",
};
