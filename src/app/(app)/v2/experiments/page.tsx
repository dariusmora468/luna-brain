import ExperimentsView from "./ExperimentsView";
import { createServerClient } from "@/lib/supabase";
import { parseExperimentRow, parseDailyActualsRow, ExperimentRow } from "@/lib/v2/parsers";
import type { TabStatus } from "@/components/ImportStatusBar";

export const dynamic = "force-dynamic";

const OTHER_TABS = [
  { tab: "daily_actuals", label: "Daily" },
  { tab: "monthly_metric", label: "Monthly" },
] as const;

export default async function ExperimentsPage() {
  const supabase = createServerClient();

  const [expResult, ...countResults] = await Promise.all([
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

  if (expResult.error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading experiments: {expResult.error.message}</p>
      </div>
    );
  }

  const importStatus: TabStatus[] = OTHER_TABS.map((t, i) => ({
    tab: t.tab,
    label: t.label,
    count: countResults[i].count ?? 0,
  }));

  const experiments: ExperimentRow[] = (expResult.data ?? [])
    .map((r) => parseExperimentRow(r.data as Record<string, string>))
    .filter(Boolean) as ExperimentRow[];

  return <ExperimentsView experiments={experiments} importStatus={importStatus} />;
}
