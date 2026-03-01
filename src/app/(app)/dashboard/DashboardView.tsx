"use client";

import { useState, useMemo } from "react";
import type { DailyMetrics } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent, formatDecimal, percentChange, getTrend, formatDateShort, formatDateLong } from "@/lib/utils";
import HeroMetric from "./components/HeroMetric";
import TrendChart from "./components/TrendChart";
import DayDetailPanel from "./components/DayDetailPanel";
import InsightsPanel from "./components/InsightsPanel";
import ABTestCard from "./components/ABTestCard";
import PlacementTable from "./components/PlacementTable";

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
  today: DailyMetrics | null;
  yesterday: DailyMetrics | null;
  history: DailyMetrics[];
  activities: Activity[];
}

function enrichMetrics(m: DailyMetrics): DailyMetrics {
  return {
    ...m,
    cost_per_install_gbp: m.cost_per_install_gbp ?? (m.tiktok_installs > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.tiktok_installs) * 100) / 100 : null),
    cost_per_trial_gbp: m.cost_per_trial_gbp ?? (m.total_trials > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.total_trials) * 100) / 100 : null),
    cost_per_subscriber_gbp: m.cost_per_subscriber_gbp ?? (m.new_subscriptions > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.new_subscriptions) * 100) / 100 : null),
  };
}

