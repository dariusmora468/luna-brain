"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { DailyActualsRow, ExperimentRow } from "@/lib/v2/parsers";

// ── Metric definitions ──────────────────────────────────────────────────────

export type MetricKey = "spend" | "installs" | "trials" | "subscribers" | "revenue" | "cpi" | "cpt" | "cps";
type Axis = "count" | "money";
type Audience = "all" | "teen" | "parent";

interface MetricDef {
  key: MetricKey;
  label: string;
  color: string;
  axis: Axis;
  note?: string; // shown in tooltip when audience filter is active but data is split-limited
}

const METRICS: MetricDef[] = [
  { key: "installs",     label: "Installs",     color: "#3B82F6", axis: "count" },
  { key: "trials",       label: "Trials",       color: "#8B5CF6", axis: "count" },
  { key: "subscribers",  label: "Subscribers",  color: "#10B981", axis: "count", note: "7-day lag (trial period)" },
  { key: "revenue",      label: "Revenue",      color: "#F97316", axis: "money", note: "7-day lag (trial period)" },
  { key: "spend",        label: "Spend",        color: "#F59E0B", axis: "money" },
  { key: "cpi",          label: "CPI",          color: "#EF4444", axis: "money", note: "Cost per install (Adjust total)" },
  { key: "cpt",          label: "CPT",          color: "#14B8A6", axis: "money", note: "Cost per trial" },
  { key: "cps",          label: "CPS",          color: "#EC4899", axis: "money", note: "Cost per subscriber (7-day lag)" },
];

const DEFAULT_METRICS: MetricKey[] = ["spend", "installs"];

// ── Locked segment badge ────────────────────────────────────────────────────

