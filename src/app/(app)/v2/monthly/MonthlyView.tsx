"use client";

import { useState } from "react";
import { MonthlyMetricRow } from "@/lib/v2/parsers";
import { fmtGBP, fmtNum, fmtPct, fmtX, dash } from "@/lib/v2/helpers";
import { MetricTooltip } from "@/components/MetricTooltip";
import { ImportStatusBar } from "@/components/ImportStatusBar";
import type { TabStatus } from "@/components/ImportStatusBar";

interface Props {
  rows: MonthlyMetricRow[];
  importStatus?: TabStatus[];
}

// ── Shared badges ───────────────────────────────────────────

function ApproxBadge() {
  return (
    <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 align-middle">
      ~approx
    </span>
  );
}

function ProvisionalBadge() {
  return (
    <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 align-middle">
      provisional
    </span>
  );
}

/** LTV:CAC health badge — red (<1x), amber (1–3x), green (≥3x). */
function LtvCacBadge({ val }: { val: number | null }) {
  if (val === null) return <span className="text-gray-300 text-sm font-semibold">—</span>;
  if (val < 1) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-sm font-bold text-red-600">{fmtX(val)}</span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
          Critical
        </span>
      </span>
    );
  }
  if (val < 3) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-sm font-bold text-amber-600">{fmtX(val)}</span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
          Below target
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm font-bold text-green-600">{fmtX(val)}</span>
      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
        Healthy
      </span>
    </span>
  );
}

/** Inline warning shown when a validation check fails. */
function InlineWarning({ message }: { message: string }) {
  return (
    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
      ⚠ {message}
    </p>
  );
}

/** Banner warning shown at section level. */
function BannerWarning({ message }: { message: string }) {
  return (
    <div className="mx-5 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800">
      ⚠ {message}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: React.ReactNode;
  approx?: boolean;
  provisional?: boolean;
  isLatestMonth?: boolean;
  tooltip?: string;
  warning?: string | null;
}

function MetricRow({ label, value, approx, provisional, isLatestMonth, tooltip, warning }: MetricRowProps) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-0.5">
          {label}
          {tooltip && <MetricTooltip metricKey={tooltip} />}
        </span>
        <span className={`text-sm font-semibold ${typeof value === "string" && value === "—" ? "text-gray-300" : "text-gray-900"}`}>
          {value}
          {approx && <ApproxBadge />}
          {provisional && isLatestMonth && <ProvisionalBadge />}
        </span>
      </div>
      {warning && <InlineWarning message={warning} />}
    </div>
  );
}

interface SectionCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
  bannerWarning?: string | null;
}

