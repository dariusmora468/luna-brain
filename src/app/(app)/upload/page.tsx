"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UploadFile {
  name: string;
  file: File;
  type: "tiktok" | "revenue" | "subscriptions" | "conversions" | "screenviews" | "unknown";
  status: "pending" | "ready";
}

function detectFileType(name: string): UploadFile["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("campaign") || lower.includes("tiktok")) return "tiktok";
  if (lower.includes("revenue")) return "revenue";
  if (lower.includes("subscription") || lower.includes("churn")) return "subscriptions";
  if (lower.includes("conversion")) return "conversions";
  if (lower.includes("screen") && lower.includes("view")) return "screenviews";
  return "unknown";
}

const FILE_LABELS: Record<string, { label: string; color: string }> = {
  tiktok: { label: "TikTok Ads", color: "bg-pink-50 text-pink-600 border-pink-200" },
  revenue: { label: "Store Revenue", color: "bg-blue-50 text-blue-600 border-blue-200" },
  subscriptions: { label: "Subscriptions", color: "bg-purple-50 text-purple-600 border-purple-200" },
  conversions: { label: "Purchasely Conversions", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  screenviews: { label: "Purchasely Screen Views", color: "bg-teal-50 text-teal-600 border-teal-200" },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    metrics?: Record<string, unknown>;
  } | null>(null);
  const [dateOverride, setDateOverride] = useState("");
  const router = useRouter();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  }, []);

  function addFiles(newFiles: File[]) {
    const uploads: UploadFile[] = newFiles.map((file) => ({
      name: file.name,
      file,
      type: detectFileType(file.name),
      status: "ready" as const,
    }));
    setFiles((prev) => [...prev, ...uploads]);
    setResult(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleProcess() {
    setProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      for (const upload of files) {
        formData.append("files", upload.file);
        formData.append("types", upload.type);
      }
      if (dateOverride) {
        formData.append("date", dateOverride);
      }

      const res = await fetch("/api/metrics/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `Processed successfully. ${data.metrics?.total_trials ?? 0} trials, £${data.metrics?.total_revenue_gbp?.toFixed(2) ?? "0"} revenue.`,
          metrics: data.metrics,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Processing failed",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Network error — check console for details",
      });
    } finally {
      setProcessing(false);
    }
  }

  const hasAllRequired =
    files.some((f) => f.type === "conversions") &&
    files.some((f) => f.type === "screenviews");

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors font-medium text-sm">
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Daily Data</h1>
        <p className="text-gray-500 mb-8">
          Drop your 5 data files below. They&apos;ll be auto-detected, parsed, and metrics computed instantly.
        </p>

        {/* Optional date override */}
        <div className="mb-6">
          <label className="text-sm text-gray-500 font-medium block mb-2">
            Date override (leave empty for auto-detect from files)
          </label>
          <input
            type="date"
            value={dateOverride}
            onChange={(e) => setDateOverride(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            style={{ boxShadow: "var(--shadow-sm)" }}
          />
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-200 cursor-pointer"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))" }}>
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">Drop files here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">
            Accepts: TikTok XLSX, Revenue CSV, Subscriptions CSV, Purchasely CSVs
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {files.map((upload, index) => {
              const fileInfo = FILE_LABELS[upload.type];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-xl"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border ${fileInfo.color}`}
                    >
                      {fileInfo.label}
                    </span>
                    <span className="text-sm text-gray-700 truncate max-w-xs font-medium">
                      {upload.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Status messages */}
        {files.length > 0 && !hasAllRequired && (
          <p className="mt-4 text-amber-600 text-sm font-medium">
            At minimum, Purchasely Conversions and Screen Views CSVs are required.
            TikTok, Revenue, and Subscriptions are optional but recommended.
          </p>
        )}

        {/* Process button */}
        {files.length > 0 && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: processing ? "#9CA3AF" : "linear-gradient(135deg, #F59E0B, #F97316)" }}
          >
            {processing ? "Processing..." : `Process ${files.length} File${files.length !== 1 ? "s" : ""}`}
          </button>
        )}

        {/* Result */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-2xl border ${
              result.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <p className="font-semibold">{result.success ? "Success" : "Error"}</p>
            <p className="text-sm mt-1">{result.message}</p>
            {result.success && (
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
              >
                View Dashboard →
              </button>
            )}
          </div>
        )}

        {/* ---- HISTORICAL IMPORT SECTION ---- */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Import Historical Data</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Upload your Google Sheet export (.xlsx) to backfill all historical metrics and activity notes into the dashboard.
          </p>
          <HistoricalImport />
        </div>
      </main>
    </div>
  );
}

function HistoricalImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const router = useRouter();

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult({
          success: true,
          message: `Imported ${data.metrics?.imported ?? 0} days of metrics and ${data.activities?.imported ?? 0} activity entries.${
            data.metrics?.errors?.length ? ` (${data.metrics.errors.length} metric errors)` : ""
          }${data.activities?.errors?.length ? ` (${data.activities.errors.length} activity errors)` : ""}`,
        });
      } else {
        setImportResult({
          success: false,
          message: data.error || "Import failed",
        });
      }
    } catch {
      setImportResult({
        success: false,
        message: "Network error during import",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <label className="flex-1">
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer hover:shadow-md transition-all duration-200" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-semibold">
                {file ? file.name : "Choose Google Sheet export (.xlsx)"}
              </p>
              <p className="text-xs text-gray-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "File should have columns: Date, TikTok Installs, All Trials, etc."}
              </p>
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setImportResult(null);
            }}
            className="hidden"
          />
        </label>
        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: !file || importing ? "#9CA3AF" : "linear-gradient(135deg, #F59E0B, #F97316)" }}
        >
          {importing ? "Importing..." : "Import"}
        </button>
      </div>

      {importResult && (
        <div
          className={`mt-4 p-4 rounded-2xl border ${
            importResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <p className="font-semibold">{importResult.success ? "Import Complete" : "Import Failed"}</p>
          <p className="text-sm mt-1">{importResult.message}</p>
          {importResult.success && (
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              View Dashboard →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
