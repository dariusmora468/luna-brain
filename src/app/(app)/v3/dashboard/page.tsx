import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, DailyActualsRow } from "@/lib/v2/parsers";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

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

  const dailyRows: DailyActualsRow[] = (data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter(Boolean) as DailyActualsRow[];

  return <DashboardView dailyRows={dailyRows} />;
}
