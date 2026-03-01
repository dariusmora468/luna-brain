"use client";

import { DailyMetrics } from "@/lib/types";

interface Props {
  today: DailyMetrics;
}

export default function ABTestCard({ today }: Props) {
  const crA = today.ab_variant_a_viewers && today.ab_variant_a_viewers > 0
    ? ((today.ab_variant_a_trials ?? 0) / today.ab_variant_a_viewers) * 100 : null;
  const crB = today.ab_variant_b_viewers && today.ab_variant_b_viewers > 0
    ? ((today.ab_variant_b_trials ?? 0) / today.ab_variant_b_viewers) * 100 : null;

  const significance = today.ab_test_significance;
  const isSignificant = significance !== null && significance >= 95;

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">A/B Test: Onboarding</h3>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400 font-medium">Statistical Significance</span>
          <span className={`text-sm font-bold ${isSignificant ? "text-emerald-600" : "text-amber-600"}`}>
            {significance?.toFixed(1) ?? "—"}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: "95%" }} />
          <div
            className={`h-3 rounded-full transition-all ${isSignificant ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-amber-400 to-amber-500"}`}
            style={{ width: `${Math.min(significance ?? 0, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-300">0%</span>
          <span className="text-[10px] text-gray-400">95% threshold</span>
          <span className="text-[10px] text-gray-300">100%</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Variant A (Monthly)</p>
            <p className="text-xs text-gray-400">{today.ab_variant_a_viewers ?? 0} viewers &middot; {today.ab_variant_a_trials ?? 0} trials</p>
          </div>
          <span className="text-lg font-bold text-gray-800">{crA?.toFixed(1) ?? "—"}%</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">Variant B (Annual)</p>
            <p className="text-xs text-gray-400">{today.ab_variant_b_viewers ?? 0} viewers &middot; {today.ab_variant_b_trials ?? 0} trials</p>
          </div>
          <span className="text-lg font-bold text-gray-800">{crB?.toFixed(1) ?? "—"}%</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
          isSignificant ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
        }`}>
          {isSignificant ? "Statistically Significant — Ready to Decide" : "Not Yet Conclusive — Keep Running"}
        </span>
      </div>
    </div>
  );
}
