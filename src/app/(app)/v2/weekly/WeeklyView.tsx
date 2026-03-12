"use client";

import { useState, useMemo } from "react";
import { WeeklySummaryRow, ExperimentRow } from "@/lib/v2/parsers";
import { fmtGBP, fmtNum, fmtPct, pctChange, fmtChange } from "@/lib/v2/helpers";
import { MetricTooltip } from "@/components/MetricTooltip";
import { ImportStatusBar } from "@/components/ImportStatusBar";
import type { TabStatus } from "@/components/ImportStatusBar";

interface Props {
  weeks: WeeklySummaryRow[];
  experiments: ExperimentRow[];
  importStatus?: TabStatus[];
}

interface CompareCardProps {
  label: string;
  thisWeek: string;
  lastWeek: string;
  change: ReturnType<typeof fmtChange>;
  approx?: boolean;
  empty?: boolean;
  tooltip?: string;
}

function CompareCard({ label, thisWeek, lastWeek, change, approx, empty, tooltip }: CompareCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border ${empty ? "border-dashed border-gray-200 opacity-50" : "border-gray-100"}`}>
      <p className="text-xs text-gray-400 font-medium mb-3 flex items-center">
        {label}
        {tooltip && <MetricTooltip metricKey={tooltip} />}
        {approx && (
          <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
            ~approx
          </span>
        )}
      </p>
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1">This Week</p>
          <p className={`text-xl font-bold ${thisWeek === "—" ? "text-gray-300" : "text-gray-900"}`}>
            {thisWeek}
          </p>
          {change.positive !== null && (
            <p className={`text-xs font-semibold mt-1 ${change.positive ? "text-green-600" : "text-red-500"}`}>
              {change.text}
            </p>
          )}
        </div>
        <div className="flex-1 border-l border-gray-50 pl-4">
          <p className="text-[10px] text-gray-400 mb-1">Last Week</p>
          <p className={`text-xl font-semibold ${lastWeek === "—" ? "text-gray-300" : "text-gray-600"}`}>
            {lastWeek}
          </p>
        </div>
      </div>
      {empty && (
        <p className="text-[10px] text-gray-400 mt-2">Fill in sheet to populate</p>
      )}
    </div>
  );
}

// Find experiments active during a given week
function expsForWeek(experiments: ExperimentRow[], weekEnding: string | null) {
  if (!weekEnding) return [];
  const end = new Date(weekEnding);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  return experiments.filter((e) => {
    const expStart = e.start_date ? new Date(e.start_date) : null;
    const expEnd = e.end_date ? new Date(e.end_date) : new Date();
    if (!expStart) return false;
    return expStart <= end && expEnd >= start;
  });
}

export default function WeeklyView({ weeks, experiments, importStatus }: Props) {
  const [selected, setSelected] = useState<number>(weeks.length > 0 ? weeks.length - 1 : 0);

  if (weeks.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Decision View</h1>
          <p className="text-sm text-gray-500 mt-1">No daily data imported yet — weekly metrics are computed from daily actuals.</p>
        </div>
        {importStatus && importStatus.length > 0 && (
          <div className="mb-4">
            <ImportStatusBar tabs={importStatus} />
          </div>
        )}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">Import the Daily Actuals CSV to see week-over-week comparisons here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
        </div>
      </div>
    );
  }

  const w = weeks[selected];
  const activeExps = useMemo(() => expsForWeek(experiments, w.week_ending), [experiments, w.week_ending]);
  const concludedExps = useMemo(
    () =>
      experiments.filter((e) => {
        if (!e.end_date || !w.week_ending) return false;
        const end = new Date(w.week_ending);
        const weekStart = new Date(end);
        weekStart.setDate(weekStart.getDate() - 7);
        const expEnd = new Date(e.end_date);
        return expEnd >= weekStart && expEnd <= end;
      }),
    [experiments, w.week_ending]
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-400">Weekly</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Decision View</h1>
          {w.week_ending && (
            <p className="text-sm text-gray-500 mt-1">Week ending {w.week_ending}</p>
          )}
        </div>

        {/* Week selector */}
        <div className="flex gap-2 flex-wrap">
          {weeks.map((wk, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                selected === i
                  ? "text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:text-gray-700"
              }`}
              style={selected === i ? { background: "linear-gradient(135deg, #F59E0B, #F97316)" } : undefined}
            >
              {wk.week_ending ? wk.week_ending.slice(5) : `W${i + 1}`}
              {i === weeks.length - 1 && <span className="ml-1 opacity-70">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Metric comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <CompareCard
          label="TikTok Spend"
          thisWeek={fmtGBP(w.spend_tw)}
          lastWeek={fmtGBP(w.spend_lw)}
          change={fmtChange(pctChange(w.spend_tw, w.spend_lw))}
          empty={w.spend_tw === null && w.spend_lw === null}
          tooltip="spend_tw"
        />
        <CompareCard
          label="Installs (Adjust)"
          thisWeek={fmtNum(w.installs_tw)}
          lastWeek={fmtNum(w.installs_lw)}
          change={fmtChange(pctChange(w.installs_tw, w.installs_lw))}
          empty={w.installs_tw === null && w.installs_lw === null}
          tooltip="installs_tw"
        />
        <CompareCard
          label="New Paid Subs"
          thisWeek={fmtNum(w.new_subs_tw)}
          lastWeek={fmtNum(w.new_subs_lw)}
          change={fmtChange(pctChange(w.new_subs_tw, w.new_subs_lw))}
          empty={w.new_subs_tw === null && w.new_subs_lw === null}
          tooltip="new_subs_tw"
        />
        <CompareCard
          label="Revenue"
          thisWeek={fmtGBP(w.revenue_tw)}
          lastWeek={fmtGBP(w.revenue_lw)}
          change={fmtChange(pctChange(w.revenue_tw, w.revenue_lw))}
          empty={w.revenue_tw === null && w.revenue_lw === null}
          tooltip="revenue_tw"
        />
        <CompareCard
          label="MRR"
          thisWeek={fmtGBP(w.mrr_tw)}
          lastWeek={fmtGBP(w.mrr_lw)}
          change={fmtChange(pctChange(w.mrr_tw, w.mrr_lw))}
          empty={w.mrr_tw === null && w.mrr_lw === null}
          tooltip="mrr_tw"
        />
        <CompareCard
          label="CPI (Adjust)"
          thisWeek={fmtGBP(w.cpi_tw, 2)}
          lastWeek={fmtGBP(w.cpi_lw, 2)}
          change={fmtChange(pctChange(w.cpi_tw, w.cpi_lw))}
          approx
          empty={w.cpi_tw === null && w.cpi_lw === null}
          tooltip="cpi_tw"
        />
      </div>

      {/* Additional metrics */}
      {(w.active_subs !== null || w.net_new_subs !== null || w.weeks_to_1m_arr !== null) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {w.active_subs !== null && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Active Subs</p>
              <p className="text-xl font-bold text-gray-900">{fmtNum(w.active_subs)}</p>
            </div>
          )}
          {w.net_new_subs !== null && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Net New Subs</p>
              <p className={`text-xl font-bold ${(w.net_new_subs ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                {(w.net_new_subs ?? 0) >= 0 ? "+" : ""}{fmtNum(w.net_new_subs)}
              </p>
            </div>
          )}
          {w.weeks_to_1m_arr !== null && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Weeks to £1M ARR</p>
              <p className="text-xl font-bold text-gray-900">{fmtNum(w.weeks_to_1m_arr)}w</p>
            </div>
          )}
        </div>
      )}

      {/* Active experiments */}
      {activeExps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🧪 Experiments active this week ({activeExps.length})
          </h3>
          <div className="space-y-2">
            {activeExps.map((e) => (
              <div key={e.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">{e.name}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  e.status === "Running" ? "bg-amber-100 text-amber-700" :
                  e.status === "Done" ? "bg-gray-100 text-gray-600" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concluded experiments */}
      {concludedExps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            ✅ Experiments concluded this week ({concludedExps.length})
          </h3>
          <div className="space-y-3">
            {concludedExps.map((e) => (
              <div key={e.name} className="text-xs">
                <p className="font-semibold text-gray-800">{e.name}</p>
                {e.result && <p className="text-gray-500 mt-0.5">{e.result}</p>}
                {e.decision && e.decision !== "TBD" && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full font-semibold ${
                    e.decision === "Applied" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {e.decision}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeExps.length === 0 && concludedExps.length === 0 && experiments.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center text-xs text-gray-400">
          No experiments active or concluded during this week
        </div>
      )}
    </div>
  );
}
