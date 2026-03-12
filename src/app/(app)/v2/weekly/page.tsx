import WeeklyView from "./WeeklyView";
import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow, parseExperimentRow, ExperimentRow } from "@/lib/v2/parsers";
import type { TabStatus } from "@/components/ImportStatusBar";
import type { WeeklySummaryRow } from "@/lib/v2/parsers";

export const dynamic = "force-dynamic";

const OTHER_TABS = [
  { tab: "daily_actuals", label: "Daily" },
  { tab: "experiment_log", label: "Experiments" },
  { tab: "monthly_metric", label: "Monthly" },
] as const;

// Compute week-ending Sunday (YYYY-MM-DD) for a given YYYY-MM-DD date string
function getWeekEndingSunday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(y, m - 1, d + daysUntilSunday);
  const sy = sunday.getFullYear();
  const sm = String(sunday.getMonth() + 1).padStart(2, "0");
  const sd = String(sunday.getDate()).padStart(2, "0");
  return `${sy}-${sm}-${sd}`;
}

export default async function WeeklyPage() {
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
        <p className="text-red-500">Error loading weekly data: {dailyResult.error.message}</p>
      </div>
    );
  }

  const importStatus: TabStatus[] = OTHER_TABS.map((t, i) => ({
    tab: t.tab,
    label: t.label,
    count: countResults[i].count ?? 0,
  }));

  // Parse daily rows
  const dailyRows = (dailyResult.data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter(Boolean) as NonNullable<ReturnType<typeof parseDailyActualsRow>>[];

  // Group by week-ending Sunday
  const weekMap = new Map<string, typeof dailyRows>();
  for (const row of dailyRows) {
    if (!row.date) continue;
    const weekEnding = getWeekEndingSunday(row.date);
    if (!weekMap.has(weekEnding)) weekMap.set(weekEnding, []);
    weekMap.get(weekEnding)!.push(row);
  }

  // Sort week endings descending (most recent first)
  const sortedWeekEndings = Array.from(weekMap.keys()).sort((a, b) => b.localeCompare(a));

  function sumNullable(vals: (number | null)[]): number | null {
    const nums = vals.filter((v): v is number => v !== null);
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
  }
  function lastNonNull(vals: (number | null)[]): number | null {
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i] !== null) return vals[i];
    }
    return null;
  }
  function divOrNull(a: number | null, b: number | null): number | null {
    if (a === null || b === null || b === 0) return null;
    return a / b;
  }

  function aggregateWeek(rows: typeof dailyRows) {
    return {
      spend_tw: sumNullable(rows.map((r) => r.tiktok_spend)),
      installs_tw: sumNullable(rows.map((r) => r.adjust_total_installs)),
      new_subs_tw: sumNullable(rows.map((r) => r.new_paid_subs)),
      revenue_tw: sumNullable(rows.map((r) => r.revenue)),
      mrr_tw: lastNonNull(rows.map((r) => r.mrr)),
    };
  }

  const weeks: WeeklySummaryRow[] = sortedWeekEndings.map((weekEnding, i) => {
    const rows = weekMap.get(weekEnding)!;
    const tw = aggregateWeek(rows);

    const prevWeekEnding = sortedWeekEndings[i + 1] ?? null;
    const prevRows = prevWeekEnding ? (weekMap.get(prevWeekEnding) ?? []) : [];
    const lw = prevRows.length > 0 ? aggregateWeek(prevRows) : {
      spend_tw: null, installs_tw: null, new_subs_tw: null, revenue_tw: null, mrr_tw: null,
    };

    return {
      week_ending: weekEnding,
      spend_tw: tw.spend_tw,
      spend_lw: lw.spend_tw,
      installs_tw: tw.installs_tw,
      installs_lw: lw.installs_tw,
      new_subs_tw: tw.new_subs_tw,
      new_subs_lw: lw.new_subs_tw,
      revenue_tw: tw.revenue_tw,
      revenue_lw: lw.revenue_tw,
      mrr_tw: tw.mrr_tw,
      mrr_lw: lw.mrr_tw,
      cpi_tw: divOrNull(tw.spend_tw, tw.installs_tw),
      cpi_lw: divOrNull(lw.spend_tw, lw.installs_tw),
      // These optional fields are not computable from daily actuals
      active_subs: null,
      net_new_subs: null,
      weeks_to_1m_arr: null,
      raw: {},
    };
  });

  const experiments: ExperimentRow[] = (expResult.data ?? [])
    .map((r) => parseExperimentRow(r.data as Record<string, string>))
    .filter(Boolean) as ExperimentRow[];

  return <WeeklyView weeks={weeks} experiments={experiments} importStatus={importStatus} />;
}
