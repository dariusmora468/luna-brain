"use client";

import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { DailyMetrics } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Metric = "revenue" | "trials" | "subscribers";
type Segment = "total" | "platform" | "country" | "audience" | "plan";

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

// ── Static config ─────────────────────────────────────────────────────────────

const METRICS: { value: Metric; label: string; color: string }[] = [
  { value: "revenue",     label: "Revenue",     color: "#F59E0B" },
  { value: "trials",      label: "Trials",      color: "#8B5CF6" },
  { value: "subscribers", label: "Subscribers", color: "#10B981" },
];

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "total",    label: "Total" },
  { value: "platform", label: "Platform" },
  { value: "country",  label: "Country" },
  { value: "audience", label: "Audience" },
  { value: "plan",     label: "Plan" },
];

const TIME_RANGES: { value: 7 | 30 | 90; label: string }[] = [
  { value: 7,  label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

/**
 * All metric × segment series definitions.
 * null = segment not available for this metric (greyed out in UI).
 */
const ALL_SERIES: Record<Metric, Record<Segment, SeriesDef[] | null>> = {
  revenue: {
    total: [
      { key: "total_revenue_gbp",    label: "Revenue",        color: "#F59E0B" },
    ],
    platform: [
      { key: "apple_revenue_gbp",    label: "Apple",          color: "#3B82F6" },
      { key: "google_revenue_gbp",   label: "Google",         color: "#10B981" },
    ],
    country: [
      { key: "gb_revenue_gbp",       label: "UK",             color: "#8B5CF6" },
      { key: "us_revenue_gbp",       label: "US",             color: "#F59E0B" },
    ],
    audience: [
      { key: "teen_revenue_gbp",     label: "Teen",           color: "#EC4899" },
      { key: "parent_revenue_gbp",   label: "Parent",         color: "#06B6D4" },
    ],
    plan: [
      { key: "rev_teen_annual_gbp",  label: "Teen Annual",    color: "#8B5CF6" },
      { key: "rev_teen_monthly_gbp", label: "Teen Monthly",   color: "#EC4899" },
      { key: "rev_teen_weekly_gbp",  label: "Teen Weekly",    color: "#F97316" },
      { key: "rev_parent_annual_gbp","label": "Parent Annual","color": "#06B6D4" },
      { key: "rev_parent_monthly_gbp","label":"Parent Monthly","color": "#3B82F6" },
    ],
  },
  trials: {
    total: [
      { key: "total_trials",           label: "Trials",       color: "#8B5CF6" },
    ],
    platform: null, // No apple/google trial breakdown in DB
    country: [
      { key: "gb_trials",              label: "UK",           color: "#8B5CF6" },
      { key: "us_trials",              label: "US",           color: "#F59E0B" },
    ],
    audience: [
      { key: "teen_trials",            label: "Teen",         color: "#EC4899" },
      { key: "parent_trials",          label: "Parent",       color: "#06B6D4" },
    ],
    plan: [
      { key: "monthly_trials",         label: "Monthly",      color: "#3B82F6" },
      { key: "annual_full_trials",     label: "Annual",       color: "#10B981" },
      { key: "annual_discount_trials", label: "Discounted",   color: "#F97316" },
    ],
  },
  subscribers: {
    total: [
      { key: "new_subscriptions",      label: "New Subs",     color: "#10B981" },
    ],
    platform: null,
    country:  null,
    audience: null,
    plan:     null,
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Full history (90 days, already audience+geo filtered). Chart slices internally. */
  data: DailyMetrics[];
  onDayClick: (date: string) => void;
  selectedDate: string | null;
  /** When set to "parents" or "teens", Audience segment tab is hidden (data is pre-filtered). */
  dashboardSegment?: "all" | "parents" | "teens";
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, isRevenue }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100" style={{ minWidth: 160 }}>
      <p className="text-[10px] font-semibold text-gray-400 mb-2">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-gray-600">{entry.name}</span>
          </span>
          <span className="font-semibold text-gray-800">
            {isRevenue ? `£${Number(entry.value).toFixed(2)}` : Math.round(Number(entry.value)).toLocaleString()}
          </span>
        </div>
      ))}
      {payload.length > 1 && isRevenue && (
        <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="font-bold text-gray-800">
            £{payload.reduce((sum: number, e: { value: number }) => sum + (Number(e.value) || 0), 0).toFixed(2)}
          </span>
        </div>
      )}
      {payload.length > 1 && !isRevenue && (
        <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="font-bold text-gray-800">
            {payload.reduce((sum: number, e: { value: number }) => sum + (Math.round(Number(e.value)) || 0), 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SegmentedRevenueChart({
  data,
  onDayClick,
  selectedDate,
  dashboardSegment = "all",
}: Props) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [segment, setSegment] = useState<Segment>("total");
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);

  const isRevenue = metric === "revenue";

  // When metric changes, auto-reset segment to "total" if it's not available
  useEffect(() => {
    const available = ALL_SERIES[metric][segment];
    const audienceHidden = segment === "audience" && dashboardSegment !== "all";
    if (available === null || audienceHidden) {
      setSegment("total");
    }
  }, [metric, dashboardSegment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Time-slice the data internally
  const slicedData = useMemo(() => data.slice(-timeRange), [data, timeRange]);

  const series = ALL_SERIES[metric][segment] ?? ALL_SERIES[metric]["total"]!;

  // Build chart data points
  const chartData = useMemo(() => {
    return slicedData.map((m) => {
      const point: Record<string, string | number> = { date: formatDateShort(m.date) };
      for (const s of series) {
        const val = (m as unknown as Record<string, number | null>)[s.key];
        point[s.key] = typeof val === "number" ? val : 0;
      }
      point["_rawDate"] = m.date;
      return point;
    });
  }, [slicedData, series]);

  // Check if there's any non-zero data for the current view
  const hasData = useMemo(() => {
    return slicedData.some((m) => {
      const rec = m as unknown as Record<string, number>;
      return series.some((s) => (rec[s.key] ?? 0) > 0);
    });
  }, [slicedData, series]);

  const metricColor = METRICS.find((m) => m.value === metric)?.color ?? "#F59E0B";

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">

        {/* Left: Metric selector */}
        <div className="flex gap-1">
          {METRICS.map((m) => {
            const isActive = metric === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMetric(m.value)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={
                  isActive
                    ? { background: m.color, color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                    : { background: "transparent", color: "#9CA3AF" }
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Right group: time range + segment */}
        <div className="flex items-center gap-2">
          {/* Time range */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {TIME_RANGES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTimeRange(t.value)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  timeRange === t.value
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Segment selector */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {SEGMENTS.filter((s) => !(s.value === "audience" && dashboardSegment !== "all")).map((s) => {
              const isDisabled = ALL_SERIES[metric][s.value] === null;
              const isActive = segment === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => !isDisabled && setSegment(s.value)}
                  disabled={isDisabled}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isDisabled
                      ? "opacity-30 cursor-not-allowed text-gray-400"
                      : isActive
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────── */}
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          No {segment} data yet for {metric}.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload?._rawDate) {
                onDayClick(e.activePayload[0].payload._rawDate);
              }
            }}
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => isRevenue ? `£${v}` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip
              content={<CustomTooltip isRevenue={isRevenue} />}
            />
            {series.length > 1 && (
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            )}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                // No stackId — each series drawn at its own true value (overlaid)
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Metric colour dot + label below chart */}
      <div className="mt-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: metricColor }} />
        <span className="text-[10px] font-medium text-gray-400">
          {METRICS.find((m) => m.value === metric)?.label}
          {segment !== "total" && ` · ${SEGMENTS.find((s) => s.value === segment)?.label}`}
          {` · last ${timeRange}d`}
        </span>
      </div>
    </div>
  );
}
