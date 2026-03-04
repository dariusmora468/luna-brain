"use client";

import { useState, useMemo } from "react";
import type { DailyMetrics } from "@/lib/types";
import HeroMetric from "./components/HeroMetric";
import TrendChart from "./components/TrendChart";
import DayDetailPanel from "./components/DayDetailPanel";
import InsightsPanel from "./components/InsightsPanel";
import SegmentedRevenueChart from "./components/SegmentedRevenueChart";

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
  debugInfo?: string;
}

// Fallback computation for historical rows imported from Google Sheets,
// which may have null CPI/CPT/CPS when there was no spend or no trials.
// Daily uploads via /api/metrics/upload compute these server-side in computeMetrics().
// This ensures the dashboard always displays computed values regardless of data source.
function enrichMetrics(m: DailyMetrics): DailyMetrics {
  return {
    ...m,
    cost_per_install_gbp: m.cost_per_install_gbp ?? (m.tiktok_installs > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.tiktok_installs) * 100) / 100 : null),
    cost_per_trial_gbp: m.cost_per_trial_gbp ?? (m.total_trials > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.total_trials) * 100) / 100 : null),
    cost_per_subscriber_gbp: m.cost_per_subscriber_gbp ?? (m.new_subscriptions > 0 && m.tiktok_spend_gbp > 0 ? Math.round((m.tiktok_spend_gbp / m.new_subscriptions) * 100) / 100 : null),
  };
}

type DashboardSegment = "all" | "parents" | "teens";

const SEGMENT_CONFIG: Record<DashboardSegment, {
  label: string; emoji: string; color: string;
  activeStyle: React.CSSProperties;
}> = {
  all:     { label: "All",     emoji: "🌐", color: "#F97316", activeStyle: { background: "linear-gradient(135deg, #F59E0B, #F97316)" } },
  parents: { label: "Parents", emoji: "👨‍👩‍👧", color: "#06B6D4", activeStyle: { background: "linear-gradient(135deg, #06B6D4, #0891B2)" } },
  teens:   { label: "Teens",   emoji: "👧", color: "#EC4899", activeStyle: { background: "linear-gradient(135deg, #EC4899, #DB2777)" } },
};

/** Remaps standard DailyMetrics keys to segment-specific values so all existing charts work unchanged */
function getSegmentView(m: DailyMetrics, seg: "parents" | "teens"): DailyMetrics {
  const spend    = seg === "parents" ? (m.parent_spend_gbp  ?? 0) : (m.teen_spend_gbp  ?? 0);
  const installs = seg === "parents" ? (m.parent_installs   ?? 0) : (m.teen_installs   ?? 0);
  const trials   = seg === "parents" ? (m.parent_trials     ?? 0) : (m.teen_trials     ?? 0);
  const revenue  = seg === "parents" ? m.parent_revenue_gbp       : m.teen_revenue_gbp;
  const cpi = installs > 0 && spend > 0 ? Math.round(spend / installs * 100) / 100 : null;
  const cpt = trials   > 0 && spend > 0 ? Math.round(spend / trials   * 100) / 100 : null;
  return {
    ...m,
    tiktok_spend_gbp:       spend,
    tiktok_installs:        installs,
    total_trials:           trials,
    onboarding_trials:      0,
    non_onboarding_trials:  trials,
    total_revenue_gbp:      revenue,
    cost_per_install_gbp:   cpi,
    cost_per_trial_gbp:     cpt,
    cost_per_subscriber_gbp: null, // no per-segment subscription count yet
  };
}