export default function DashboardView({ today: rawToday, yesterday: rawYesterday, history: rawHistory, activities }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");

  const history = useMemo(() => rawHistory.map(enrichMetrics), [rawHistory]);
  const today = rawToday ? enrichMetrics(rawToday) : null;
  const yesterday = rawYesterday ? enrichMetrics(rawYesterday) : null;

  const filteredHistory = timeRange === "all" ? history : timeRange === "30d" ? history.slice(-30) : history.slice(-7);
  const selectedMetrics = selectedDate ? history.find((m) => m.date === selectedDate) ?? null : null;
  const selectedActivities = selectedDate ? activities.filter((a) => a.date === selectedDate) : [];

  function handleChartClick(date: string) {
    setSelectedDate(selectedDate === date ? null : date);
  }

  if (!today) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
            <span className="text-2xl font-extrabold text-white">lb</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Data Yet</h1>
          <p className="text-gray-400 mb-6">Upload your first data files to get started.</p>
          <a href="/upload" className="inline-flex px-6 py-3 rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>Upload Data</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: "rgba(248,245,240,0.85)" }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Growth Dashboard</h1>
            <p className="text-xs text-gray-400 font-medium">Last updated: {today.date}</p>
          </div>
          <a href="/upload" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:shadow-lg transition-all" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>Refresh Data</a>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HeroMetric label="Cost Per Install" value={today.cost_per_install_gbp} previousValue={yesterday?.cost_per_install_gbp ?? null} format="currency" invertColors tooltip="TikTok ad spend / total installs" sparklineData={history.slice(-7).map((m) => m.cost_per_install_gbp ?? 0)} gradient="linear-gradient(135deg, #F59E0B, #F97316)" />
          <HeroMetric label="Cost Per Trial" value={today.cost_per_trial_gbp} previousValue={yesterday?.cost_per_trial_gbp ?? null} format="currency" invertColors tooltip="TikTok ad spend / trial starts" sparklineData={history.slice(-7).map((m) => m.cost_per_trial_gbp ?? 0)} gradient="linear-gradient(135deg, #10B981, #059669)" />
          <HeroMetric label="Cost Per Subscriber" value={today.cost_per_subscriber_gbp} previousValue={yesterday?.cost_per_subscriber_gbp ?? null} format="currency" invertColors tooltip="TikTok spend / new subscribers (7-day lag)" sparklineData={history.slice(-7).map((m) => m.cost_per_subscriber_gbp ?? 0)} gradient="linear-gradient(135deg, #8B5CF6, #7C3AED)" />
        </div>

        {/* TIME RANGE */}
        <div className="flex gap-1 bg-white rounded-xl p-1 w-fit" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {(["7d", "30d", "all"] as const).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${timeRange === range ? "text-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              style={timeRange === range ? { background: "linear-gradient(135deg, #F59E0B, #F97316)" } : undefined}>
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>

        {/* COST TREND CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TrendChart title="Cost Per Install" data={filteredHistory} dataKey="cost_per_install_gbp" color="#F59E0B" onDayClick={handleChartClick} selectedDate={selectedDate} />
          <TrendChart title="Cost Per Trial" data={filteredHistory} dataKey="cost_per_trial_gbp" color="#10B981" onDayClick={handleChartClick} selectedDate={selectedDate} />
          <TrendChart title="Cost Per Subscriber" data={filteredHistory} dataKey="cost_per_subscriber_gbp" color="#8B5CF6" onDayClick={handleChartClick} selectedDate={selectedDate} />
        </div>

        {/* VOLUME CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TrendChart title="New Installs" data={filteredHistory} dataKey="tiktok_installs" color="#3B82F6" onDayClick={handleChartClick} selectedDate={selectedDate} />
          <TrendChart title="New Trials" data={filteredHistory} dataKey="total_trials" secondaryDataKey="non_onboarding_trials" secondaryLabel="Non-Onboarding" color="#10B981" secondaryColor="#8B5CF6" onDayClick={handleChartClick} selectedDate={selectedDate} />
          <TrendChart title="Subscribers" data={filteredHistory} dataKey="new_subscriptions" secondaryDataKey="churn" secondaryLabel="Churn" color="#10B981" secondaryColor="#EF4444" onDayClick={handleChartClick} selectedDate={selectedDate} />
        </div>

        {/* REVENUE & ROAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendChart title="Revenue" data={filteredHistory} dataKey="total_revenue_gbp" color="#F59E0B" onDayClick={handleChartClick} selectedDate={selectedDate} />
          <TrendChart title="ROAS (7-day)" data={filteredHistory} dataKey="roas_7d" color="#8B5CF6" onDayClick={handleChartClick} selectedDate={selectedDate} />
        </div>

        {/* DAY DETAIL */}
        {selectedDate && <DayDetailPanel date={selectedDate} metrics={selectedMetrics} activities={selectedActivities} onClose={() => setSelectedDate(null)} />}

        {/* AI INSIGHTS */}
        <InsightsPanel today={today} yesterday={yesterday} history={history} />

        {/* DETAILED BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Plan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-600 text-sm">Annual Discount (£19.99)</span><span className="text-gray-800 font-semibold text-sm">{today.annual_discount_trials} trials &middot; {formatCurrency(today.annual_discount_trials * 19.99)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600 text-sm">Annual Full (£39.99)</span><span className="text-gray-800 font-semibold text-sm">{today.annual_full_trials} trials &middot; {formatCurrency(today.annual_full_trials * 39.99)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600 text-sm">Monthly (£4.99)</span><span className="text-gray-800 font-semibold text-sm">{today.monthly_trials} trials &middot; {formatCurrency(today.monthly_trials * 4.99)}</span></div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center"><span className="text-gray-700 font-semibold text-sm">Trial Value</span><span className="text-amber-600 font-bold">{formatCurrency(today.potential_trial_value_gbp)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-700 font-semibold text-sm">Store Revenue</span><span className="text-gray-800 font-bold">{formatCurrency(today.total_revenue_gbp)}</span></div>
            </div>
          </div>
          <ABTestCard today={today} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Market Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5"><span className="text-gray-600 text-sm font-medium">US</span><span className="text-gray-800 font-semibold text-sm">{today.us_trials} trials</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${today.total_trials > 0 ? (today.us_trials / today.total_trials) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5"><span className="text-gray-600 text-sm font-medium">GB</span><span className="text-gray-800 font-semibold text-sm">{today.gb_trials} trials</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${today.total_trials > 0 ? (today.gb_trials / today.total_trials) * 100 : 0}%` }} /></div>
              </div>
            </div>
          </div>
          <PlacementTable placements={today.placement_breakdown ?? []} />
        </div>

        {/* TikTok Detail */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">TikTok Ads Detail</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Spend", value: formatCurrency(today.tiktok_spend_gbp) },
              { label: "Impressions", value: formatNumber(today.tiktok_impressions) },
              { label: "Clicks", value: formatNumber(today.tiktok_clicks) },
              { label: "CPM", value: formatCurrency(today.tiktok_cpm) },
              { label: "Install to Trial CR", value: formatPercent(today.install_to_trial_cr) },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.label}</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality */}
        {today.data_quality_checks && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Quality</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(today.data_quality_checks).map(([key, passed]) => (
                <span key={key} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${passed ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-500 border border-red-200"}`}>
                  {passed ? "✓" : "✗"} {key.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
