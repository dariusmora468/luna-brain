import DataSheetView from "./DataSheetView";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TABS = [
  { tab: "daily_actuals", label: "Daily Actuals" },
  { tab: "experiment_log", label: "Experiment Log" },
  { tab: "monthly_metric", label: "Monthly Metric" },
] as const;

export default async function V2DataPage() {
  const supabase = createServerClient();

  const results = await Promise.all(
    TABS.map((t) =>
      supabase
        .from("v2_sheet_rows")
        .select("row_index, data")
        .eq("tab", t.tab)
        .order("row_index", { ascending: true })
    )
  );

  const tabData = TABS.map((t, i) => ({
    tab: t.tab,
    label: t.label,
    rows: (results[i].data ?? []).map((r) => r.data as Record<string, string>),
  }));

  return <DataSheetView tabData={tabData} />;
}
