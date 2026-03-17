"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { DailyActualsRow } from "@/lib/v2/parsers";

const LS_KEY = "luna-v3-metrics-edits";

// ── Constants ─────────────────────────────────────────────────────────────────

const LAG_DAYS = 7;

const SVG_W = 1000;
const SVG_H = 280;
const PAD_T = 16;
const PAD_R = 24;
const PAD_B = 36;
const PAD_L = 16;
const CW = SVG_W - PAD_L - PAD_R;
const CH = SVG_H - PAD_T - PAD_B;

// ── Metric config ─────────────────────────────────────────────────────────────

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  format: "gbp" | "number";
  hasLag: boolean;
  getValue: (row: DailyActualsRow) => number | null;
}

// Groups for the left sidebar
interface MetricGroup { label: string; metrics: MetricConfig[] }

const METRICS: MetricConfig[] = [
  // ── Spend ──
  { key: "tiktok_spend",   label: "Ad Spend (TikTok)",    color: "#F97316", format: "gbp",    hasLag: false, getValue: (r) => r.tiktok_spend },
  { key: "teen_spend",     label: "TikTok Teen Spend",    color: "#FB923C", format: "gbp",    hasLag: false, getValue: (r) => r.teen_spend },
  { key: "parent_spend",   label: "TikTok Parent Spend",  color: "#FDBA74", format: "gbp",    hasLag: false, getValue: (r) => r.parent_spend },
  { key: "google_spend",   label: "Google Spend",         color: "#3B82F6", format: "gbp",    hasLag: false, getValue: (r) => r.google_spend },
  { key: "meta_spend",     label: "Meta Spend",           color: "#6366F1", format: "gbp",    hasLag: false, getValue: (r) => r.meta_spend },
  // ── Acquisition ──
  { key: "installs",       label: "Installs",             color: "#10B981", format: "number", hasLag: false, getValue: (r) => r.adjust_total_installs },
  { key: "cpi",            label: "Cost Per Install",     color: "#059669", format: "gbp",    hasLag: false, getValue: (r) => r.tiktok_spend !== null && r.adjust_total_installs ? r.tiktok_spend / r.adjust_total_installs : null },
  // ── Revenue ──
  { key: "revenue",        label: "Revenue",              color: "#8B5CF6", format: "gbp",    hasLag: true,  getValue: (r) => r.revenue },
  { key: "new_paid_subs",  label: "New Subscribers",      color: "#EC4899", format: "number", hasLag: true,  getValue: (r) => r.new_paid_subs },
  // ── Performance ──
  { key: "cac",            label: "CAC",                  color: "#DC2626", format: "gbp",    hasLag: false, getValue: (r) => r.tiktok_spend !== null && r.new_paid_subs ? r.tiktok_spend / r.new_paid_subs : null },
];

