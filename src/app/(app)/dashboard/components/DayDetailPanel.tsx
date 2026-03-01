"use client";

import type { DailyMetrics } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, formatDateLong } from "@/lib/utils";

interface Activity {
  id: number;
  date: string;
  category: string;
  title: string;
  description: string | null;
  auto_detected: boolean;
  created_by: string | null;
}

interface Props {
  date: string;
  metrics: DailyMetrics | null;
  activities: Activity[];
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  campaign: "bg-pink-100 text-pink-700",
  paywall: "bg-emerald-100 text-emerald-700",
  product: "bg-blue-100 text-blue-700",
  aso: "bg-purple-100 text-purple-700",
  growth: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-600",
};

export default function DayDetailPanel({ date, metrics, activities, onClose }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-amber-200" style={{ boxShadow: "0 2px 8px rgba(245,158,11,0.08), 0 8px 24px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{formatDateLong(date)}</h3>
          <p className="text-[10px] text-gray-400 font-medium">Day snapshot</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {[
            { label: "Installs", value: formatNumber(metrics.tiktok_installs) },
            { label: "Trials", value: formatNumber(metrics.total_trials) },
            { label: "Subscribers", value: formatNumber(metrics.new_subscriptions) },
            { label: "CPI", value: formatCurrency(metrics.cost_per_install_gbp) },
            { label: "Revenue", value: formatCurrency(metrics.total_revenue_gbp) },
            { label: "ROAS", value: metrics.roas_7d?.toFixed(2) ?? "—" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.label}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Activities</p>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${CATEGORY_COLORS[a.category] || CATEGORY_COLORS.other} flex-shrink-0 mt-0.5`}>
                  {a.category}
                </span>
                <p className="text-sm text-gray-600">{a.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <p className="text-xs text-gray-400">No activities logged for this day.</p>
      )}
    </div>
  );
}
