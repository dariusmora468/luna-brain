"use client";

import { useState, useMemo } from "react";

// ── Required columns per tab ─────────────────────────────────────────────────
// Each entry is a list of known column name variants — if ANY variant is the
// actual header in the sheet, that column is marked required.
// Empty cells in required columns get amber highlight.

const REQUIRED_VARIANTS: Record<string, string[][]> = {
  daily_actuals: [
    ["Date", "date", "DATE"],
    ["TikTok Spend (£)", "TikTok Spend", "Spend (£)", "Total Spend", "Spend"],
    ["Teen Spend (£)", "Teen Spend", "Spend: UK Teen", "Spend: US Teen"],
    ["Parent Spend (£)", "Parent Spend", "Spend: UK Parent", "Spend: US Parent"],
    ["Adjust Total Installs", "Total Installs", "Installs"],
    ["New Paid Subs", "New Paid Subscribers", "New Subscribers"],
    ["Revenue (£)", "Revenue"],
    ["MRR (£)", "MRR"],
    ["Trials Teen", "Teen Trials", "Trials: Teen"],
    ["Trials Parent", "Parent Trials", "Trials: Parent"],
  ],
  experiment_log: [
    ["Experiment Name", "Name", "Experiment"],
    ["Status"],
    ["Start Date", "Start"],
    ["End Date", "End"],
    ["Focus Area", "Area"],
    ["Hypothesis"],
  ],
  monthly_metric: [
    ["Month", "month", "Period"],
    ["ARR (£)", "ARR"],
    ["MRR (£)", "MRR"],
    ["Net New Paid Subs", "Net New Subscribers", "New Paying Total"],
    ["Monthly Churn %", "Churn %", "Churn"],
    ["Teen Revenue (£)", "Teen Revenue", "Revenue: Teen"],
    ["Parent Revenue (£)", "Parent Revenue", "Revenue: Parent"],
    ["Teen Ad Spend (£)", "Teen Spend", "US Teen Ad Spend", "Spend: US Teen", "Spend: UK Teen"],
    ["Teen CPI (£)", "Teen CPI", "CPI: US Teen", "CPI: UK Teen"],
    ["Teen New Paid Subs", "Teen New Subscribers", "Paid: Teen"],
    ["Teen Open-to-Trial %", "Teen Open to Trial %", "Acct→Trial (Teen)"],
    ["Teen Trial-to-Paid %", "Teen Trial to Paid %", "Trial→Paid (Teen)"],
    ["Teen Open-to-Paid %", "Teen Open to Paid %", "Acct→Paid (Teen, calculated)"],
    ["Teen LTV0 (£)", "Teen LTV0"],
    ["Teen D90 LTV (£)", "Teen D90 LTV"],
    ["Teen Projected LTV (£)", "Teen Projected LTV", "Teen Proj LTV"],
    ["Teen CAC (£)", "Teen CAC", "CAC-A: Teen"],
    ["Teen LTV:CAC", "Teen LTV/CAC", "Teen LTV:CAC-A"],
    ["Parent Ad Spend (£)", "Parent Spend", "US Parent Ad Spend", "Spend: US Parent", "Spend: UK Parent"],
    ["Parent CPI (£)", "Parent CPI", "CPI: UK Parent"],
    ["Parent New Paid Subs", "Parent New Subscribers", "Paid: Parent"],
    ["Parent Open-to-Trial %", "Parent Open to Trial %"],
    ["Parent Trial-to-Paid %", "Parent Trial to Paid %"],
    ["Parent LTV0 (£)", "Parent LTV0"],
    ["Parent D90 LTV (£)", "Parent D90 LTV"],
    ["Parent Projected LTV (£)", "Parent Projected LTV", "Parent Proj LTV"],
    ["Parent CAC (£)", "Parent CAC", "CAC-A: Parent"],
    ["Parent LTV:CAC", "Parent LTV/CAC"],
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the set of required column headers present in a given set of headers */
function buildRequiredSet(tabKey: string, headers: string[]): Set<string> {
  const variants = REQUIRED_VARIANTS[tabKey] ?? [];
  const required = new Set<string>();
  const headerSet = new Set(headers);
  for (const group of variants) {
    for (const variant of group) {
      if (headerSet.has(variant)) {
        required.add(variant);
        break; // only mark the first matching variant per group
      }
    }
  }
  return required;
}

/** Deduplicate and maintain order from raw rows */
function extractHeaders(rows: Record<string, string>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface TabDataEntry {
  tab: string;
  label: string;
  rows: Record<string, string>[];
}

interface Props {
  tabData: TabDataEntry[];
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DataSheetView({ tabData }: Props) {
  const [activeTab, setActiveTab] = useState(tabData[0]?.tab ?? "");

  const current = tabData.find((t) => t.tab === activeTab);

  const { headers, requiredCols, missingCount } = useMemo(() => {
    if (!current) return { headers: [], requiredCols: new Set<string>(), missingCount: 0 };
    const h = extractHeaders(current.rows);
    const req = buildRequiredSet(current.tab, h);

    let missing = 0;
    for (const row of current.rows) {
      for (const col of req) {
        if (!row[col] || row[col].trim() === "") missing++;
      }
    }
    return { headers: h, requiredCols: req, missingCount: missing };
  }, [current]);

  if (tabData.every((t) => t.rows.length === 0)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Data Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">No data imported yet.</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-400 mb-3">Import an Excel file to view the raw sheet data here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Data Sheet</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Data Sheet</h1>
        <p className="text-sm text-gray-500 mt-1">
          Raw imported data — cells highlighted in amber are required by the dashboard but currently empty.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {tabData.map((t) => (
          <button
            key={t.tab}
            onClick={() => setActiveTab(t.tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] text-gray-400">
              ({t.rows.length})
            </span>
          </button>
        ))}
      </div>

      {/* Legend + stats */}
      {current && current.rows.length > 0 && (
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            Required field — empty
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />
            Optional or filled
          </div>
          {missingCount > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              ⚠ {missingCount.toLocaleString()} missing required cell{missingCount !== 1 ? "s" : ""}
            </span>
          )}
          {missingCount === 0 && requiredCols.size > 0 && (
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              ✓ All required fields filled
            </span>
          )}
        </div>
      )}

      {/* Table */}
      {current && current.rows.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-gray-50 border-b border-r border-gray-200 px-2 py-2 text-gray-400 font-medium text-right min-w-[3rem] sticky left-0 z-20">
                    #
                  </th>
                  {headers.map((h) => {
                    const isReq = requiredCols.has(h);
                    return (
                      <th
                        key={h}
                        className={`border-b border-r border-gray-200 px-2 py-2 text-left font-semibold whitespace-nowrap ${
                          isReq
                            ? "bg-amber-50 text-amber-800"
                            : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {h}
                        {isReq && (
                          <span className="ml-1 text-amber-500 text-[9px]">●</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {current.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                  >
                    <td className="border-b border-r border-gray-100 px-2 py-1.5 text-gray-300 text-right font-mono sticky left-0 bg-inherit">
                      {ri + 1}
                    </td>
                    {headers.map((h) => {
                      const val = row[h] ?? "";
                      const isEmpty = val.trim() === "";
                      const isReq = requiredCols.has(h);
                      const highlight = isReq && isEmpty;
                      return (
                        <td
                          key={h}
                          className={`border-b border-r border-gray-100 px-2 py-1.5 whitespace-nowrap ${
                            highlight
                              ? "bg-amber-50 text-amber-400 italic"
                              : "text-gray-700"
                          }`}
                        >
                          {highlight ? "—" : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 bg-gray-50 flex justify-between">
            <span>
              {current.rows.length} row{current.rows.length !== 1 ? "s" : ""} · {headers.length} column{headers.length !== 1 ? "s" : ""}
              {requiredCols.size > 0 && ` · ${requiredCols.size} required column${requiredCols.size !== 1 ? "s" : ""} tracked`}
            </span>
            <span>
              Highlights clear automatically when you re-import with filled data
            </span>
          </div>
        </div>
      ) : (
        current && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No rows imported for {current.label} yet
          </div>
        )
      )}
    </div>
  );
}