export default function DashboardView({ today: rawToday, yesterday: rawYesterday, history: rawHistory, activities, debugInfo }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [segment, setSegment] = useState<DashboardSegment>("all");

  const history = useMemo(() => rawHistory.map(enrichMetrics), [rawHistory]);
  const today = rawToday ? enrichMetrics(rawToday) : null;
  const yesterday = rawYesterday ? enrichMetrics(rawYesterday) : null;

  // Apply segment transformation so all existing charts/cards work unchanged
  const segmentedHistory = useMemo(
    () => segment === "all" ? history : history.map(m => getSegmentView(m, segment)),
    [history, segment]
  );
  const segmentedToday     = today     && segment !== "all" ? getSegmentView(today,     segment) : today;
  const segmentedYesterday = yesterday && segment !== "all" ? getSegmentView(yesterday, segment) : yesterday;

  const filteredHistory = timeRange === "all" ? segmentedHistory : timeRange === "30d" ? segmentedHistory.slice(-30) : segmentedHistory.slice(-7);
  const selectedMetrics = selectedDate ? segmentedHistory.find((m) => m.date === selectedDate) ?? null : null;
  const selectedActivities = selectedDate ? activities.filter((a) => a.date === selectedDate) : [];

  // 7-day trailing averages for hero cards (use segmented data)
  const last7 = segmentedHistory.slice(-7);
  function avg7(key: keyof DailyMetrics): number | null {
    const vals = last7.map((m) => m[key]).filter((v): v is number => v !== null && v !== undefined && typeof v === "number");
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }

  // Segment-aware label suffix for chart titles
  const segLabel = segment === "parents" ? " · Parents" : segment === "teens" ? " · Teens" : "";
  const cfg = SEGMENT_CONFIG[segment];

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

          {/* SEGMENT TOGGLE */}
          <div className="flex gap-1 bg-white rounded-xl p-1" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {(["all", "parents", "teens"] as DashboardSegment[]).map((seg) => {
              const c = SEGMENT_CONFIG[seg];
              return (
                <button
                  key={seg}
                  onClick={() => setSegment(seg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    segment === seg ? "text-white shadow-sm" : "text-gray-400 hover:text-gray-700"
                  }`}
                  style={segment === seg ? c.activeStyle : undefined}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HeroMetric label={`Cost Per Install${segLabel}`} avgValue={avg7("cost_per_install_gbp")} yesterdayValue={segmentedYesterday?.cost_per_install_gbp ?? null} format="currency" invertColors tooltip="TikTok ad spend / total installs" sparklineData={last7.map((m) => m.cost_per_install_gbp ?? 0)} gradient="linear-gradient(135deg, #F59E0B, #F97316)" />
          <HeroMetric label={`Cost Per Trial${segLabel}`} avgValue={avg7("cost_per_trial_gbp")} yesterdayValue={segmentedYesterday?.cost_per_trial_gbp ?? null} format="currency" invertColors tooltip="TikTok ad spend / trial starts" sparklineData={last7.map((m) => m.cost_per_trial_gbp ?? 0)} gradient="linear-gradient(135deg, #10B981, #059669)" />
          {segment === "all"
            ? <HeroMetric label="Cost Per Subscriber" avgValue={avg7("cost_per_subscriber_gbp")} yesterdayValue={segmentedYesterday?.cost_per_subscriber_gbp ?? null} format="currency" invertColors tooltip="TikTok spend / new subscribers (7-day lag)" sparklineData={last7.map((m) => m.cost_per_subscriber_gbp ?? 0)} gradient="linear-gradient(135deg, #8B5CF6, #7C3AED)" />
            : <HeroMetric label={`Revenue${segLabel}`} avgValue={avg7("total_revenue_gbp")} yesterdayValue={segmentedYesterday?.total_revenue_gbp ?? null} format="currency" tooltip={`Daily revenue · ${cfg.label}`} sparklineData={last7.map((m) => m.total_revenue_gbp ?? 0)} gradient={segment === "parents" ? "linear-gradient(135deg, #06B6D4, #0891B2)" : "linear-gradient(135deg, #EC4899, #DB2777)"} />
          }
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
          <TrendChart title={`Cost Per Install${segLabel}`} data={filteredHistory} dataKey="cost_per_install_gbp" color="#F59E0B" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
          <TrendChart title={`Cost Per Trial${segLabel}`} data={filteredHistory} dataKey="cost_per_trial_gbp" color="#10B981" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
          <TrendChart title={`Cost Per Subscriber${segLabel}`} data={filteredHistory} dataKey="cost_per_subscriber_gbp" color="#8B5CF6" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
        </div>

        {/* VOLUME CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TrendChart title={`New Installs${segLabel}`} data={filteredHistory} dataKey="tiktok_installs" color="#3B82F6" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
          <TrendChart title={`New Trials${segLabel}`} data={filteredHistory} dataKey="total_trials" secondaryDataKey="non_onboarding_trials" secondaryLabel="Non-Onboarding" color="#10B981" secondaryColor="#8B5CF6" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
          <TrendChart title="Subscribers" data={filteredHistory} dataKey="new_subscriptions" secondaryDataKey="churn" secondaryLabel="Churn" color="#10B981" secondaryColor="#EF4444" onDayClick={handleChartClick} selectedDate={selectedDate} activities={activities} />
        </div>

        {/* REVENUE (segmented) */}
        <SegmentedRevenueChart data={filteredHistory} onDayClick={handleChartClick} selectedDate={selectedDate} dashboardSegment={segment} />

        {/* DAY DETAIL */}
        {selectedDate && <DayDetailPanel date={selectedDate} metrics={selectedMetrics} activities={selectedActivities} onClose={() => setSelectedDate(null)} />}

        {/* AI INSIGHTS */}
        <InsightsPanel today={segmentedToday ?? today} yesterday={segmentedYesterday} history={segmentedHistory} />

        {/* Debug info at bottom */}
        {debugInfo && (
          <div className="text-[10px] font-mono text-gray-300 text-center py-2">
            {debugInfo}
          </div>
        )}
      </div>
    </div>
  );
}