const METRIC_GROUPS: MetricGroup[] = [
  { label: "Spend", metrics: METRICS.slice(0, 5) },
  { label: "Acquisition", metrics: METRICS.slice(5, 7) },
  { label: "Revenue", metrics: METRICS.slice(7, 9) },
  { label: "Performance", metrics: METRICS.slice(9) },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(v: number | null, format: "gbp" | "number"): string {
  if (v === null) return "—";
  if (format === "gbp") {
    return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return v.toLocaleString("en-GB");
}

function fmtDateShort(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function buildPath(pts: { x: number; y: number; isNull: boolean }[]): string {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].isNull) continue;
    const prevNull = i === 0 || pts[i - 1].isNull;
    d += prevNull
      ? `M ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
      : ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return d;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  dailyRows: DailyActualsRow[];
}

// ── Component ─────────────────────────────────────────────────────────────────

function applyEdits(row: DailyActualsRow, edits: Record<string, string>): DailyActualsRow {
  const result = { ...row };
  const editableKeys = ["tiktok_spend","teen_spend","parent_spend","google_spend","meta_spend","adjust_total_installs","new_paid_subs","revenue","trials_teen","trials_parent"];
  for (const key of editableKeys) {
    const editKey = `${row.date}:${key}`;
    if (editKey in edits) {
      const raw = edits[editKey].trim();
      const num = parseFloat(raw.replace(/[£,]/g, ""));
      (result as Record<string, unknown>)[key] = raw === "" ? null : isNaN(num) ? null : num;
    }
  }
  return result;
}

export default function DashboardView({ dailyRows }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["tiktok_spend"]));
  const [lagEnabled, setLagEnabled] = useState<Set<string>>(() => new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync edits from localStorage (kept in sync with Metrics sheet)
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) setEdits(JSON.parse(saved));
      } catch { /* ignore */ }
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  // Apply edits then sort ascending by date
  const sortedRows = useMemo(
    () => [...dailyRows].map((r) => applyEdits(r, edits)).sort((a, b) => a.date.localeCompare(b.date)),
    [dailyRows, edits]
  );
  const n = sortedRows.length;

  // Compute a series of SVG points for each metric
  const seriesData = useMemo(() => {
    return METRICS.map((metric) => {
      const raw = sortedRows.map((r) => metric.getValue(r));
      const isLagged = lagEnabled.has(metric.key) && metric.hasLag;

      // Lag: shift series 7 days back (show tomorrow+7's value at today's x position)
      const values: (number | null)[] = isLagged
        ? raw.map((_, i) => (i + LAG_DAYS < raw.length ? raw[i + LAG_DAYS] : null))
        : raw;

      const nonNull = values.filter((v): v is number => v !== null);
      const min = nonNull.length > 0 ? Math.min(...nonNull) : 0;
      const max = nonNull.length > 0 ? Math.max(...nonNull) : 1;
      const range = max - min || 1;

      const pts = values.map((v, i) => ({
        x: n > 1 ? PAD_L + (i / (n - 1)) * CW : PAD_L + CW / 2,
        y: v !== null ? PAD_T + (1 - (v - min) / range) * CH : 0,
        isNull: v === null,
      }));

      return { metric, values, pts, min, max };
    });
  }, [sortedRows, lagEnabled, n]);

  // Hover handler — map mouse X → nearest data index
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svgEl = svgRef.current;
      if (!svgEl || n === 0) return;
      const rect = svgEl.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const idx = Math.max(0, Math.min(n - 1, Math.round(((svgX - PAD_L) / CW) * (n - 1))));
      setHoverIdx(idx);
    },
    [n]
  );

  // Which laggable metrics are currently selected
  const selectedLaggable = METRICS.filter((m) => m.hasLag && selected.has(m.key));

  // Hover crosshair X position (as % for tooltip placement)
  const hoverXSvg =
    hoverIdx !== null && n > 1 ? PAD_L + (hoverIdx / (n - 1)) * CW : null;
  const hoverXPct =
    hoverXSvg !== null ? (hoverXSvg / SVG_W) * 100 : null;

  // X-axis labels: every N days depending on density
  const xLabelStep = n <= 14 ? 1 : n <= 60 ? 7 : n <= 120 ? 14 : 30;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">V3</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select metrics to overlay. Toggle 7-day lag to align Revenue and Subscribers with the ad spend that drove them.
        </p>
      </div>

      <div className="flex gap-5">
        {/* ── Left Sidebar ── */}
        <aside className="w-52 flex-shrink-0 space-y-3">
          {/* Metric toggles grouped */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {METRIC_GROUPS.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "border-t border-gray-50" : ""}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-300">{group.label}</p>
                </div>
                {group.metrics.map((m) => {
                  const isOn = selected.has(m.key);
                  const sd = seriesData.find((s) => s.metric.key === m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.key)) next.delete(m.key);
                          else next.add(m.key);
                          return next;
                        })
                      }
                      className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition-all ${
                        isOn ? "bg-gray-50/80" : "hover:bg-gray-50/40"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                        style={{ background: m.color, opacity: isOn ? 1 : 0.2 }}
                      />
                      <span className={`text-xs font-medium flex-1 transition-colors ${isOn ? "text-gray-800" : "text-gray-400"}`}>
                        {m.label}
                      </span>
                      {isOn && sd && (
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {fmtVal(sd.max, m.format)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="pb-2" />
          </div>

          {/* 7-day lag panel — only shown when a laggable metric is selected */}
          {selectedLaggable.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                7-Day Lag
              </p>
              <div className="space-y-2">
                {selectedLaggable.map((m) => {
                  const isLagged = lagEnabled.has(m.key);
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                        <span className="text-[11px] text-gray-600 truncate">{m.label}</span>
                      </div>
                      <button
                        onClick={() =>
                          setLagEnabled((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.key)) next.delete(m.key);
                            else next.add(m.key);
                            return next;
                          })
                        }
                        className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${
                          isLagged ? "bg-violet-500" : "bg-gray-200"
                        }`}
                        title={`Shift ${m.label} 7 days earlier`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                            isLagged ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
                Shifts metric −7 days to align trial conversions with the ad spend that drove them. Hard-coded 7-day trial.
              </p>
            </div>
          )}
        </aside>

        {/* ── Chart ── */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div className="relative">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              >
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = PAD_T + t * CH;
                  return (
                    <line
                      key={t}
                      x1={PAD_L}
                      y1={y}
                      x2={PAD_L + CW}
                      y2={y}
                      stroke="#F3F4F6"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Series lines */}
                {seriesData.map(({ metric, pts }) => {
                  if (!selected.has(metric.key)) return null;
                  const d = buildPath(pts);
                  if (!d) return null;
                  return (
                    <path
                      key={metric.key}
                      d={d}
                      fill="none"
                      stroke={metric.color}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Hover vertical line */}
                {hoverXSvg !== null && (
                  <line
                    x1={hoverXSvg}
                    y1={PAD_T}
                    x2={hoverXSvg}
                    y2={PAD_T + CH}
                    stroke="#9CA3AF"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Hover dots */}
                {hoverIdx !== null &&
                  seriesData.map(({ metric, pts }) => {
                    if (!selected.has(metric.key)) return null;
                    const p = pts[hoverIdx];
                    if (!p || p.isNull) return null;
                    return (
                      <circle
                        key={metric.key}
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="white"
                        stroke={metric.color}
                        strokeWidth="2"
                      />
                    );
                  })}

                {/* X-axis date labels */}
                {sortedRows.map((row, i) => {
                  if (i % xLabelStep !== 0 && i !== n - 1) return null;
                  const x = n > 1 ? PAD_L + (i / (n - 1)) * CW : PAD_L + CW / 2;
                  return (
                    <text
                      key={row.date}
                      x={x}
                      y={SVG_H - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#9CA3AF"
                    >
                      {fmtDateShort(row.date)}
                    </text>
                  );
                })}

                {/* Invisible overlay rect for hover detection */}
                <rect
                  x={PAD_L}
                  y={PAD_T}
                  width={CW}
                  height={CH}
                  fill="transparent"
                  onMouseMove={handleMouseMove}
                  style={{ cursor: "crosshair" }}
                />
              </svg>

              {/* Tooltip */}
              {hoverIdx !== null && hoverXPct !== null && (
                <div
                  className="absolute top-3 pointer-events-none z-10"
                  style={{
                    left: `${Math.min(hoverXPct, 62)}%`,
                    transform: "translateX(14px)",
                  }}
                >
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 min-w-[150px]">
                    <p className="text-[10px] font-semibold text-gray-700 mb-1.5">
                      {fmtDateShort(sortedRows[hoverIdx]?.date ?? "")}
                      <span className="ml-1.5 text-gray-400 font-normal">
                        {sortedRows[hoverIdx]?.date}
                      </span>
                    </p>
                    {seriesData.map(({ metric, values }) => {
                      if (!selected.has(metric.key)) return null;
                      const v = values[hoverIdx];
                      const isLagged = lagEnabled.has(metric.key) && metric.hasLag;
                      return (
                        <div key={metric.key} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: metric.color }}
                          />
                          <span className="text-[11px] text-gray-600 flex-1">
                            {metric.label}
                            {isLagged && <span className="text-gray-400"> −7d</span>}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-900 tabular-nums">
                            {fmtVal(v, metric.format)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Legend strip */}
            <div className="px-4 py-2.5 border-t border-gray-50 flex flex-wrap items-center gap-4">
              {seriesData.map(({ metric }) => {
                if (!selected.has(metric.key)) return null;
                const isLagged = lagEnabled.has(metric.key) && metric.hasLag;
                const sd = seriesData.find((s) => s.metric.key === metric.key);
                return (
                  <div key={metric.key} className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-0.5 rounded-full"
                      style={{ background: metric.color }}
                    />
                    <span className="text-[11px] text-gray-500">
                      {metric.label}
                      {isLagged && " (−7d)"}
                    </span>
                    {sd && (
                      <span className="text-[10px] text-gray-400 tabular-nums">
                        max {fmtVal(sd.max, metric.format)}
                      </span>
                    )}
                  </div>
                );
              })}
              {selected.size === 0 && (
                <span className="text-[11px] text-gray-400 italic">
                  Select a metric from the left panel
                </span>
              )}
              <span className="ml-auto text-[10px] text-gray-400">
                Each metric normalized to its own scale · hover for values
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
