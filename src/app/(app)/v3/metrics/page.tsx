import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, parseMonthlyMetricRow, DailyActualsRow } from "@/lib/v2/parsers";
import MetricsView from "../../v2/metrics/MetricsView";

export const dynamic = "force-dynamic";

// Generate an empty scaffold row for a given YYYY-MM-DD date
function emptyRow(dateStr: string): DailyActualsRow {
  return {
    date: dateStr,
    tiktok_spend: null,
    google_spend: null,
    meta_spend: null,
    teen_spend: null,
    parent_spend: null,
    adjust_total_installs: null,
    est_paid_installs: null,
    teen_installs: null,
    parent_installs: null,
    new_paid_subs: null,
    revenue: null,
    mrr: null,
    viewers_teen: null,
    viewers_parent: null,
    trials_teen: null,
    trials_parent: null,
    tiktok_reported_installs: null,
    mixpanel_installs: null,
    raw: { Date: dateStr },
  };
}

// Build every date from 2026-01-01 to today (UTC).
// Called on every page load (force-dynamic), so a new row
// for the current day appears automatically each morning.
function buildDateScaffold(): DailyActualsRow[] {
  const rows: DailyActualsRow[] = [];
  const cur = new Date(Date.UTC(2026, 0, 1));
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    rows.push(emptyRow(`${y}-${m}-${d}`));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return rows;
}

export default async function V3MetricsPage() {
  const supabase = createServerClient();

  const [dailyResult, monthlyResult] = await Promise.all([
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "daily_actuals")
      .order("row_index", { ascending: true }),
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "monthly_metric")
      .order("row_index", { ascending: false })
      .limit(1),
  ]);

  if (dailyResult.error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading data: {dailyResult.error.message}</p>
      </div>
    );
  }

  // Parse DB rows into a map keyed by date
  const dbMap = new Map<string, DailyActualsRow>();
  for (const r of dailyResult.data ?? []) {
    const parsed = parseDailyActualsRow(r.data as Record<string, string>);
    if (parsed) dbMap.set(parsed.date, parsed);
  }

  // Merge scaffold with DB data (DB takes precedence)
  const scaffold = buildDateScaffold();
  const dailyRows: DailyActualsRow[] = scaffold.map((s) => dbMap.get(s.date) ?? s);

  let projectedLtv: number | null = null;
  if (monthlyResult.data?.[0]) {
    const monthlyRow = parseMonthlyMetricRow(monthlyResult.data[0].data as Record<string, string>);
    if (monthlyRow) {
      const teen = monthlyRow.teen_projected_ltv;
      const parent = monthlyRow.parent_projected_ltv;
      if (teen !== null && parent !== null) {
        projectedLtv = (teen + parent) / 2;
      } else {
        projectedLtv = teen ?? parent ?? null;
      }
    }
  }

  return <MetricsView dailyRows={dailyRows} projectedLtv={projectedLtv} />;
}
