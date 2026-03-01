"use client";

import { useMemo } from "react";
import type { DailyMetrics } from "@/lib/types";
import { formatCurrency, formatPercent, percentChange } from "@/lib/utils";

interface Props {
  today: DailyMetrics;
  yesterday: DailyMetrics | null;
  history: DailyMetrics[];
}

interface Insight {
  type: "opportunity" | "risk" | "info";
  title: string;
  description: string;
}

const TYPE_STYLES = {
  opportunity: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", label: "Opportunity" },
  risk: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Risk" },
  info: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", label: "Insight" },
};

function generateInsights(today: DailyMetrics, yesterday: DailyMetrics | null, history: DailyMetrics[]): Insight[] {
  const insights: Insight[] = [];

  if (yesterday && today.cost_per_install_gbp && yesterday.cost_per_install_gbp) {
    const cpiChange = percentChange(today.cost_per_install_gbp, yesterday.cost_per_install_gbp);
    if (cpiChange !== null && cpiChange < -10) {
      insights.push({ type: "opportunity", title: "CPI dropping significantly", description: `Cost per install is down ${Math.abs(cpiChange).toFixed(1)}% vs yesterday (${formatCurrency(today.cost_per_install_gbp)} vs ${formatCurrency(yesterday.cost_per_install_gbp)}). If this trend holds, consider scaling ad spend.` });
    } else if (cpiChange !== null && cpiChange > 15) {
      insights.push({ type: "risk", title: "CPI rising sharply", description: `Cost per install jumped ${cpiChange.toFixed(1)}% vs yesterday to ${formatCurrency(today.cost_per_install_gbp)}. Check if TikTok creatives need refreshing or audience targeting adjusted.` });
    }
  }

  if (today.non_onboarding_trials > 0 && today.total_trials > 0) {
    const ratio = today.non_onboarding_trials / today.total_trials;
    if (ratio > 0.3) {
      insights.push({ type: "opportunity", title: "Strong non-onboarding conversions", description: `Non-onboarding trials account for ${formatPercent(ratio)} of total trials today (${today.non_onboarding_trials} of ${today.total_trials}). In-app placements are driving organic conversions.` });
    }
  }

  if (today.roas_7d !== null) {
    if (today.roas_7d >= 3) {
      insights.push({ type: "opportunity", title: `ROAS at ${today.roas_7d.toFixed(2)}x`, description: `7-day ROAS is above 3x — the unit economics support increasing ad spend.` });
    } else if (today.roas_7d < 1.5 && today.roas_7d > 0) {
      insights.push({ type: "risk", title: `ROAS below target at ${today.roas_7d.toFixed(2)}x`, description: `7-day ROAS has dropped below the 1.5x threshold. Review recent changes.` });
    }
  }

  if (today.ab_test_significance !== null && today.ab_test_significance >= 95) {
    insights.push({ type: "info", title: "A/B test reached significance", description: `The paywall test hit ${today.ab_test_significance.toFixed(1)}% — enough data to make a confident decision.` });
  }

  if (history.length >= 6) {
    const recent3 = history.slice(-3);
    const prev3 = history.slice(-6, -3);
    const recentAvg = recent3.reduce((s, m) => s + m.total_trials, 0) / 3;
    const prevAvg = prev3.reduce((s, m) => s + m.total_trials, 0) / 3;
    const change = percentChange(recentAvg, prevAvg);
    if (change !== null && change > 20) {
      insights.push({ type: "opportunity", title: "Trial volume trending up", description: `Average daily trials over the last 3 days (${recentAvg.toFixed(0)}) are up ${change.toFixed(0)}% vs prior 3 days. Growth momentum building.` });
    } else if (change !== null && change < -20) {
      insights.push({ type: "risk", title: "Trial volume declining", description: `Average daily trials fell ${Math.abs(change).toFixed(0)}% over the last 3 days. Investigate recent changes.` });
    }
  }

  if (insights.length === 0) {
    insights.push({ type: "info", title: "Metrics steady", description: "No significant changes detected today. Keep monitoring." });
  }

  return insights.slice(0, 5);
}

export default function InsightsPanel({ today, yesterday, history }: Props) {
  const insights = useMemo(() => generateInsights(today, yesterday, history), [today, yesterday, history]);

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">AI Insights</h3>
          <p className="text-[10px] text-gray-400 font-medium">Auto-generated from your metrics</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const style = TYPE_STYLES[insight.type];
          return (
            <div key={i} className={`${style.bg} border ${style.border} rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${style.badge} flex-shrink-0 mt-0.5`}>{style.label}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
