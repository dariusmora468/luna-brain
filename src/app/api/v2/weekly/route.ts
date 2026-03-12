// ============================================================
// luna Brain V2 — Weekly API Route
// Computes weekly aggregates automatically from daily_actuals.
// The weekly_summary CSV tab is no longer used.
// ============================================================

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow } from "@/lib/v2/parsers";
import type { WeeklySummaryRow } from "@/lib/v2/parsers";

/**
 * Given a YYYY-MM-DD date string, return the ISO week-ending Sunday
 * as a YYYY-MM-DD string.
 *
 * E.g. 2026-03-11 (Wednesday) → 2026-03-15 (Sunday of that week)
 */
function getWeekEndingSunday(dateStr: string): string {
  // Parse using local-time constructor to avoid UTC midnight shift
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // JS: 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(y, m - 1, d + daysUntilSunday);
  const sy = sunday.getFullYear();
  const sm = String(sunday.getMonth() + 1).padStart(2, "0");
  const sd = String(sunday.getDate()).padStart(2, "0");
  return `${sy}-${sm}-${sd}`;
}

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("v2_sheet_rows")
    .select("row_index, data")
    .eq("tab", "daily_actuals")
    .order("row_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Parse all daily rows, drop unparseable ones
  const dailyRows = (data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dailyRows.length === 0) {
    return NextResponse.json([]);
  }

  // ── Group by week-ending Sunday ───────────────────────────
  const weekMap = new Map<
    string,
    {
      days: typeof dailyRows;
    }
  >();

  for (const row of dailyRows) {
    const weekEnding = getWeekEndingSunday(row.date);
    if (!weekMap.has(weekEnding)) {
      weekMap.set(weekEnding, { days: [] });
    }
    weekMap.get(weekEnding)!.days.push(row);
  }

  // Sort weeks chronologically (most recent first for the response)
  const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) =>
    b.localeCompare(a)
  );

  // ── Compute aggregates per week ───────────────────────────
  function aggregateWeek(
    days: typeof dailyRows
  ): Omit<WeeklySummaryRow, "spend_lw" | "installs_lw" | "new_subs_lw" | "revenue_lw" | "mrr_lw" | "cpi_lw" | "active_subs" | "net_new_subs" | "weeks_to_1m_arr" | "raw"> {
    const spend = days.reduce((s, r) => (r.tiktok_spend !== null ? s + r.tiktok_spend : s), 0) || null;
    const realSpend = days.some((r) => r.tiktok_spend !== null) ? spend : null;

    const installs = days.reduce((s, r) => (r.adjust_total_installs !== null ? s + r.adjust_total_installs : s), 0);
    const realInstalls = days.some((r) => r.adjust_total_installs !== null) ? installs : null;

    const newSubs = days.reduce((s, r) => (r.new_paid_subs !== null ? s + r.new_paid_subs : s), 0);
    const realNewSubs = days.some((r) => r.new_paid_subs !== null) ? newSubs : null;

    const revenue = days.reduce((s, r) => (r.revenue !== null ? s + r.revenue : s), 0);
    const realRevenue = days.some((r) => r.revenue !== null) ? revenue : null;

    // MRR: last day's value that has a non-null MRR
    const mrrDay = [...days].reverse().find((r) => r.mrr !== null);
    const mrr = mrrDay?.mrr ?? null;

    // CPI: spend / installs (null if either unavailable or installs = 0)
    const cpi =
      realSpend !== null && realInstalls !== null && realInstalls > 0
        ? realSpend / realInstalls
        : null;

    return {
      week_ending: null, // filled in below
      spend_tw: realSpend,
      installs_tw: realInstalls,
      new_subs_tw: realNewSubs,
      revenue_tw: realRevenue,
      mrr_tw: mrr,
      cpi_tw: cpi,
    };
  }

  // ── Build WeeklySummaryRow objects with LW comparisons ────
  const result: WeeklySummaryRow[] = sortedWeeks.map(([weekEnding, { days }], idx) => {
    const tw = aggregateWeek(days);

    // Previous week (the next entry in sorted-desc array = one week earlier)
    const prevEntry = sortedWeeks[idx + 1];
    const lwDays = prevEntry ? prevEntry[1].days : [];
    const lw = lwDays.length > 0 ? aggregateWeek(lwDays) : null;

    return {
      week_ending: weekEnding,
      spend_tw: tw.spend_tw,
      installs_tw: tw.installs_tw,
      new_subs_tw: tw.new_subs_tw,
      revenue_tw: tw.revenue_tw,
      mrr_tw: tw.mrr_tw,
      cpi_tw: tw.cpi_tw,
      spend_lw: lw?.spend_tw ?? null,
      installs_lw: lw?.installs_tw ?? null,
      new_subs_lw: lw?.new_subs_tw ?? null,
      revenue_lw: lw?.revenue_tw ?? null,
      mrr_lw: lw?.mrr_tw ?? null,
      cpi_lw: lw?.cpi_tw ?? null,
      active_subs: null,
      net_new_subs: null,
      weeks_to_1m_arr: null,
      raw: {},
    };
  });

  return NextResponse.json(result);
}
