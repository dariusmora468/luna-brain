"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { DailyMetrics } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

type Segment = "total" | "platform" | "country" | "audience" | "plan";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "platform", label: "Platform" },
  { value: "country", label: "Country" },
  { value: "audience", label: "Audience" },
  { value: "plan", label: "Plan" },
];

const SEGMENT_SERIES: Record<Segment, { key: string; label: string; color: string }[]> = {
  total: [
    { key: "total_revenue_gbp", label: "Revenue", color: "#F59E0B" },
  ],
  platform: [
    { key: "apple_revenue_gbp", label: "Apple", color: "#3B82F6" },
    { key: "google_revenue_gbp", label: "Google", color: "#10B981" },
  ],
  country: [
    { key: "gb_revenue_gbp", label: "UK", color: "#8B5CF6" },
    { key: "us_revenue_gbp", label: "US", color: "#F59E0B" },
  ],
  audience: [
    { key: "teen_revenue_gbp", label: "Teen", color: "#EC4899" },
    { key: "parent_revenue_gbp", label: "Parent", color: "#06B6D4" },
  ],
  plan: [
    { key: "rev_teen_annual_gbp", label: "Teen Annual", color: "#8B5CF6" },
    { key: "rev_teen_monthly_gbp", label: "Teen Monthly", color: "#EC4899" },
    { key: "rev_teen_weekly_gbp", label: "Teen Weekly", color: "#F97316" },
    { key: "rev_parent_annual_gbp", label: "Parent Annual", color: "#06B6D4" },
    { key: "rev_parent_monthly_gbp", label: "Parent Monthly", color: "#3B82F6" },
  ],
};

interface Props {
  data: DailyMetrics[];
  onDayClick: (date: string) => void;
  selectedDate: string | null;
  /** When set to "parents" or "teens", hides the Audience sub-toggle (data is already segment-filtered) */
  dashboardSegment?: "all" | "parents" | "teens";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
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
          <span className="font-semibold text-gray-800">£{Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="font-bold text-gray-800">
            £{payload.reduce((sum: number, e: { value: number }) => sum + (Number(e.value) || 0), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SegmentedRevenueChart({ data, onDayClick, selectedDate, dashboardSegment = "all" }: Props) {
  const [segment, setSegment] = useState<Segment>("total");

  // When the dashboard segment changes, reset revenue sub-toggle to "total"
  // (avoid staying on "audience" which would be wrong in segmented view)
  const visibleSegments = dashboardSegment === "all"
    ? SEGMENTS
    : SEGMENTS.filter((s) => s.value !== "audience");

  const series = SEGMENT_SERIES[segment];

  // Check if segment has data (non-zero values)
  const hasData = useMemo(() => {
    if (segment === "total" || segment === "platform" || segment === "country") return true;
    // For audience and plan, check if any row has non-zero values
    return data.some((m) => {
      const rec = m as unknown as Record<string, number>;
      return series.some((s) => (rec[s.key] ?? 0) > 0);
    });
  }, [data, segment, series]);

  const chartData = useMemo(() => {
    return data.map((m) => {
      const point: Record<string, string | number> = { date: formatDateShort(m.date) };
      for (const s of series) {
        const val = (m as unknown as Record<string, number | null>)[s.key];
        point[s.key] = typeof val === "number" ? val : 0;
      }
      point["_rawDate"] = m.date;
      return point;
    });
  }, [data, series]);

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      {/* Header with segment tabs */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Revenue</h3>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {visibleSegments.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                segment === s.value
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart or empty state */}
      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          No {segment} data yet. Upload revenue CSVs to populate.
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
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
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
              tickFormatter={(v) => `£${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
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
                stackId={segment !== "total" ? "stack" : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
