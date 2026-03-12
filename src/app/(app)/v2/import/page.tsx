"use client";

import { useState, useRef, useCallback } from "react";

const TABS = [
  {
    id: "daily_actuals",
    label: "Daily Actuals",
    description: "One row per day — spend, installs, subs, revenue",
    icon: "📊",
    legacy: false,
  },
  {
    id: "experiment_log",
    label: "Experiment Log",
    description: "All A/B tests — name, status, dates, results",
    icon: "🧪",
    legacy: false,
  },
  {
    id: "weekly_summary",
    label: "Weekly Summary (Legacy)",
    description: "No longer required — weekly figures are now computed automatically from Daily Actuals",
    icon: "📅",
    legacy: true,
  },
  {
    id: "monthly_metric",
    label: "Monthly Metric",
    description: "10-section monthly finance framework",
    icon: "📈",
    legacy: false,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  rowCount?: number;
  error?: string;
  lastImported?: string;
  /** Column names from our expected list that were absent from the uploaded CSV. */
  missingColumns?: string[];
}

export default function V2ImportPage() {
  const [states, setStates] = useState<Record<TabId, UploadState>>({
    daily_actuals: { status: "idle" },
    experiment_log: { status: "idle" },
    weekly_summary: { status: "idle" },
    monthly_metric: { status: "idle" },
  });
  const [dragging, setDragging] = useState<TabId | null>(null);
  const fileRefs = useRef<Record<TabId, HTMLInputElement | null>>({
    daily_actuals: null,
    experiment_log: null,
    weekly_summary: null,
    monthly_metric: null,
  });

  const uploadFile = useCallback(async (tabId: TabId, file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setStates((prev) => ({
        ...prev,
        [tabId]: { status: "error", error: "Please upload a .csv file" },
      }));
      return;
    }

    setStates((prev) => ({ ...prev, [tabId]: { status: "uploading" } }));

    try {
      const text = await file.text();
      const res = await fetch(`/api/v2/import?tab=${tabId}`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setStates((prev) => ({
          ...prev,
          [tabId]: { status: "error", error: json.error ?? "Upload failed" },
        }));
        return;
      }

      setStates((prev) => ({
        ...prev,
        [tabId]: {
          status: "success",
          rowCount: json.rows_imported,
          lastImported: new Date().toLocaleTimeString("en-GB"),
          missingColumns: json.missing_expected_columns ?? [],
        },
      }));
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [tabId]: {
          status: "error",
          error: err instanceof Error ? err.message : "Network error",
        },
      }));
    }
  }, []);

  const handleFileInput = useCallback(
    (tabId: TabId, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(tabId, file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (tabId: TabId, e: React.DragEvent) => {
      e.preventDefault();
      setDragging(null);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(tabId, file);
    },
    [uploadFile]
  );

  const allSuccess = TABS.every((t) => states[t.id].status === "success");

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Import Data</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Import Google Sheet Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export each tab from your Google Sheet as CSV, then upload below. Data replaces any
          previously imported rows for that tab.
        </p>
      </div>

      {/* How to export instructions */}
      <div className="mb-8 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
        <p className="font-semibold mb-1">How to export from Google Sheets:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Open the Google Sheet</li>
          <li>Click on the tab you want to export (e.g. "Daily Actuals")</li>
          <li>File → Download → Comma Separated Values (.csv)</li>
          <li>Repeat for each tab, then upload below</li>
        </ol>
      </div>

      {/* Upload cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {TABS.map((tab) => {
          const state = states[tab.id];
          const isDraggingOver = dragging === tab.id;

          return (
            <div key={tab.id} className="flex flex-col gap-0">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(tab.id);
                }}
                onDragLeave={() => setDragging(null)}
                onDrop={(e) => handleDrop(tab.id, e)}
                onClick={() => !tab.legacy && fileRefs.current[tab.id]?.click()}
                className={`relative rounded-2xl border-2 transition-all duration-200 p-5 ${
                  tab.legacy
                    ? "border-dashed border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                    : isDraggingOver
                    ? "border-amber-400 bg-amber-50 cursor-pointer"
                    : state.status === "success"
                    ? "border-green-300 bg-green-50 cursor-pointer"
                    : state.status === "error"
                    ? "border-red-300 bg-red-50 cursor-pointer"
                    : state.status === "uploading"
                    ? "border-amber-300 bg-amber-50 animate-pulse cursor-pointer"
                    : "border-dashed border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/30 cursor-pointer"
                }`}
              >
                <input
                  ref={(el) => { fileRefs.current[tab.id] = el; }}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFileInput(tab.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={tab.legacy}
                />

                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tab.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${tab.legacy ? "text-gray-400" : "text-gray-900"}`}>
                      {tab.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{tab.description}</p>
                  </div>

                  {/* Status indicator */}
                  {!tab.legacy && (
                    <div className="flex-shrink-0">
                      {state.status === "uploading" && (
                        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {state.status === "success" && (
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {state.status === "error" && (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {state.status === "idle" && (
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Result message */}
                {!tab.legacy && (
                  <div className="mt-3">
                    {state.status === "idle" && (
                      <p className="text-xs text-gray-400">Drop CSV here or click to browse</p>
                    )}
                    {state.status === "uploading" && (
                      <p className="text-xs text-amber-600">Uploading…</p>
                    )}
                    {state.status === "success" && (
                      <p className="text-xs text-green-600">
                        ✓ {state.rowCount} rows imported at {state.lastImported} —{" "}
                        <span
                          className="underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileRefs.current[tab.id]?.click();
                          }}
                        >
                          re-upload
                        </span>
                      </p>
                    )}
                    {state.status === "error" && (
                      <p className="text-xs text-red-600">⚠ {state.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Missing columns warning — shown below the card after successful upload */}
              {state.status === "success" && state.missingColumns && state.missingColumns.length > 0 && (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                  <p className="font-semibold mb-1">
                    ⚠ {state.missingColumns.length} expected column{state.missingColumns.length !== 1 ? "s" : ""} not found — those metrics will show as —:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    {state.missingColumns.map((col) => (
                      <li key={col} className="font-mono">{col}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All done banner */}
      {allSuccess && (
        <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-lg font-semibold text-amber-700 mb-1">🎉 All data imported!</p>
          <p className="text-sm text-amber-600 mb-3">
            Your V2 dashboard is ready to use.
          </p>
          <a
            href="/v2/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
          >
            Go to Dashboard →
          </a>
        </div>
      )}
    </div>
  );
}