function LockedSegment({ label, source }: { label: string; source: string }) {
  return (
    <div className="relative group">
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {label}
      </button>
      <div className="absolute bottom-8 left-0 z-50 hidden group-hover:block w-52 bg-gray-900 text-white text-[10px] rounded-xl p-2.5 shadow-xl leading-relaxed">
        <p className="font-semibold mb-1">{label} segmentation</p>
        <p className="text-gray-300">Needs: {source}</p>
        <p className="text-gray-400 mt-1">Not available in current daily actuals data.</p>
      </div>
    </div>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number | null;
  color: string;
  dataKey: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const moneyKeys = new Set(METRICS.filter(m => m.axis === "money").map(m => m.key));

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-600 mb-2">{label}</p>
      {payload
        .filter(p => p.value != null)
        .map(p => {
          const isMoney = moneyKeys.has(p.dataKey as MetricKey);
          const formatted = isMoney
            ? `£${Number(p.value).toFixed(p.value! < 10 ? 2 : 0)}`
            : Number(p.value).toLocaleString("en-GB", { maximumFractionDigits: 0 });
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span style={{ color: p.color }} className="font-medium">{p.name}</span>
              <span className="text-gray-800 font-semibold tabular-nums">{formatted}</span>
            </div>
          );
        })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  rows: DailyActualsRow[];
  experiments: ExperimentRow[];
  showExpOverlay?: boolean;
}

function divOrNull(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export function UnifiedChart({ rows, experiments, showExpOverlay }: Props) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(new Set(DEFAULT_METRICS));
  const [audience, setAudience] = useState<Audience>("all");

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Build per-row chart data based on audience selection
  const chartData = useMemo(() => {
    return rows.map(r => {
      // Spend — teen/parent splits available
      const spend =
        audience === "teen"   ? r.teen_spend :
        audience === "parent" ? r.parent_spend :
        r.tiktok_spend;

      // Installs — no daily teen/parent split; always total
      const installs = r.adjust_total_installs;

      // Trials — teen/parent splits available
      const trials =
        audience === "teen"   ? r.trials_teen :
        audience === "parent" ? r.trials_parent :
        ((r.trials_teen ?? 0) + (r.trials_parent ?? 0)) || null;

      // Subs / Revenue — no daily split; always total
      const subscribers = r.new_paid_subs;
      const revenue     = r.revenue;

      // Computed efficiency metrics
      const cpi = divOrNull(spend, installs);
      const cpt = divOrNull(spend, trials);
      const cps = divOrNull(spend, subscribers);

      return {
        date: r.date.slice(5), // "MM-DD"
        spend,
        installs,
        trials,
        subscribers,
        revenue,
        cpi,
        cpt,
        cps,
      };
    });
  }, [rows, audience]);

  // Reference lines for experiments
  const expLines = useMemo(() => {
    if (!showExpOverlay) return [];
    return experiments
      .filter(e => e.start_date || e.end_date)
      .flatMap(e => [
        e.start_date ? { date: e.start_date.slice(5), name: e.name, type: "start" as const } : null,
        e.end_date   ? { date: e.end_date.slice(5),   name: e.name, type: "end"   as const } : null,
      ])
      .filter(Boolean) as { date: string; name: string; type: "start" | "end" }[];
  }, [experiments, showExpOverlay]);

  const activeMetrics = METRICS.filter(m => selectedMetrics.has(m.key));
  const hasMoneyMetric = activeMetrics.some(m => m.axis === "money");
  const hasCountMetric = activeMetrics.some(m => m.axis === "count");

  // Which metrics are split-limited (no teen/parent granularity in daily data)
  const splitLimitedKeys = new Set<MetricKey>(["installs", "subscribers", "revenue", "cpi", "cps"]);
  const hasLimitedMetric = audience !== "all" && activeMetrics.some(m => splitLimitedKeys.has(m.key));

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-5">
        {/* Metric picker */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map(m => {
            const active = selectedMetrics.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  active
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300"
                }`}
                style={active ? { backgroundColor: m.color, borderColor: m.color } : undefined}
              >
                {m.label}
                {m.note && (
                  <span className={`text-[9px] ${active ? "opacity-70" : "opacity-0"}`}>†</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Segmentation row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Audience — active */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Audience</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(["all", "teen", "parent"] as Audience[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
                    audience === a ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {a === "all" ? "All" : a === "teen" ? "Teen" : "Parent"}
                </button>
              ))}
            </div>
          </div>

          {/* Locked segments */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Platform</span>
            <LockedSegment label="iOS / Android" source="Mixpanel / Adjust event data" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Country</span>
            <LockedSegment label="US / UK / ROW" source="Spend: UK Teen, Spend: US Teen columns per day" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Paywall</span>
            <LockedSegment label="Paywalls" source="Purchasely event-level export" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-16">Plan</span>
            <LockedSegment label="Plans" source="Purchasely event-level export" />
          </div>
        </div>
      </div>

      {/* Split-limited warning */}
      {hasLimitedMetric && (
        <div className="mb-3 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          † <strong>Installs, Subscribers, Revenue, CPI, CPS</strong> don&apos;t have a teen/parent split in the daily data — showing totals.
          Only <strong>Spend</strong> and <strong>Trials</strong> are fully segmented.
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            interval="preserveStartEnd"
          />
          {hasCountMetric && (
            <YAxis
              yAxisId="count"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              width={45}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
          )}
          {hasMoneyMetric && (
            <YAxis
              yAxisId="money"
              orientation={hasCountMetric ? "right" : "left"}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              width={50}
              tickFormatter={(v: number) =>
                v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : v >= 1 ? `£${v.toFixed(0)}` : `£${v.toFixed(2)}`
              }
            />
          )}
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* Experiment reference lines */}
          {expLines.map(line => (
            <ReferenceLine
              key={`${line.name}-${line.type}`}
              x={line.date}
              yAxisId={hasCountMetric ? "count" : "money"}
              stroke={line.type === "start" ? "#F59E0B" : "#9CA3AF"}
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: line.name.slice(0, 12), position: "top", fontSize: 8, fill: "#9CA3AF" }}
            />
          ))}

          {/* Metric lines */}
          {activeMetrics.map(m => (
            <Line
              key={m.key}
              yAxisId={m.axis}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Notes for flagged metrics */}
      {activeMetrics.some(m => m.note) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {activeMetrics.filter(m => m.note).map(m => (
            <p key={m.key} className="text-[10px] text-gray-400">
              <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
              {" — "}{m.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
