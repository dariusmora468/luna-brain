import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, DailyActualsRow } from "@/lib/v2/parsers";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

function emptyRow(dateStr: string): DailyActualsRow {
  return {
    date: dateStr,
    tiktok_spend: null, tiktok_spend_us: null, tiktok_spend_uk: null, tiktok_spend_row: null,
    google_spend: null, meta_spend: null,
    teen_spend: null, teen_spend_us: null, teen_spend_uk: null, teen_spend_row: null,
    parent_spend: null, parent_spend_us: null, parent_spend_uk: null, parent_spend_row: null,
    adjust_total_installs: null, installs_us: null, installs_uk: null, installs_row: null,
    installs_android: null,
    est_paid_installs: null,
    teen_installs: null, parent_installs: null,
    new_paid_subs: null, revenue: null, mrr: null,
    viewers_teen: null, viewers_parent: null,
    trials_all: null, trials_us: null, trials_uk: null, trials_row: null,
    tiktok_reported_installs: null, mixpanel_installs: null,
    raw: { Date: dateStr },
  };
}

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

export default async function V3DashboardPage() {
  const supabase = createServerClient();

  const [dailyResult, editsResult] = await Promise.all([
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "daily_actuals")
      .order("row_index", { ascending: true }),
    supabase
      .from("v3_daily_edits")
      .select("date, data"),
  ]);

  if (dailyResult.error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading data: {dailyResult.error.message}</p>
      </div>
    );
  }

  const editsMap = new Map<string, Record<string, number | null>>();
  for (const row of editsResult.data ?? []) {
    const d = typeof row.date === "string" ? row.date : String(row.date);
    editsMap.set(d, row.data as Record<string, number | null>);
  }

  const dbMap = new Map<string, DailyActualsRow>();
  for (const r of dailyResult.data ?? []) {
    const parsed = parseDailyActualsRow(r.data as Record<string, string>);
    if (parsed) dbMap.set(parsed.date, parsed);
  }

  const dailyRows: DailyActualsRow[] = buildDateScaffold().map((s) => {
    const base = dbMap.get(s.date) ?? s;
    const edits = editsMap.get(s.date);
    if (!edits) return base;
    return { ...base, ...edits };
  });

  return <DashboardView dailyRows={dailyRows} />;
}
