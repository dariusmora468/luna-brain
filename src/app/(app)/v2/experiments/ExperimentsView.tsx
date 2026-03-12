"use client";

import { useState, useMemo } from "react";
import { ExperimentRow } from "@/lib/v2/parsers";
import { ImportStatusBar } from "@/components/ImportStatusBar";
import type { TabStatus } from "@/components/ImportStatusBar";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtGbp(v: number | null | undefined): string {
  if (v == null) return "—";
  return `£${v.toFixed(2)}`;
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

// ── MetricPill ────────────────────────────────────────────────────────────────

function MetricPill({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? "text-amber-700" : "text-gray-800"}`}>{value}</p>
      {note && <p className="text-[9px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

// ── LTV:CAC Trend Chart (SVG) ─────────────────────────────────────────────────

function LtvCacTrendChart({ experiments }: { experiments: ExperimentRow[] }) {
  const points = useMemo(() => {
    return experiments
      .filter((e) => e.status === "Done" && e.ltv_cac !== null && e.end_date)
      .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""))
      .map((e) => ({ name: e.name, date: e.end_date!, ltv_cac: e.ltv_cac! }));
  }, [experiments]);

  if (points.length < 2) return null;

  const W = 600;
  const H = 140;
  const PAD_L = 36;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...points.map((p) => p.ltv_cac), 3.5);
  const toX = (i: number) =>
    PAD_L + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
  const toY = (v: number) => PAD_T + chartH - (v / maxVal) * chartH;

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.ltv_cac)}`).join(" ");

  // Reference y values (clamped to chart)
  const y3 = toY(3);
  const y1 = toY(1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">LTV:CAC Trend Across Experiments</p>
          <p className="text-xs text-gray-400 mt-0.5">Is it going in the right direction?</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-green-400 inline-block" />Target 3×</span>
          <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-red-400 inline-block" />Break-even 1×</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        {/* Y-axis labels */}
        {[0, 1, 2, 3].map((v) => {
          const y = toY(v);
          if (y < PAD_T || y > PAD_T + chartH) return null;
          return (
            <text key={v} x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">
              {v}×
            </text>
          );
        })}

        {/* Reference lines */}
        {y3 >= PAD_T && y3 <= PAD_T + chartH && (
          <line x1={PAD_L} y1={y3} x2={W - PAD_R} y2={y3} stroke="#4ADE80" strokeWidth={1} strokeDasharray="4 3" />
        )}
        {y1 >= PAD_T && y1 <= PAD_T + chartH && (
          <line x1={PAD_L} y1={y1} x2={W - PAD_R} y2={y1} stroke="#F87171" strokeWidth={1} strokeDasharray="4 3" />
        )}

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinejoin="round" />

        {/* Data points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.ltv_cac)} r={4} fill="#F59E0B" />
            <text
              x={toX(i)}
              y={PAD_T + chartH + 16}
              textAnchor="middle"
              fontSize={8}
              fill="#6B7280"
              className="select-none"
            >
              {p.date.slice(5)}
            </text>
            <title>{p.name}: {p.ltv_cac.toFixed(2)}×</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface Props {
  experiments: ExperimentRow[];
  importStatus?: TabStatus[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const WINDOW_DAYS = 30;
const ROW_H = 36;        // px per row
const LABEL_W = 192;     // px for name column

// ── Status styling ───────────────────────────────────────────────────────────

const STATUS_BAR: Record<string, string> = {
  Done:          "#9CA3AF",
  Running:       "#F59E0B",
  "Not Started": "#60A5FA",
};

const STATUS_BADGE: Record<string, string> = {
  Done:          "bg-gray-100 text-gray-600",
  Running:       "bg-amber-100 text-amber-700",
  "Not Started": "bg-blue-100 text-blue-700",
};

const DECISION_BADGE: Record<string, string> = {
  Applied:       "bg-green-100 text-green-700",
  "Not Applied": "bg-gray-100 text-gray-500",
  TBD:           "bg-yellow-100 text-yellow-700",
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split("-").map(Number);
  if (parts.length !== 3) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function defaultWindowStart(): Date {
  // Center today: show 14 days before → 16 days ahead
  return startOfDay(addDays(new Date(), -14));
}

// ── Tooltip component ────────────────────────────────────────────────────────

interface TooltipData {
  exp: ExperimentRow;
  x: number;
  y: number;
}

function GanttTooltip({ data }: { data: TooltipData }) {
  // Keep tooltip inside viewport horizontally
  const tipW = 220;
  const left = Math.min(data.x + 10, window.innerWidth - tipW - 16);
  const top = data.y - 90;

  return (
    <div
      className="fixed z-50 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-2xl pointer-events-none"
      style={{ left, top, width: tipW }}
    >
      <p className="font-semibold mb-1 leading-tight">{data.exp.name}</p>
      <p className="text-gray-300">
        {data.exp.start_date} → {data.exp.end_date ?? "ongoing"}
        {data.exp.days_running !== null && ` · ${data.exp.days_running}d`}
      </p>
      {data.exp.result && (
        <p className="text-gray-400 mt-1.5 leading-relaxed line-clamp-3">{data.exp.result}</p>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ExperimentsView({ experiments, importStatus }: Props) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [focusFilter, setFocusFilter] = useState("All");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState<Date>(defaultWindowStart);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Window bounds
  const windowEnd = addDays(windowStart, WINDOW_DAYS);
  const today = startOfDay(new Date());
  const todayPct =
    ((today.getTime() - windowStart.getTime()) / (WINDOW_DAYS * 86400000)) * 100;

  // Navigation
  const goBack    = () => setWindowStart((p) => addDays(p, -WINDOW_DAYS));
  const goForward = () => setWindowStart((p) => addDays(p, WINDOW_DAYS));
  const goToday   = () => setWindowStart(defaultWindowStart());

  // X-axis ticks: every 7 days, plus month boundaries
  const ticks = useMemo(() => {
    const result: { label: string; pct: number; isMonth: boolean }[] = [];
    for (let i = 0; i <= WINDOW_DAYS; i++) {
      const d = addDays(windowStart, i);
      const isWeek  = i % 7 === 0;
      const isMonth = d.getDate() === 1;
      if (!isWeek && !isMonth) continue;
      const pct = (i / WINDOW_DAYS) * 100;
      const label = isMonth
        ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : String(d.getDate());
      result.push({ label, pct, isMonth });
    }
    return result;
  }, [windowStart]);

  // Grid lines every 7 days
  const gridPcts = useMemo(
    () => Array.from({ length: Math.floor(WINDOW_DAYS / 7) + 1 }, (_, i) => (i * 7 / WINDOW_DAYS) * 100),
    []
  );

  // Filters
  const statuses   = useMemo(() => ["All", ...Array.from(new Set(experiments.map((e) => e.status).filter(Boolean)))], [experiments]);
  const segments   = useMemo(() => ["All", ...Array.from(new Set(experiments.map((e) => e.segment).filter(Boolean)))], [experiments]);
  const focusAreas = useMemo(() => ["All", ...Array.from(new Set(experiments.map((e) => e.focus_area).filter(Boolean)))], [experiments]);

  const filtered = useMemo(
    () =>
      experiments.filter((e) => {
        if (statusFilter !== "All" && e.status !== statusFilter) return false;
        if (segmentFilter !== "All" && e.segment !== segmentFilter) return false;
        if (focusFilter !== "All" && e.focus_area !== focusFilter) return false;
        return true;
      }),
    [experiments, statusFilter, segmentFilter, focusFilter]
  );

  // Compute Gantt bar bounds (as % of window width)
  function getBar(exp: ExperimentRow) {
    const start = parseDate(exp.start_date);
    if (!start) return null;
    const end = parseDate(exp.end_date) ?? addDays(today, 1);
    const totalMs = WINDOW_DAYS * 86400000;
    const wsMs    = windowStart.getTime();
    const rawL = (start.getTime() - wsMs) / totalMs * 100;
    const rawR = (end.getTime()   - wsMs) / totalMs * 100;
    if (rawR <= 0 || rawL >= 100) return null;
    const leftPct  = Math.max(0, rawL);
    const rightPct = Math.min(100, rawR);
    return {
      leftPct,
      widthPct:     Math.max(rightPct - leftPct, 0.4),
      clippedLeft:  rawL < 0,
      clippedRight: rawR > 100,
    };
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (experiments.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Experiment Pipeline</h1>
        {importStatus && importStatus.length > 0 && (
          <div className="mb-4"><ImportStatusBar tabs={importStatus} /></div>
        )}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">Import the Experiment Log to see your experiments here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">Go to Import →</a>
        </div>
      </div>
    );
  }

  const windowLabel = `${fmtShort(windowStart)} – ${fmtShort(windowEnd)}`;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Experiments</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Experiment Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          {experiments.length} total ·{" "}
          {experiments.filter((e) => e.status === "Running").length} running ·{" "}
          {experiments.filter((e) => e.status === "Done").length} done
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === s
                  ? s === "Running"      ? "bg-amber-500 text-white"
                  : s === "Done"         ? "bg-gray-500 text-white"
                  : s === "Not Started"  ? "bg-blue-400 text-white"
                  : "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {segments.length > 2 && (
          <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
            {segments.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {focusAreas.length > 2 && (
          <select value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
            {focusAreas.map((f) => <option key={f}>{f}</option>)}
          </select>
        )}
      </div>

      {/* ── LTV:CAC Trend Chart ──────────────────────────────────────────── */}
      <LtvCacTrendChart experiments={experiments} />

      {/* ── Gantt Chart ─────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            {/* Window navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={goBack}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                title="Previous 30 days"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-gray-700 w-40 text-center">{windowLabel}</span>
              <button
                onClick={goForward}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                title="Next 30 days"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={goToday}
                className="ml-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded inline-block" style={{ background: STATUS_BAR["Running"] }} />Running
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded inline-block" style={{ background: STATUS_BAR["Done"] }} />Done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded inline-block" style={{ background: STATUS_BAR["Not Started"] }} />Not Started
              </span>
              <span className="flex items-center gap-1.5 ml-1">
                <span className="w-3 h-0 border-t-2 border-dashed border-amber-400 inline-block" />Today
              </span>
            </div>
          </div>

          {/* Chart — scrollable if very narrow */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: 560 }}>

              {/* X-axis header */}
              <div className="flex" style={{ borderBottom: "1px solid #F3F4F6" }}>
                {/* Name column header */}
                <div
                  className="flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
                  style={{ width: LABEL_W }}
                >
                  Experiment
                </div>

                {/* Tick labels */}
                <div className="flex-1 relative" style={{ height: 32 }}>
                  {ticks.map((tick, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex flex-col items-center justify-end pb-1"
                      style={{ left: `${tick.pct}%`, transform: "translateX(-50%)" }}
                    >
                      <span className={`text-[10px] whitespace-nowrap ${tick.isMonth ? "text-gray-600 font-semibold" : "text-gray-400"}`}>
                        {tick.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div
                className="relative"
                style={{ height: filtered.length * ROW_H }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Background grid + today line (positioned in chart area only) */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: LABEL_W, right: 0 }}
                >
                  {gridPcts.map((pct, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px"
                      style={{ left: `${pct}%`, background: "#F3F4F6" }}
                    />
                  ))}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${todayPct}%`,
                        width: 2,
                        background: "#F59E0B",
                        opacity: 0.75,
                      }}
                    />
                  )}
                </div>

                {/* Experiment rows */}
                {filtered.map((exp, ri) => {
                  const bar  = getBar(exp);
                  const isHl = highlighted === exp.name;
                  const barColor = isHl
                    ? "#F97316"
                    : (STATUS_BAR[exp.status] ?? "#D1D5DB");

                  return (
                    <div
                      key={exp.name}
                      className={`absolute flex items-center w-full ${ri % 2 !== 0 ? "bg-gray-50/60" : ""}`}
                      style={{ top: ri * ROW_H, height: ROW_H }}
                    >
                      {/* Name label */}
                      <div
                        className="flex-shrink-0 px-3 text-xs font-medium text-gray-600 truncate cursor-pointer hover:text-gray-900 select-none"
                        style={{ width: LABEL_W }}
                        onClick={() => setHighlighted(isHl ? null : exp.name)}
                        title={exp.name}
                      >
                        {exp.name}
                      </div>

                      {/* Bar area */}
                      <div className="flex-1 relative h-full">
                        {bar && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 cursor-pointer transition-opacity duration-150"
                            style={{
                              left:    `${bar.leftPct}%`,
                              width:   `${bar.widthPct}%`,
                              height:  22,
                              backgroundColor: barColor,
                              opacity: highlighted && !isHl ? 0.3 : 1,
                              borderRadius:
                                bar.clippedLeft && bar.clippedRight ? 0
                                : bar.clippedLeft  ? "0 5px 5px 0"
                                : bar.clippedRight ? "5px 0 0 5px"
                                : 5,
                            }}
                            onClick={() => setHighlighted(isHl ? null : exp.name)}
                            onMouseEnter={(e) =>
                              setTooltip({ exp, x: e.clientX, y: e.clientY })
                            }
                            onMouseMove={(e) =>
                              setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
                            }
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip (portal-like, fixed) */}
      {tooltip && <GanttTooltip data={tooltip} />}

      {/* ── Experiment Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((exp) => (
          <div
            key={exp.name}
            className={`bg-white rounded-2xl p-5 shadow-sm border cursor-pointer transition-all duration-200 ${
              highlighted === exp.name ? "border-amber-400 shadow-md ring-1 ring-amber-200" : "border-gray-100 hover:border-gray-200"
            }`}
            onClick={() => setHighlighted(highlighted === exp.name ? null : exp.name)}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{exp.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[exp.status] ?? "bg-gray-100 text-gray-500"}`}>
                {exp.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
              {exp.start_date && (
                <span>{exp.start_date} → {exp.end_date ?? "ongoing"}</span>
              )}
              {exp.days_running !== null && <span>{exp.days_running}d</span>}
              {exp.segment    && <span className="text-gray-500">{exp.segment}</span>}
              {exp.focus_area && <span className="text-gray-500">{exp.focus_area}</span>}
            </div>

            {exp.hypothesis && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                <span className="font-medium text-gray-700">Hypothesis: </span>{exp.hypothesis}
              </p>
            )}

            {(exp.variant_a_metric || exp.variant_b_metric) && (
              <div className="flex gap-3 mb-2">
                {exp.variant_a_metric && (
                  <div className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${exp.winner === "A" ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                    <span className="text-gray-400">A: </span>
                    <span className="font-semibold text-gray-700">{exp.variant_a_metric}</span>
                    {exp.winner === "A" && " ✓"}
                  </div>
                )}
                {exp.variant_b_metric && (
                  <div className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${exp.winner === "B" ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                    <span className="text-gray-400">B: </span>
                    <span className="font-semibold text-gray-700">{exp.variant_b_metric}</span>
                    {exp.winner === "B" && " ✓"}
                  </div>
                )}
              </div>
            )}

            {exp.result && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{exp.result}</p>
            )}

            {exp.decision && exp.decision !== "TBD" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_BADGE[exp.decision] ?? "bg-gray-100 text-gray-500"}`}>
                {exp.decision}
              </span>
            )}
            {exp.decision === "TBD" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                Decision TBD
              </span>
            )}

            {/* Unit economics (only shown when any CAC/LTV field is populated) */}
            {(exp.realized_cac != null || exp.projected_ltv != null || exp.ltv_cac != null) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Unit Economics</p>
                <div className="grid grid-cols-3 gap-2">
                  <MetricPill label="CAC" value={fmtGbp(exp.realized_cac)} note="Realized" />
                  <MetricPill label="LTV₀" value={fmtGbp(exp.realized_ltv0)} note="Realized" />
                  <MetricPill label="Proj. LTV" value={fmtGbp(exp.projected_ltv)} note="Estimated" />
                  <MetricPill
                    label="LTV:CAC"
                    value={exp.ltv_cac != null ? `${exp.ltv_cac.toFixed(2)}×` : "—"}
                    note="Target ≥3×"
                    highlight={exp.ltv_cac != null}
                  />
                  <MetricPill label="CPI" value={fmtGbp(exp.cpi_during)} />
                  <MetricPill label="Trials" value={fmtNum(exp.trial_starts)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No experiments match the selected filters.
        </div>
      )}
    </div>
  );
}
