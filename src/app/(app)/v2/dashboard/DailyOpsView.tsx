"use client";

import { useState, useMemo } from "react";
import { DailyActualsRow, ExperimentRow } from "@/lib/v2/parsers";
import { fmtGBP, fmtNum, pctChange, fmtChange } from "@/lib/v2/helpers";
import { MetricTooltip } from "@/components/MetricTooltip";
import { ImportStatusBar, TabStatus } from "@/components/ImportStatusBar";
import { UnifiedChart } from "./UnifiedChart";

interface Props {
  dailyRows: DailyActualsRow[];
  experiments: ExperimentRow[];
  importStatus?: TabStatus[];
}

type RangeKey = "1d" | "7d" | "30d" | "90d";

// Summary of last N days
function summarise(rows: DailyActualsRow[], n: number) {
  const slice = rows.slice(-n);
  const prev = rows.slice(-n * 2, -n);

  // Only show period-over-period change when the prior window has the same
  // number of days as the current window (i.e., we have a full comparable period).
  // When false, all prev* values return null so hero cards show "—" instead of
  // a misleading percentage calculated from a shorter window.
  const prevIsValid = prev.length === slice.length;

  const sum = (arr: DailyActualsRow[], key: keyof DailyActualsRow) =>
    arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

  const spend = sum(slice, "tiktok_spend");
  const installs = sum(slice, "adjust_total_installs");
  const subs = sum(slice, "new_paid_subs");
  const revenue = sum(slice, "revenue");
  const lastMrr = slice.at(-1)?.mrr ?? null;

  // CPI variants
  const cpiAdjust = installs > 0 ? spend / installs : null;

  // TikTok-reported installs (column not yet in most sheets — null until added)
  const tikTokInstalls = slice.reduce((s, r) => s + (r.tiktok_reported_installs ?? 0), 0);
  const hasTikTok = slice.some((r) => r.tiktok_reported_installs !== null);
  const cpiTikTok = hasTikTok && tikTokInstalls > 0 ? spend / tikTokInstalls : null;

  // Mixpanel installs (column not yet in most sheets — null until added)
  const mixpanelInstalls = slice.reduce((s, r) => s + (r.mixpanel_installs ?? 0), 0);
  const hasMixpanel = slice.some((r) => r.mixpanel_installs !== null);
  const cpiMixpanel = hasMixpanel && mixpanelInstalls > 0 ? spend / mixpanelInstalls : null;

  // Prior-period values — only populated when prevIsValid
  const prevSpend = prevIsValid ? sum(prev, "tiktok_spend") : null;
  const prevInstalls = prevIsValid ? sum(prev, "adjust_total_installs") : null;
  const prevSubs = prevIsValid ? sum(prev, "new_paid_subs") : null;
  const prevRevenue = prevIsValid ? sum(prev, "revenue") : null;
  const prevMrr = prevIsValid ? (prev.at(-1)?.mrr ?? null) : null;
  const prevCpiAdjust = prevIsValid && prevInstalls !== null && prevInstalls > 0
    ? (prevSpend ?? 0) / prevInstalls
    : null;

  return {
    spend, prevSpend,
    installs, prevInstalls,
    subs, prevSubs,
    revenue, prevRevenue,
    lastMrr, prevMrr,
    cpiAdjust, prevCpiAdjust,
    cpiTikTok, hasTikTok,
    cpiMixpanel, hasMixpanel,
  };
}

interface HeroCardProps {
  label: string;
  value: string;
  change: ReturnType<typeof fmtChange>;
  sub?: string;
  approx?: boolean;
  tooltip?: string;
}

