import MonthlyView from "./MonthlyView";
import { createServerClient } from "@/lib/supabase";
import { parseMonthlyMetricRow, MonthlyMetricRow } from "@/lib/v2/parsers";
import type { TabStatus } from "@/components/ImportStatusBar";

export const dynamic = "force-dynamic";

const OTHER_TABS = [
  { tab: "daily_actuals", label: "Daily" },
  { tab: "experiment_log", label: "Experiments" },
] as const;

export default async function MonthlyPage() {
  const supabase = createServerClient();

  const [{ data, error }, ...countResults] = await Promise.all([
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "monthly_metric")
      .order("row_index", { ascending: true }),
    ...OTHER_TABS.map((t) =>
      supabase
        .from("v2_sheet_rows")
        .select("id", { count: "exact", head: true })
        .eq("tab", t.tab)
    ),
  ]);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading monthly data: {error.message}</p>
      </div>
    );
  }

  const importStatus: TabStatus[] = OTHER_TABS.map((t, i) => ({
    tab: t.tab,
    label: t.label,
    count: countResults[i].count ?? 0,
  }));

  const rows: MonthlyMetricRow[] = (data ?? [])
    .map((r) => parseMonthlyMetricRow(r.data as Record<string, string>))
    .filter(Boolean) as MonthlyMetricRow[];

  return <MonthlyView rows={rows} importStatus={importStatus} />;
}
