"use client";

import { PlacementBreakdown } from "@/lib/types";

interface Props {
  placements: PlacementBreakdown[];
}

export default function PlacementTable({ placements }: Props) {
  if (!placements || placements.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Non-Onboarding Placements</h3>
        <p className="text-gray-400 text-sm">No non-onboarding conversions today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Non-Onboarding Placements</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide font-semibold">
              <th className="text-left pb-3">Placement</th>
              <th className="text-right pb-3">Trials</th>
              <th className="text-right pb-3">Viewers</th>
              <th className="text-right pb-3">CVR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {placements.map((p) => (
              <tr key={p.placement_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 text-gray-600 font-mono text-xs">{p.placement_id.replace(/_/g, " ")}</td>
                <td className="py-2.5 text-right text-gray-800 font-semibold">{p.trials}</td>
                <td className="py-2.5 text-right text-gray-500">{p.viewers}</td>
                <td className="py-2.5 text-right text-emerald-600 font-semibold">{p.conversion_rate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
