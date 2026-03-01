"use client";

import { useState } from "react";
import { formatValue, percentChange, getTrend } from "@/lib/utils";

interface Props {
  label: string;
  value: number | null;
  previousValue: number | null;
  format: "currency" | "number" | "decimal" | "percent";
  invertColors?: boolean;
  tooltip?: string;
  sparklineData?: number[];
  gradient?: string;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 36;
  const w = 88;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const areaPoints = [...points, `${pad + (w - pad * 2)},${h}`, `${pad},${h}`].join(" ");
  const cid = color.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg width={w} height={h} className="opacity-70">
      <defs>
        <linearGradient id={`spark-${cid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#spark-${cid})`} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points.join(" ")} />
    </svg>
  );
}

export default function HeroMetric({ label, value, previousValue, format, invertColors = false, tooltip, sparklineData, gradient }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const change = value !== null && previousValue !== null ? percentChange(value, previousValue) : null;
  const trend = getTrend(change, invertColors);

  const isPositive = (trend.direction === "up" && !invertColors) || (trend.direction === "down" && invertColors);
  const trendBg = trend.direction === "flat" ? "bg-gray-100 text-gray-500"
    : isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500";

  const hasGradient = !!gradient;

  return (
    <div
      className="relative rounded-2xl p-6 transition-all duration-200 overflow-hidden"
      style={{
        background: gradient || "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {tooltip && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 rounded-xl text-xs text-white whitespace-nowrap z-50 shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${hasGradient ? "text-white/70" : "text-gray-400"}`}>{label}</p>
          <p className={`text-3xl font-extrabold ${hasGradient ? "text-white" : "text-gray-900"}`}>
            {formatValue(value, format)}
          </p>
          {change !== null && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${hasGradient ? "bg-white/20 text-white" : trendBg}`}>
                {trend.arrow} {Math.abs(change).toFixed(1)}%
              </span>
              <span className={`text-[10px] ${hasGradient ? "text-white/60" : "text-gray-400"}`}>vs yesterday</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <MiniSparkline
            data={sparklineData}
            color={hasGradient ? "rgba(255,255,255,0.7)" : (isPositive ? "#10B981" : "#EF4444")}
          />
        )}
      </div>
    </div>
  );
}