function SectionCard({ number, title, children, bannerWarning }: SectionCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
        >
          {number}
        </span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {bannerWarning && <BannerWarning message={bannerWarning} />}
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

// ── Validation helpers ──────────────────────────────────────

/** ARR vs MRR×12 check. Returns warning message or null. */
function checkArrVsMrr(arr: number | null, mrr: number | null): string | null {
  if (arr === null || mrr === null || mrr === 0) return null;
  const implied = mrr * 12;
  const drift = Math.abs(arr - implied) / implied;
  if (drift > 0.05) {
    return `ARR in sheet (${fmtGBP(arr)}) differs from MRR × 12 (${fmtGBP(implied)}) by ${fmtPct(drift * 100, 0)}. Check the sheet formula.`;
  }
  return null;
}

/** Open-to-Paid vs Open-to-Trial × Trial-to-Paid cross-check. Returns warning or null. */
function checkFunnelCrossCheck(
  openToTrial: number | null,
  trialToPaid: number | null,
  openToPaid: number | null
): string | null {
  if (openToTrial === null || trialToPaid === null || openToPaid === null) return null;
  const expected = (openToTrial * trialToPaid) / 100;
  if (expected === 0) return null;
  const drift = Math.abs(openToPaid - expected) / expected;
  if (drift > 0.1) {
    return `Expected Open-to-Paid ~${expected.toFixed(1)}% (Open-to-Trial × Trial-to-Paid) — got ${openToPaid.toFixed(1)}%.`;
  }
  return null;
}

/** Plan mix sum check. Returns warning or null. */
function checkPlanMixSum(annual: number | null, monthly: number | null): string | null {
  if (annual === null || monthly === null) return null;
  const sum = annual + monthly;
  if (Math.abs(sum - 100) > 2) {
    return `Plan mix sums to ${sum.toFixed(0)}% — expected 100%. Check Annual % + Monthly % in sheet.`;
  }
  return null;
}

/** Teen + Parent revenue vs total period revenue coverage. Returns warning or null. */
function checkRevenueSplitCoverage(
  teenRevenue: number | null,
  parentRevenue: number | null,
  mrr: number | null
): string | null {
  if (teenRevenue === null || parentRevenue === null || mrr === null || mrr === 0) return null;
  const splitTotal = teenRevenue + parentRevenue;
  const coverage = (splitTotal / mrr) * 100;
  if (coverage < 90 || coverage > 110) {
    return `Teen + Parent revenue (${fmtGBP(splitTotal)}) covers ${coverage.toFixed(0)}% of MRR (${fmtGBP(mrr)}). Segment attribution may be incomplete.`;
  }
  return null;
}

// ── Main component ──────────────────────────────────────────

export default function MonthlyView({ rows, importStatus }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    rows.length > 0 ? rows.length - 1 : 0
  );

  if (rows.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Monthly Finance View</h1>
          <p className="text-sm text-gray-500 mt-1">No monthly data imported yet.</p>
        </div>
        {importStatus && importStatus.length > 0 && (
          <div className="mb-4">
            <ImportStatusBar tabs={importStatus} />
          </div>
        )}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">Import the Monthly Metric CSV to see the 10-section framework here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
        </div>
      </div>
    );
  }

  const row = rows[selectedMonth];
  const isLatestMonth = selectedMonth === rows.length - 1;

  // Validation checks for this row
  const arrMrrWarning = checkArrVsMrr(row.arr, row.mrr);
  const teenFunnelWarning = checkFunnelCrossCheck(
    row.teen_open_to_trial_pct,
    row.teen_trial_to_paid_pct,
    row.teen_open_to_paid_pct
  );
  const parentFunnelWarning = checkFunnelCrossCheck(
    row.parent_open_to_trial_pct,
    row.parent_trial_to_paid_pct,
    row.parent_open_to_paid_pct
  );
  const teenPlanMixWarning = checkPlanMixSum(row.teen_plan_mix_annual_pct, row.teen_plan_mix_monthly_pct);
  const parentPlanMixWarning = checkPlanMixSum(row.parent_plan_mix_annual_pct, row.parent_plan_mix_monthly_pct);
  const revenueSplitWarning = checkRevenueSplitCoverage(row.teen_revenue, row.parent_revenue, row.mrr);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-400">Monthly Finance</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Finance View</h1>
          <p className="text-sm text-gray-500 mt-1">10-section metrics framework</p>
        </div>

        {/* Month selector */}
        <div className="flex gap-2 flex-wrap">
          {rows.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelectedMonth(i)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                selectedMonth === i
                  ? "text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:text-gray-700"
              }`}
              style={selectedMonth === i ? { background: "linear-gradient(135deg, #F59E0B, #F97316)" } : undefined}
            >
              {r.month}
              {i === rows.length - 1 && <span className="ml-1 opacity-70">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Badge legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold text-[9px]">~approx</span>
          <span className="text-gray-400">Purchasely-derived (not exact)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-[9px]">provisional</span>
          <span className="text-gray-400">Needs 90-day maturation</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-[9px]">Healthy</span>
          <span className="text-gray-400">LTV:CAC ≥ 3x</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[9px]">Below target</span>
          <span className="text-gray-400">LTV:CAC 1–3x</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold text-[9px]">Critical</span>
          <span className="text-gray-400">LTV:CAC &lt; 1x</span>
        </span>
      </div>

      {/* 10 sections — 2 column grid on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Section 1: ARR Target */}
        <SectionCard number={1} title="ARR Target" bannerWarning={arrMrrWarning}>
          <MetricRow label="ARR" value={fmtGBP(row.arr)} tooltip="arr" />
          <MetricRow label="Required Monthly Growth Rate" value={fmtPct(row.required_monthly_growth_rate)} tooltip="required_monthly_growth_rate" />
        </SectionCard>

        {/* Section 2: Company Revenue */}
        <SectionCard number={2} title="Company Revenue">
          <MetricRow label="MRR" value={fmtGBP(row.mrr)} tooltip="monthly_mrr" />
          <MetricRow label="Net New Paid Subs" value={fmtNum(row.net_new_paid_subs)} tooltip="net_new_paid_subs" />
          <MetricRow label="Monthly Churn" value={fmtPct(row.monthly_churn_pct)} tooltip="monthly_churn_pct" />
          <MetricRow
            label="Teen Revenue"
            value={fmtGBP(row.teen_revenue)}
            approx
            tooltip="teen_revenue"
          />
          <MetricRow
            label="Parent Revenue"
            value={fmtGBP(row.parent_revenue)}
            approx
            tooltip="parent_revenue"
            warning={revenueSplitWarning}
          />
        </SectionCard>

        {/* Section 3: US Teen Acquisition */}
        <SectionCard number={3} title="US Teen Acquisition">
          <MetricRow label="Ad Spend" value={fmtGBP(row.teen_ad_spend)} tooltip="teen_ad_spend" />
          <MetricRow label="First App Opens" value={fmtNum(row.teen_first_app_opens)} tooltip="teen_first_app_opens" approx />
          <MetricRow label="CPI" value={fmtGBP(row.teen_cpi, 2)} approx tooltip="teen_cpi" />
          <MetricRow label="New Paid Subs" value={fmtNum(row.teen_new_paid_subs)} tooltip="teen_new_paid_subs" />
        </SectionCard>

        {/* Section 4: US Teen Conversion */}
        <SectionCard number={4} title="US Teen Conversion (matured)">
          <MetricRow label="Open-to-Trial %" value={fmtPct(row.teen_open_to_trial_pct)} approx tooltip="open_to_trial_pct" />
          <MetricRow label="Trial-to-Paid %" value={fmtPct(row.teen_trial_to_paid_pct)} tooltip="trial_to_paid_pct" />
          <MetricRow
            label="Open-to-Paid %"
            value={fmtPct(row.teen_open_to_paid_pct)}
            approx
            tooltip="open_to_paid_pct"
            warning={teenFunnelWarning}
          />
        </SectionCard>

        {/* Section 5: US Teen LTV */}
        <SectionCard number={5} title="US Teen LTV">
          <MetricRow
            label="Plan Mix — Annual"
            value={fmtPct(row.teen_plan_mix_annual_pct)}
            tooltip="plan_mix_annual_pct"
          />
          <MetricRow
            label="Plan Mix — Monthly"
            value={fmtPct(row.teen_plan_mix_monthly_pct)}
            tooltip="plan_mix_monthly_pct"
            warning={teenPlanMixWarning}
          />
          <MetricRow label="LTV0" value={fmtGBP(row.teen_ltv0, 2)} approx tooltip="ltv0" />
          <MetricRow label="D90 LTV" value={fmtGBP(row.teen_d90_ltv, 2)} approx provisional isLatestMonth={isLatestMonth} tooltip="d90_ltv" />
          <MetricRow label="Projected LTV" value={fmtGBP(row.teen_projected_ltv, 2)} approx provisional isLatestMonth={isLatestMonth} tooltip="projected_ltv" />
        </SectionCard>

        {/* Section 6: US Teen Unit Economics */}
        <SectionCard number={6} title="US Teen Unit Economics">
          <MetricRow label="CAC" value={fmtGBP(row.teen_cac, 2)} approx tooltip="cac" />
          <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              LTV:CAC
              <MetricTooltip metricKey="ltv_cac" />
            </span>
            <LtvCacBadge val={row.teen_ltv_cac} />
          </div>
        </SectionCard>

        {/* Section 7: US Parent Acquisition */}
        <SectionCard number={7} title="US Parent Acquisition">
          <MetricRow label="Ad Spend" value={fmtGBP(row.parent_ad_spend)} tooltip="parent_ad_spend" />
          <MetricRow label="First App Opens" value={fmtNum(row.parent_first_app_opens)} approx tooltip="parent_first_app_opens" />
          <MetricRow label="CPI" value={fmtGBP(row.parent_cpi, 2)} approx tooltip="parent_cpi" />
          <MetricRow label="New Paid Subs" value={fmtNum(row.parent_new_paid_subs)} tooltip="parent_new_paid_subs" />
        </SectionCard>

        {/* Section 8: US Parent Conversion */}
        <SectionCard number={8} title="US Parent Conversion (matured)">
          <MetricRow label="Open-to-Trial %" value={fmtPct(row.parent_open_to_trial_pct)} approx tooltip="open_to_trial_pct" />
          <MetricRow label="Trial-to-Paid %" value={fmtPct(row.parent_trial_to_paid_pct)} tooltip="trial_to_paid_pct" />
          <MetricRow
            label="Open-to-Paid %"
            value={fmtPct(row.parent_open_to_paid_pct)}
            approx
            tooltip="open_to_paid_pct"
            warning={parentFunnelWarning}
          />
        </SectionCard>

        {/* Section 9: US Parent LTV */}
        <SectionCard number={9} title="US Parent LTV">
          <MetricRow
            label="Plan Mix — Annual"
            value={fmtPct(row.parent_plan_mix_annual_pct)}
            tooltip="plan_mix_annual_pct"
          />
          <MetricRow
            label="Plan Mix — Monthly"
            value={fmtPct(row.parent_plan_mix_monthly_pct)}
            tooltip="plan_mix_monthly_pct"
            warning={parentPlanMixWarning}
          />
          <MetricRow label="LTV0" value={fmtGBP(row.parent_ltv0, 2)} approx tooltip="ltv0" />
          <MetricRow label="D90 LTV" value={fmtGBP(row.parent_d90_ltv, 2)} approx provisional isLatestMonth={isLatestMonth} tooltip="d90_ltv" />
          <MetricRow label="Projected LTV" value={fmtGBP(row.parent_projected_ltv, 2)} approx provisional isLatestMonth={isLatestMonth} tooltip="projected_ltv" />
        </SectionCard>

        {/* Section 10: US Parent Unit Economics */}
        <SectionCard number={10} title="US Parent Unit Economics">
          <MetricRow label="CAC" value={fmtGBP(row.parent_cac, 2)} approx tooltip="cac" />
          <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              LTV:CAC
              <MetricTooltip metricKey="ltv_cac" />
            </span>
            <LtvCacBadge val={row.parent_ltv_cac} />
          </div>
        </SectionCard>
      </div>

      {/* Raw data disclosure */}
      <details className="mt-6">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
          View raw row data for {row.month}
        </summary>
        <pre className="mt-2 text-[10px] bg-white rounded-xl p-4 overflow-auto border border-gray-100 text-gray-500 max-h-64">
          {JSON.stringify(row.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
