import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, parseMonthlyMetricRow, DailyActualsRow } from "@/lib/v2/parsers";
import MetricsView from "./MetricsView";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
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

  const dailyRows: DailyActualsRow[] = (dailyResult.data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter(Boolean) as DailyActualsRow[];

  // Get projected LTV from the most recent monthly row
  let projectedLtv: number | null = null;
  if (monthlyResult.data?.[0]) {
    const monthlyRow = parseMonthlyMetricRow(monthlyResult.data[0].data as Record<string, string>);
    if (monthlyRow) {
      // Average teen + parent projected LTV as blended estimate, fallback to teen alone
      const teen = monthlyRow.teen_projected_ltv;
      const parent = monthlyRow.parent_projected_ltv;
      if (teen !== null && parent !== null) {
        projectedLtv = (teen + parent) / 2;
      } else {
        projectedLtv = teen ?? parent ?? null;
      }
    }
  }

  return (
    <MetricsView dailyRows={dailyRows} projectedLtv={projectedLtv} />
  );
}
