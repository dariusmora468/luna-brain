"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { DailyActualsRow } from "@/lib/v2/parsers";
import { DAILY_COLUMNS, REQUIRED_MISSING_KEYS, ColumnDef } from "@/lib/v2/column-definitions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  dailyRows: DailyActualsRow[];
  projectedLtv: number | null;
}

type Granularity = "daily" | "weekly" | "monthly" | "quarterly";

interface AggregatedRow {
  periodLabel: string;
  date?: string; // only set in daily mode (for edit keying)
  tiktok_spend: number | null;
  teen_spend: number | null;
  parent_spend: number | null;
  adjust_total_installs: number | null;
  cpi_computed: number | null;
  new_paid_subs: number | null;
  revenue: number | null;
  viewers_teen: number | null;
  viewers_parent: number | null;
  trials_teen: number | null;
  trials_parent: number | null;
  cac_computed: number | null;
  ltv_cac_computed: number | null;
  [key: string]: string | number | null | undefined;
}

const LS_KEY = "luna-v3-metrics-edits";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtGbp(v: number | null): string {
  if (v === null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-GB");
}

function fmtRatio(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(2)}x`;
}

function fmtCell(v: string | number | null | undefined, format: ColumnDef["format"]): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  switch (format) {
    case "gbp":    return fmtGbp(v);
    case "number": return fmtNum(v);
    case "ratio":  return fmtRatio(v);
    default:       return String(v);
  }
}

function sumOrNull(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1);
  const diff = d.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function labelPeriod(key: string, granularity: Granularity): string {
  if (granularity === "weekly") {
    const [yr, wk] = key.split("-W");
    return `W${wk} ${yr}`;
  }
  if (granularity === "monthly") {
    const [yr, mo] = key.split("-");
    const d = new Date(Number(yr), Number(mo) - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  if (granularity === "quarterly") {
    return key.replace("-", " ");
  }
  return key;
}

function applyEdits(row: DailyActualsRow, edits: Record<string, string>): DailyActualsRow {
  const result = { ...row };
  for (const col of DAILY_COLUMNS) {
    if (col.isComputed || col.key === "date") continue;
    const editKey = `${row.date}:${col.key}`;
    if (editKey in edits) {
      const raw = edits[editKey].trim();
      const num = parseFloat(raw.replace(/[£,]/g, ""));
      (result as Record<string, unknown>)[col.key] = raw === "" ? null : isNaN(num) ? null : num;
    }
  }
  return result;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function groupRows(rows: DailyActualsRow[], granularity: Granularity, projectedLtv: number | null): AggregatedRow[] {
  if (granularity === "daily") {
    return rows.map((r) => {
      const cpi = r.tiktok_spend !== null && r.adjust_total_installs
        ? r.tiktok_spend / r.adjust_total_installs : null;
      const cac = r.tiktok_spend !== null && r.new_paid_subs
        ? r.tiktok_spend / r.new_paid_subs : null;
      const ltv_cac = cac !== null && projectedLtv !== null && cac > 0
        ? projectedLtv / cac : null;
      return {
        periodLabel: r.date,
        date: r.date,
        tiktok_spend: r.tiktok_spend,
        teen_spend: r.teen_spend,
        parent_spend: r.parent_spend,
        adjust_total_installs: r.adjust_total_installs,
        cpi_computed: cpi,
        new_paid_subs: r.new_paid_subs,
        revenue: r.revenue,
        viewers_teen: r.viewers_teen,
        viewers_parent: r.viewers_parent,
        trials_teen: r.trials_teen,
        trials_parent: r.trials_parent,
        cac_computed: cac,
        ltv_cac_computed: ltv_cac,
      };
    });
  }

  const groups = new Map<string, DailyActualsRow[]>();
  for (const r of rows) {
    const d = parseDate(r.date);
    const key =
      granularity === "weekly" ? isoWeek(d)
      : granularity === "monthly" ? isoMonth(d)
      : isoQuarter(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const spend    = sumOrNull(group.map((r) => r.tiktok_spend));
    const installs = sumOrNull(group.map((r) => r.adjust_total_installs));
    const subs     = sumOrNull(group.map((r) => r.new_paid_subs));
    const cpi  = spend !== null && installs ? spend / installs : null;
    const cac  = spend !== null && subs     ? spend / subs     : null;
    const ltv_cac = cac !== null && projectedLtv !== null && cac > 0
      ? projectedLtv / cac : null;
    return {
      periodLabel: labelPeriod(key, granularity),
      tiktok_spend:          spend,
      teen_spend:            sumOrNull(group.map((r) => r.teen_spend)),
      parent_spend:          sumOrNull(group.map((r) => r.parent_spend)),
      adjust_total_installs: installs,
      cpi_computed:          cpi,
      new_paid_subs:         subs,
      revenue:               sumOrNull(group.map((r) => r.revenue)),
      viewers_teen:          sumOrNull(group.map((r) => r.viewers_teen)),
      viewers_parent:        sumOrNull(group.map((r) => r.viewers_parent)),
      trials_teen:           sumOrNull(group.map((r) => r.trials_teen)),
      trials_parent:         sumOrNull(group.map((r) => r.trials_parent)),
      cac_computed:          cac,
      ltv_cac_computed:      ltv_cac,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ col }: { col: ColumnDef }) {
  if (col.isComputed) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-400">
        Computed
      </span>
    );
  }
  if (!col.sourceUrl) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-400">
        {col.source}
      </span>
    );
  }
  if (col.sourceUrl.includes("mixpanel") || col.source === "Mixpanel") {
    return (
      <span
        className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-400 cursor-help"
        title="Mixpanel URL — Darius to confirm exact funnel with filters"
      >
        Mixpanel (URL TBD)
      </span>
    );
  }
  return (
    <a
      href={col.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
    >
      {col.source}
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3M11 1L6 6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MetricsView({ dailyRows, projectedLtv }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // Edits stored as { "YYYY-MM-DD:colKey": "raw string value" }
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<{ date: string; colKey: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Load edits from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setEdits(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Apply edits to dailyRows for aggregation
  const editedRows = useMemo(
    () => dailyRows.map((r) => applyEdits(r, edits)),
    [dailyRows, edits]
  );

  const missingCols = DAILY_COLUMNS.filter((c) => c.requiredMissing);
  const hasMissingRequired = useMemo(
    () => editedRows.some((r) => r.viewers_teen === null),
    [editedRows]
  );

  // All aggregated rows (most recent first)
  const displayRows = useMemo(
    () => groupRows([...editedRows].reverse(), granularity, projectedLtv),
    [editedRows, granularity, projectedLtv]
  );

  const GRANULARITIES: Granularity[] = ["daily", "weekly", "monthly", "quarterly"];

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const startEdit = useCallback((date: string, colKey: string, currentDisplay: string) => {
    setEditingCell({ date, colKey });
    // Strip formatting for editing (show raw number)
    const raw = currentDisplay === "—" ? "" : currentDisplay.replace(/[£,x]/g, "");
    setEditingValue(raw);
  }, []);

  const commitEdit = useCallback((date: string, colKey: string, value: string) => {
    setEditingCell(null);
    const newEdits = { ...edits, [`${date}:${colKey}`]: value };
    // Remove if empty (revert to original)
    if (value.trim() === "") delete newEdits[`${date}:${colKey}`];
    setEdits(newEdits);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newEdits)); } catch { /* ignore */ }
  }, [edits]);

  const colCount = DAILY_COLUMNS.length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">V3</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Metrics</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daily actuals. Click any cell to edit.{" "}
          {projectedLtv !== null && (
            <span className="text-amber-600">Projected LTV: {fmtGbp(projectedLtv)}</span>
          )}
        </p>
      </div>

      {/* Missing data banner */}
      {hasMissingRequired && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Missing data for full CAC/LTV analysis</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {missingCols.map((c) => c.label).join(", ")} — cells highlighted in amber.
            </p>
          </div>
        </div>
      )}

      {projectedLtv === null && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">LTV:CAC shows — </span>
            No projected LTV found. Upload a Monthly Metric sheet to unlock LTV:CAC.
          </p>
        </div>
      )}

      {/* Granularity tabs */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                granularity === g
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {granularity !== "daily" && (
          <span className="text-[11px] text-gray-400 italic">
            Read-only in {granularity} view — edit in Daily
          </span>
        )}
        {Object.keys(edits).length > 0 && (
          <button
            onClick={() => {
              setEdits({});
              try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
            }}
            className="ml-auto text-[11px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear all edits ({Object.keys(edits).length})
          </button>
        )}
      </div>

      {/* Empty state */}
      {dailyRows.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">No daily data imported yet</p>
          <a href="/v2/import" className="text-violet-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
        </div>
      )}

      {/* Table */}
      {dailyRows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: colCount * 120 }}>
              <thead>
                {/* Row 1: Column names */}
                <tr className="border-b border-gray-100">
                  {DAILY_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 pt-3 pb-1 text-left text-xs font-semibold whitespace-nowrap ${
                        col.isCore
                          ? "bg-amber-50 text-amber-800"
                          : col.requiredMissing
                          ? "bg-amber-50/60 text-gray-700"
                          : "bg-white text-gray-800"
                      }`}
                    >
                      {col.label}
                      {col.requiredMissing && (
                        <span className="ml-1 text-amber-500" title="Missing — needed for CAC/LTV">●</span>
                      )}
                      {col.isCore && (
                        <span className="ml-1 text-amber-600" title="Core metric">★</span>
                      )}
                    </th>
                  ))}
                </tr>

                {/* Row 2: Definitions */}
                <tr className="border-b border-gray-100">
                  {DAILY_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-1.5 text-left align-top ${
                        col.isCore ? "bg-amber-50/60" : col.requiredMissing ? "bg-amber-50/40" : "bg-gray-50/50"
                      }`}
                    >
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-[180px]">
                        {col.definition}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Row 3: Source badges */}
                <tr className="border-b-2 border-gray-200">
                  {DAILY_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 ${
                        col.isCore ? "bg-amber-50/60" : col.requiredMissing ? "bg-amber-50/40" : "bg-gray-50/50"
                      }`}
                    >
                      <SourceBadge col={col} />
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayRows.map((row, ri) => (
                  <tr
                    key={row.periodLabel}
                    className={`border-b border-gray-50 ${ri % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                  >
                    {DAILY_COLUMNS.map((col) => {
                      const isDaily = granularity === "daily";
                      const isEditable = isDaily && !col.isComputed && col.key !== "date";
                      const isEditing = isEditable && editingCell?.date === row.date && editingCell?.colKey === col.key;

                      const rawVal = col.key === "date"
                        ? row.periodLabel
                        : (row[col.key] as number | null);

                      const displayVal = col.key === "date"
                        ? row.periodLabel
                        : fmtCell(rawVal as number | null, col.format);

                      const isEmpty = rawVal === null && col.key !== "date";
                      const isRequiredMissing = isEmpty && REQUIRED_MISSING_KEYS.has(col.key);
                      const isEdited = row.date && edits[`${row.date}:${col.key}`] !== undefined;

                      return (
                        <td
                          key={col.key}
                          onClick={() => {
                            if (isEditable && !isEditing) {
                              startEdit(row.date!, col.key, displayVal);
                            }
                          }}
                          className={`px-0 py-0 text-xs tabular-nums whitespace-nowrap relative ${
                            col.isCore
                              ? "font-semibold text-amber-800 bg-amber-50/40"
                              : isRequiredMissing
                              ? "bg-amber-100/60 text-amber-600"
                              : "text-gray-700"
                          } ${isEditable && !isEditing ? "cursor-text hover:bg-violet-50/60 transition-colors" : ""}`}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => commitEdit(row.date!, col.key, editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(row.date!, col.key, editingValue);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="w-full px-3 py-2 bg-violet-50 border-2 border-violet-400 outline-none text-xs text-gray-900 tabular-nums"
                              style={{ minWidth: 80 }}
                            />
                          ) : (
                            <span className="block px-3 py-2">
                              {displayVal}
                              {isEdited && (
                                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400 inline-block align-middle" title="Manually edited" />
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              {displayRows.length} {granularity} row{displayRows.length !== 1 ? "s" : ""} · most recent first
              {projectedLtv === null && " · LTV:CAC requires projected LTV from monthly sheet"}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300 inline-block" />
                Missing data
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                Edited
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
