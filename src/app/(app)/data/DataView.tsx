"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DailyMetrics } from "@/lib/types";

// Column definitions: what shows in the spreadsheet
const COLUMNS: {
  key: string;
  label: string;
  group: string;
  editable: boolean;
  format: "int" | "currency" | "percent" | "decimal";
  width: number;
}[] = [
  // TikTok
  { key: "tiktok_spend_gbp", label: "Spend (£)", group: "TikTok", editable: true, format: "currency", width: 90 },
  { key: "tiktok_installs", label: "Installs", group: "TikTok", editable: true, format: "int", width: 80 },
  { key: "tiktok_impressions", label: "Impr.", group: "TikTok", editable: true, format: "int", width: 80 },
  { key: "tiktok_clicks", label: "Clicks", group: "TikTok", editable: true, format: "int", width: 70 },
  // Trials
  { key: "total_trials", label: "Trials", group: "Trials", editable: true, format: "int", width: 70 },
  { key: "onboarding_trials", label: "Onboard.", group: "Trials", editable: true, format: "int", width: 80 },
  { key: "non_onboarding_trials", label: "In-App", group: "Trials", editable: true, format: "int", width: 70 },
  { key: "monthly_trials", label: "Monthly", group: "Trials", editable: true, format: "int", width: 75 },
  { key: "annual_full_trials", label: "Annual", group: "Trials", editable: true, format: "int", width: 70 },
  { key: "annual_discount_trials", label: "Disc.", group: "Trials", editable: true, format: "int", width: 60 },
  // Trials by audience
  { key: "parent_trials", label: "Parent", group: "Trials", editable: false, format: "int", width: 65 },
  { key: "teen_trials", label: "Teen", group: "Trials", editable: false, format: "int", width: 60 },
  // Market
  { key: "us_trials", label: "US", group: "Market", editable: true, format: "int", width: 55 },
  { key: "gb_trials", label: "UK", group: "Market", editable: true, format: "int", width: 55 },
  // Subscriptions
  { key: "new_subscriptions", label: "New Subs", group: "Subs", editable: true, format: "int", width: 80 },
  { key: "churn", label: "Churn", group: "Subs", editable: true, format: "int", width: 65 },
  // Revenue
  { key: "total_revenue_gbp", label: "Total (£)", group: "Revenue", editable: true, format: "currency", width: 85 },
  { key: "apple_revenue_gbp", label: "Apple", group: "Revenue", editable: false, format: "currency", width: 75 },
  { key: "google_revenue_gbp", label: "Google", group: "Revenue", editable: false, format: "currency", width: 75 },
  { key: "gb_revenue_gbp", label: "UK", group: "Revenue", editable: false, format: "currency", width: 70 },
  { key: "au_revenue_gbp", label: "AU", group: "Revenue", editable: false, format: "currency", width: 70 },
  { key: "nl_revenue_gbp", label: "NL", group: "Revenue", editable: false, format: "currency", width: 70 },
  { key: "se_revenue_gbp", label: "SE", group: "Revenue", editable: false, format: "currency", width: 70 },
  // Revenue by plan
  { key: "parent_revenue_gbp", label: "Parent", group: "Plan Rev", editable: false, format: "currency", width: 75 },
  { key: "teen_revenue_gbp", label: "Teen", group: "Plan Rev", editable: false, format: "currency", width: 70 },
  { key: "rev_parent_annual_gbp", label: "Par Annual", group: "Plan Rev", editable: false, format: "currency", width: 90 },
  { key: "rev_parent_monthly_gbp", label: "Par Monthly", group: "Plan Rev", editable: false, format: "currency", width: 95 },
  { key: "rev_teen_annual_gbp", label: "Teen Annual", group: "Plan Rev", editable: false, format: "currency", width: 95 },
  { key: "rev_teen_monthly_gbp", label: "Teen Monthly", group: "Plan Rev", editable: false, format: "currency", width: 100 },
  { key: "rev_teen_weekly_gbp", label: "Teen Weekly", group: "Plan Rev", editable: false, format: "currency", width: 100 },
  // Derived (auto-computed, not editable)
  { key: "cost_per_install_gbp", label: "CPI (£)", group: "Derived", editable: false, format: "currency", width: 75 },
  { key: "cost_per_trial_gbp", label: "CPT (£)", group: "Derived", editable: false, format: "currency", width: 75 },
  { key: "cost_per_subscriber_gbp", label: "CPS (£)", group: "Derived", editable: false, format: "currency", width: 75 },
  { key: "install_to_trial_cr", label: "I→T %", group: "Derived", editable: false, format: "percent", width: 70 },
  { key: "roas_7d", label: "ROAS", group: "Derived", editable: false, format: "decimal", width: 65 },
];

