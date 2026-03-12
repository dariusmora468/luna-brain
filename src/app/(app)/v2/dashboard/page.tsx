import DailyOpsView from "./DailyOpsView";
import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, parseExperimentRow, DailyActualsRow, ExperimentRow } from "@/lib/v2/parsers";
import type { TabStatus } from "@/components/ImportStatusBar";

export const dynamic = "force-dynamic";

const OTHER_TABS = [
  { tab: "experiment_log", label: "Experiments" },
  { tab: "monthly_metric", label: "Monthly" },
] as const;

export default async function V2DashboardPage() {
  const supabase = createServerClient();

  const [dailyResult, expResult, ...countResults] = await Promise.all([
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "daily_actuals")
      .order("row_index", { ascending: true }),
    supabase
      .from("v2_sheet_rows")
      .select("row_index, data")
      .eq("tab", "experiment_log")
      .order("row_index", { ascending: true }),
    ...OTHER_TABS.map((t) =>
      supabase
        .from("v2_sheet_rows")
        .select("id", { count: "exact", head: true })
        .eq("tab", t.tab)
    ),
  ]);

  if (dailyResult.error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading daily data: {dailyResult.error.message}</p>
      </div>
    );
  }

  const importStatus: TabStatus[] = OTHER_TABS.map((t, i) => ({
    tab: t.tab,
    label: t.label,
    count: countResults[i].count ?? 0,
  }));

  const dailyRows: DailyActualsRow[] = (dailyResult.data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter(Boolean) as DailyActualsRow[];

  const experiments: ExperimentRow[] = (expResult.data ?? [])
    .map((r) => parseExperimentRow(r.data as Record<string, string>))
    .filter(Boolean) as ExperimentRow[];

  return <DailyOpsView dailyRows={dailyRows} experiments={experiments} importStatus={importStatus} />;
}
