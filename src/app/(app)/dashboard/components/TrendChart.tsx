"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyMetrics } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

interface Activity {
  id: number;
  date: string;
  category: string;
  title: string;
  description: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  campaign: "#3B82F6",
  paywall: "#8B5CF6",
  product: "#10B981",
  aso: "#F59E0B",
  growth: "#F97316",
  other: "#6B7280",
};

const CATEGORY_ICONS: Record<string, string> = {
  campaign: "📢",
  paywall: "💳",
  product: "🔧",
  aso: "📱",
  growth: "📈",
  other: "📌",
};

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
  activities?: Activity[];
}

/* Custom dot renderer: shows diamond on days with activities, nothing otherwise */
function ActivityDot(activityMap: Map<string, Activity[]>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function Dot(props: any) {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined) return null;
    
    const date = payload?.date;
    const hasActivity = date && activityMap.has(date);
    
    if (!hasActivity) return null;

    const count = activityMap.get(date)?.length || 0;
    return (
      <g key={`activity-${index}`}>
        <polygon
          points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}`}
          fill="#F59E0B"
          stroke="#fff"
          strokeWidth={2}
        />
        {count > 1 && (
          <>
            <circle cx={cx + 7} cy={cy - 7} r={6} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
            <text x={cx + 7} y={cy - 6.5} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={8} fontWeight="bold">
              {count}
            </text>
          </>
        )}
      </g>
    );
  };
}

export default function TrendChart({
  title, data, dataKey, secondaryDataKey, secondaryLabel,
  color, secondaryColor, onDayClick, selectedDate, activities = [],
}: Props) {
  const activityMap = new Map<string, Activity[]>();
  for (const a of activities) {
    const existing = activityMap.get(a.date) || [];
    existing.push(a);
    activityMap.set(a.date, existing);
  }

  const chartData = data.map((d) => ({
    date: d.date,
    dateLabel: formatDateShort(d.date),
    primary: Number(d[dataKey]) || 0,
    secondary: secondaryDataKey ? Number(d[secondaryDataKey]) || 0 : undefined,
  }));

  const hasActivityDays = activities.length > 0;

  const gid = `grad-${String(dataKey).replace(/[^a-z0-9]/gi, "")}`;
  const gid2 = `grad2-${String(dataKey).replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-3 text-[10px] font-medium">
          {secondaryDataKey && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-gray-400">{title}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <span className="text-gray-400">{secondaryLabel}</span>
              </span>
            </>
          )}
          {hasActivityDays && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rotate-45 bg-amber-400 border border-amber-500" style={{ display: "inline-block" }} />
              <span className="text-gray-400">Events</span>
            </span>
          )}
        </div>
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
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload;
                if (!point) return null;
                const dateActivities = activityMap.get(point.date) || [];
                return (
                  <ActivityTooltip
                    date={point.date}
                    primary={point.primary}
                    secondary={point.secondary}
                    primaryLabel={title}
                    secondaryLabel={secondaryLabel}
                    color={color}
                    secondaryColor={secondaryColor}
                    activities={dateActivities}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="primary"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gid})`}
              dot={ActivityDot(activityMap) as unknown as boolean}
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
      <p className="text-[10px] text-gray-400 mt-2 text-center font-medium">
        Click chart to view day details
      </p>
    </div>
  );
}

function ActivityTooltip({
  date, primary, secondary, primaryLabel, secondaryLabel,
  color, secondaryColor, activities,
}: {
  date: string;
  primary: number;
  secondary?: number;
  primaryLabel: string;
  secondaryLabel?: string;
  color: string;
  secondaryColor?: string;
  activities: Activity[];
}) {
  const d = new Date(date + "T12:00:00");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden text-left"
      style={{
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        minWidth: activities.length ? 240 : 160,
        maxWidth: 300,
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100" style={{ background: "#FAFAF8" }}>
        <p className="text-[10px] font-semibold text-gray-500">{dateStr}</p>
      </div>
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-gray-500">{primaryLabel}</span>
          </div>
          <span className="text-[12px] font-bold text-gray-800">{fmtVal(primary)}</span>
        </div>
        {secondary !== undefined && secondaryLabel && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: secondaryColor || "#6366f1" }} />
              <span className="text-[11px] text-gray-500">{secondaryLabel}</span>
            </div>
            <span className="text-[12px] font-bold text-gray-800">{fmtVal(secondary)}</span>
          </div>
        )}
      </div>
      {activities.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="px-3 py-1.5" style={{ background: "rgba(245,158,11,0.04)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
              {activities.length} Event{activities.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="px-3 py-1.5 space-y-1.5">
            {activities.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs mt-0.5 flex-shrink-0">{CATEGORY_ICONS[a.category] || "📌"}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-700 leading-tight truncate">{a.title}</p>
                  {a.description && (
                    <p className="text-[10px] text-gray-400 leading-tight truncate">{a.description}</p>
                  )}
                  <span
                    className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: (CATEGORY_COLORS[a.category] || "#6B7280") + "15",
                      color: CATEGORY_COLORS[a.category] || "#6B7280",
                    }}
                  >
                    {a.category}
                  </span>
                </div>
              </div>
            ))}
            {activities.length > 3 && (
              <p className="text-[10px] text-gray-400 font-medium">+{activities.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtVal(val: number): string {
  if (val >= 1000) return val.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  if (val >= 100) return val.toFixed(0);
  if (val > 0) return val.toFixed(2);
  return "0";
}
