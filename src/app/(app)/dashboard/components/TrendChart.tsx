"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyMetrics } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

interface Props {
  title: string;
  data: DailyMetrics[];
  dataKey: keyof DailyMetrics;
  secondaryDataKey?: keyof DailyMetrics;
  secondaryLabel?: string;
  color: string;
  secondaryColor?: string;
  onDayClick: (date: string) => void;
  selectedDate: string | null;
}

export default function TrendChart({
  title, data, dataKey, secondaryDataKey, secondaryLabel,
  color, secondaryColor, onDayClick, selectedDate,
}: Props) {
  const chartData = data.map((d) => ({
    date: d.date,
    dateLabel: formatDateShort(d.date),
    primary: Number(d[dataKey]) || 0,
    secondary: secondaryDataKey ? Number(d[secondaryDataKey]) || 0 : undefined,
  }));

  const gid = `grad-${String(dataKey).replace(/[^a-z0-9]/gi, "")}`;
  const gid2 = `grad2-${String(dataKey).replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {secondaryDataKey && (
          <div className="flex items-center gap-3 text-[10px] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-400">{title}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="text-gray-400">{secondaryLabel}</span>
            </span>
          </div>
        )}
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload?.date) {
                onDayClick(e.activePayload[0].payload.date);
              }
            }}
          >
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              {secondaryDataKey && (
                <linearGradient id={gid2} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondaryColor || "#6366f1"} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={secondaryColor || "#6366f1"} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F0EB" vertical={false} />
            <XAxis dataKey="dateLabel" stroke="#C4BFB6" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#C4BFB6" fontSize={10} tickLine={false} axisLine={false} width={35} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                color: "#1A1A2E",
                fontSize: "12px",
                fontWeight: 500,
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
            />
            <Area
              type="monotone"
              dataKey="primary"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gid})`}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
              cursor="pointer"
            />
            {secondaryDataKey && (
              <Area
                type="monotone"
                dataKey="secondary"
                stroke={secondaryColor || "#6366f1"}
                strokeWidth={2}
                fill={`url(#${gid2})`}
                dot={false}
                activeDot={{ r: 4, fill: secondaryColor || "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                cursor="pointer"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">Click chart to view day details</p>
    </div>
  );
}