function HeroCard({ label, value, change, sub, approx, tooltip }: HeroCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
        {label}
        {tooltip && <MetricTooltip metricKey={tooltip} />}
        {approx && (
          <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
            ~approx
          </span>
        )}
      </p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change.positive !== null && (
        <p className={`text-xs font-semibold mt-1 ${change.positive ? "text-green-600" : "text-red-500"}`}>
          {change.text} vs prev period
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DailyOpsView({ dailyRows, experiments, importStatus }: Props) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [showOverlay, setShowOverlay] = useState(false);

  const rangeMap: Record<RangeKey, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
  const rangeLabel: Record<RangeKey, string> = { "1d": "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };
  const sliceN = rangeMap[range];

  const slicedRows = useMemo(() => dailyRows.slice(-sliceN), [dailyRows, sliceN]);
  const stats = useMemo(() => summarise(dailyRows, Math.min(sliceN, dailyRows.length)), [dailyRows, sliceN]);

  // Experiment reference lines (for overlay)
  const expLines = useMemo(() => {
    if (!showOverlay) return [];
    return experiments
      .filter((e) => e.start_date || e.end_date)
      .flatMap((e) => [
        e.start_date ? { date: e.start_date.slice(5), name: e.name, type: "start" as const } : null,
        e.end_date ? { date: e.end_date.slice(5), name: e.name, type: "end" as const } : null,
      ])
      .filter(Boolean) as { date: string; name: string; type: "start" | "end" }[];
  }, [experiments, showOverlay]);

  if (dailyRows.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daily Ops Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">No daily data imported yet.</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 mb-3">Import the Daily Actuals CSV to see charts and metrics here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
          {importStatus && importStatus.length > 0 && (
            <div className="mt-5 flex justify-center">
              <ImportStatusBar tabs={importStatus} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-400">Daily Ops</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Ops Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dailyRows.at(0)?.date} → {dailyRows.at(-1)?.date} · {dailyRows.length} days
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Experiment overlay toggle */}
          {experiments.length > 0 && (
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                showOverlay
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showOverlay ? "bg-amber-500" : "bg-gray-300"}`} />
              Experiments
            </button>
          )}

          {/* Range selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["1d", "7d", "30d", "90d"] as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {r === "1d" ? "Yesterday" : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <HeroCard
          label="TikTok Spend"
          value={fmtGBP(stats.spend)}
          change={fmtChange(pctChange(stats.spend, stats.prevSpend))}
          sub={rangeLabel[range]}
        />
        <HeroCard
          label="New Paid Subs"
          value={fmtNum(stats.subs)}
          change={fmtChange(pctChange(stats.subs, stats.prevSubs))}
          sub={rangeLabel[range]}
        />
        <HeroCard
          label="Revenue"
          value={fmtGBP(stats.revenue)}
          change={fmtChange(pctChange(stats.revenue, stats.prevRevenue))}
          sub={rangeLabel[range]}
        />
        {/* CPI (Adjust) — always shown, clearly labelled as Adjust-based */}
        <HeroCard
          label="CPI (Adjust)"
          value={fmtGBP(stats.cpiAdjust, 2)}
          change={fmtChange(pctChange(stats.cpiAdjust, stats.prevCpiAdjust))}
          sub="Includes organic installs — see CPI (TikTok) for paid CPI"
          approx
          tooltip="cpi_adjust"
        />
      </div>

      {/* CPI source cards — show when columns are populated; placeholder when not */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
            CPI (TikTok)
            <MetricTooltip metricKey="cpi_tiktok" />
            <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">~approx</span>
          </p>
          {stats.hasTikTok ? (
            <p className="text-2xl font-bold text-gray-900">{fmtGBP(stats.cpiTikTok, 2)}</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-1">Add &quot;TikTok Reported Installs&quot; column to sheet to unlock</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
            CPI (Mixpanel)
            <MetricTooltip metricKey="cpi_mixpanel" />
            <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">~approx</span>
          </p>
          {stats.hasMixpanel ? (
            <p className="text-2xl font-bold text-gray-900">{fmtGBP(stats.cpiMixpanel, 2)}</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-1">Add &quot;Mixpanel Installs&quot; column to sheet to unlock</p>
            </>
          )}
        </div>
      </div>

      {/* MRR + Installs summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
            Latest MRR
            <MetricTooltip metricKey="mrr" />
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmtGBP(stats.lastMrr)}</p>
          {stats.prevMrr !== null && stats.lastMrr !== null && (
            <p className={`text-xs font-semibold mt-1 ${stats.lastMrr >= stats.prevMrr ? "text-green-600" : "text-red-500"}`}>
              {fmtChange(pctChange(stats.lastMrr, stats.prevMrr)).text} vs prev period
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
            Installs (Adjust)
            <MetricTooltip metricKey="adjust_installs" />
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmtNum(stats.installs)}</p>
          {stats.prevInstalls !== null && (
            <p className={`text-xs font-semibold mt-1 ${(pctChange(stats.installs, stats.prevInstalls) ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
              {fmtChange(pctChange(stats.installs, stats.prevInstalls)).text} vs prev period
            </p>
          )}
        </div>
      </div>

      {/* Unified metric chart */}
      <UnifiedChart rows={slicedRows} experiments={experiments} showExpOverlay={showOverlay} />
    </div>
  );
}
