import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, DailyActualsRow } from "@/lib/v2/parsers";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

function emptyRow(dateStr: string): DailyActualsRow {
  return {
    date: dateStr,
    tiktok_spend: null, google_spend: null, meta_spend: null,
    teen_spend: null, parent_spend: null,
    adjust_total_installs: null, est_paid_installs: null,
    teen_installs: null, parent_installs: null,
    new_paid_subs: null, revenue: null, mrr: null,
    viewers_teen: null, viewers_parent: null,
    trials_teen: null, trials_parent: null,
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

  const { data, error } = await supabase
    .from("v2_sheet_rows")
    .select("row_index, data")
    .eq("tab", "daily_actuals")
    .order("row_index", { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading data: {error.message}</p>
      </div>
    );
  }

  // Merge DB rows with scaffold (DB takes precedence per date)
  const dbMap = new Map<string, DailyActualsRow>();
  for (const r of data ?? []) {
    const parsed = parseDailyActualsRow(r.data as Record<string, string>);
    if (parsed) dbMap.set(parsed.date, parsed);
  }
  const dailyRows: DailyActualsRow[] = buildDateScaffold().map((s) => dbMap.get(s.date) ?? s);

  return <DashboardView dailyRows={dailyRows} />;
}