const GROUPS = ["TikTok", "Trials", "Market", "Subs", "Revenue", "Plan Rev", "Derived"];

const GROUP_COLORS: Record<string, string> = {
  TikTok: "#3B82F6",
  Trials: "#8B5CF6",
  Market: "#06B6D4",
  Subs: "#F59E0B",
  Revenue: "#10B981",
  "Plan Rev": "#7C3AED",
  Derived: "#6B7280",
};

function formatValue(val: number | null | undefined, format: string): string {
  if (val === null || val === undefined) return "—";
  switch (format) {
    case "currency": return val.toFixed(2);
    case "percent": return val.toFixed(2) + "%";
    case "decimal": return val.toFixed(2);
    case "int": return Math.round(val).toString();
    default: return String(val);
  }
}

function recomputeDerived(row: DailyMetrics): Partial<DailyMetrics> {
  const spend = row.tiktok_spend_gbp || 0;
  const installs = row.tiktok_installs || 0;
  const trials = row.total_trials || 0;
  const subs = row.new_subscriptions || 0;

  return {
    cost_per_install_gbp: installs > 0 && spend > 0 ? Math.round((spend / installs) * 100) / 100 : null,
    cost_per_trial_gbp: trials > 0 && spend > 0 ? Math.round((spend / trials) * 100) / 100 : null,
    cost_per_subscriber_gbp: subs > 0 && spend > 0 ? Math.round((spend / subs) * 100) / 100 : null,
    install_to_trial_cr: installs > 0 ? Math.round((trials / installs) * 10000) / 100 : null,
  };
}

interface EditingCell {
  date: string;
  key: string;
}

function exportCSV(data: DailyMetrics[]) {
  const headers = ["date", ...COLUMNS.map(c => c.key)];
  const rows = data.map(row => {
    return headers.map(h => {
      const val = h === "date" ? row.date : (row as unknown as Record<string, number | null>)[h];
      if (val === null || val === undefined) return "";
      return String(val);
    }).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `luna-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataView({ initialData }: { initialData: DailyMetrics[] }) {
  const [data, setData] = useState<DailyMetrics[]>(initialData);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleCellClick = useCallback((date: string, key: string, currentValue: number | null) => {
    const col = COLUMNS.find(c => c.key === key);
    if (!col?.editable) return;
    setEditing({ date, key });
    setEditValue(currentValue !== null && currentValue !== undefined ? String(currentValue) : "");
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;

    const { date, key } = editing;
    const numValue = editValue === "" ? 0 : Number(editValue);
    if (isNaN(numValue)) {
      setEditing(null);
      return;
    }

    // Find the row and update locally first
    const rowIndex = data.findIndex(r => r.date === date);
    if (rowIndex === -1) return;

    const updatedRow = { ...data[rowIndex], [key]: numValue };
    const derived = recomputeDerived(updatedRow);
    const finalRow = { ...updatedRow, ...derived };

    const newData = [...data];
    newData[rowIndex] = finalRow;
    setData(newData);
    setEditing(null);
    setSaving(date);

    // Save to DB
    try {
      const res = await fetch("/api/metrics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          updates: { [key]: numValue, ...derived },
        }),
      });

      if (res.ok) {
        setLastSaved(`${key} updated for ${date}`);
        setTimeout(() => setLastSaved(null), 2000);
      } else {
        console.error("Save failed");
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(null);
    }
  }, [editing, editValue, data]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditing(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSave();
      // Move to next editable cell
      if (editing) {
        const currentColIndex = COLUMNS.findIndex(c => c.key === editing.key);
        const nextEditableCol = COLUMNS.slice(currentColIndex + 1).find(c => c.editable);
        if (nextEditableCol) {
          const row = data.find(r => r.date === editing.date);
          if (row) {
            setTimeout(() => {
              handleCellClick(editing.date, nextEditableCol.key, (row as unknown as Record<string, number | null>)[nextEditableCol.key]);
            }, 50);
          }
        }
      }
    }
  }, [editing, handleSave, handleCellClick, data]);

  // Group columns for header
  const groupSpans = GROUPS.map(group => ({
    group,
    count: COLUMNS.filter(c => c.group === group).length,
    width: COLUMNS.filter(c => c.group === group).reduce((sum, c) => sum + c.width, 0),
  }));

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: "rgba(248,245,240,0.92)" }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Data</h1>
            <p className="text-sm text-gray-400">{data.length} days of metrics. Click any cell to edit.</p>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {lastSaved}
              </span>
            )}
            <button
              onClick={() => exportCSV(data)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <a
              href="/upload"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
            >
              Add Data
            </a>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="px-6 pb-8">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "1200px" }}>
              {/* Group header */}
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 bg-white px-4 py-2 text-left text-xs font-semibold text-gray-400 border-b border-gray-100"
                    style={{ width: 100, minWidth: 100 }}
                  />
                  {groupSpans.map(({ group, count }) => (
                    <th
                      key={group}
                      colSpan={count}
                      className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider border-b border-gray-100"
                      style={{ color: GROUP_COLORS[group] }}
                    >
                      {group}
                    </th>
                  ))}
                </tr>
                {/* Column header */}
                <tr>
                  <th
                    className="sticky left-0 z-20 bg-white px-4 py-2.5 text-left text-xs font-semibold text-gray-500 border-b border-gray-200"
                    style={{ width: 100, minWidth: 100 }}
                  >
                    Date
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-2 py-2.5 text-right text-xs font-semibold border-b border-gray-200 ${col.editable ? "text-gray-600" : "text-gray-400"}`}
                      style={{ width: col.width, minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.map((row, rowIndex) => {
                  const isWeekend = (() => {
                    const d = new Date(row.date + "T12:00:00");
                    const day = d.getDay();
                    return day === 0 || day === 6;
                  })();
                  const isSaving = saving === row.date;

                  return (
                    <tr
                      key={row.date}
                      className={`group transition-colors ${
                        isSaving ? "bg-amber-50" :
                        isWeekend ? "bg-gray-50/50" :
                        rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      } hover:bg-amber-50/30`}
                    >
                      {/* Date cell (sticky) */}
                      <td
                        className={`sticky left-0 z-10 px-4 py-2 font-mono text-xs font-semibold border-b border-gray-100 ${
                          isSaving ? "bg-amber-50" :
                          isWeekend ? "bg-gray-50/50" :
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        } group-hover:bg-amber-50/30`}
                        style={{ color: isWeekend ? "#9CA3AF" : "#374151" }}
                      >
                        {formatDate(row.date)}
                      </td>

                      {/* Data cells */}
                      {COLUMNS.map((col) => {
                        const value = (row as unknown as Record<string, number | null>)[col.key] ?? null;
                        const isEditing = editing?.date === row.date && editing?.key === col.key;
                        const isEmpty = value === null || value === undefined || value === 0;
                        const isGroupBorder = COLUMNS.indexOf(col) > 0 && COLUMNS[COLUMNS.indexOf(col) - 1]?.group !== col.group;

                        return (
                          <td
                            key={col.key}
                            className={`px-2 py-1.5 text-right border-b border-gray-100 ${
                              isGroupBorder ? "border-l border-gray-100" : ""
                            } ${col.editable ? "cursor-pointer" : ""}`}
                            onClick={() => handleCellClick(row.date, col.key, value)}
                          >
                            {isEditing ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="w-full px-1.5 py-0.5 text-right text-xs font-mono rounded border-2 border-amber-400 focus:outline-none bg-white"
                                style={{ minWidth: 40 }}
                              />
                            ) : (
                              <span className={`text-xs font-mono ${
                                !col.editable ? "text-gray-400 italic" :
                                isEmpty ? "text-gray-300" : "text-gray-700"
                              }`}>
                                {formatValue(value, col.format)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-400 px-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
            Weekend
          </span>
          <span className="flex items-center gap-1.5">
            <span className="italic text-gray-400">Italic</span>
            = auto-computed (not editable)
          </span>
          <span>Tab to move between cells. Enter to save. Esc to cancel.</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}
