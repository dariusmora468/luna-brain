"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type FileType =
  | "tiktok"
  | "conversions"
  | "screenviews"
  | "subscriptions"
  | "revenue_stores"
  | "revenue_country"
  | "revenue_plans"
  | "unknown";

interface UploadFile {
  name: string;
  file: File;
  type: FileType;
}

// Expected daily file slots — shown as a checklist
const FILE_SLOTS: {
  type: FileType;
  label: string;
  hint: string;
  color: string;
  required: boolean;
}[] = [
  {
    type: "tiktok",
    label: "TikTok Ads",
    hint: "*Campaign Report*.xlsx",
    color: "bg-pink-50 text-pink-600 border-pink-200",
    required: false,
  },
  {
    type: "conversions",
    label: "Purchasely Conversions",
    hint: "Luna - Conversion - *.csv",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    required: true,
  },
  {
    type: "screenviews",
    label: "Purchasely Screen Views",
    hint: "Luna - Screen Views - *.csv",
    color: "bg-teal-50 text-teal-600 border-teal-200",
    required: true,
  },
  {
    type: "subscriptions",
    label: "Subscriptions & Churn",
    hint: "*new-subscriptions-and-churn.csv",
    color: "bg-purple-50 text-purple-600 border-purple-200",
    required: false,
  },
  {
    type: "revenue_stores",
    label: "Revenue by Stores",
    hint: "*revenues-by-stores.csv",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    required: false,
  },
  {
    type: "revenue_country",
    label: "Revenue by Country",
    hint: "*revenues-by-country.csv",
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    required: false,
  },
  {
    type: "revenue_plans",
    label: "Revenue by Plans",
    hint: "*revenues-by-plans.csv",
    color: "bg-violet-50 text-violet-600 border-violet-200",
    required: false,
  },
];

function detectFileType(name: string): FileType {
  const lower = name.toLowerCase();
  if (lower.includes("campaign") || (lower.includes("tiktok") && lower.includes("report"))) return "tiktok";
  if (lower.includes("conversion")) return "conversions";
  if (lower.includes("screen") && lower.includes("view")) return "screenviews";
  if (lower.includes("subscription") || lower.includes("churn")) return "subscriptions";
  if (lower.includes("revenue") && lower.includes("country")) return "revenue_country";
  if (lower.includes("revenue") && lower.includes("plan")) return "revenue_plans";
  if (lower.includes("revenue") && lower.includes("store")) return "revenue_stores";
  if (lower.includes("revenue")) return "revenue_stores"; // fallback
  return "unknown";
}

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
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  }, []);

  function addFiles(newFiles: File[]) {
    setFiles((prev) => {
      const next = [...prev];
      for (const file of newFiles) {
        const type = detectFileType(file.name);
        // Replace existing slot of same type; append unknowns
        if (type !== "unknown") {
          const existingIdx = next.findIndex((f) => f.type === type);
          if (existingIdx >= 0) {
            next[existingIdx] = { name: file.name, file, type };
            continue;
          }
        }
        next.push({ name: file.name, file, type });
      }
      return next;
    });
    setResult(null);
  }

  function removeFile(type: FileType) {
    setFiles((prev) => prev.filter((f) => f.type !== type));
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
      if (dateOverride) formData.append("date", dateOverride);

      const res = await fetch("/api/metrics/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const m = data.metrics ?? {};
        setResult({
          success: true,
          message: `Saved ${data.date}. ${m.total_trials ?? 0} trials · £${Number(m.total_revenue_gbp ?? 0).toFixed(2)} revenue · ${m.tiktok_installs ?? 0} installs`,
          metrics: data.metrics,
        });
        setFiles([]);
      } else {
        setResult({ success: false, message: data.error || "Processing failed" });
      }
    } catch {
      setResult({ success: false, message: "Network error — check console" });
    } finally {
      setProcessing(false);
    }
  }

  const filledTypes = new Set(files.map((f) => f.type));
  const unknownFiles = files.filter((f) => f.type === "unknown");
  const hasRequired = filledTypes.has("conversions") && filledTypes.has("screenviews");
  const totalFilled = FILE_SLOTS.filter((s) => filledTypes.has(s.type)).length;

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      <header className="bg-white/80 backdrop-blur-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors font-medium text-sm">
            ← Dashboard
          </a>
          <a href="/data" className="text-gray-400 hover:text-gray-700 transition-colors font-medium text-sm">
            View Data →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Daily Data</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Drop all your daily files at once. They are auto-detected by filename and merged into one day&apos;s metrics.
        </p>

        {/* Date override */}
        <div className="mb-6">
          <label className="text-sm text-gray-500 font-medium block mb-1.5">
            Date override{" "}
            <span className="text-gray-400 font-normal">(leave empty to auto-detect from files)</span>
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
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-200 cursor-pointer mb-6"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))" }}
          >
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">Drop all files here or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">Accepts .csv and .xlsx — up to 7 files at once</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* File slots checklist */}
        <div
          className="bg-white rounded-2xl overflow-hidden mb-6"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Expected files</p>
            <span className="text-xs text-gray-400">
              {totalFilled} / {FILE_SLOTS.length} matched
            </span>
          </div>

          {FILE_SLOTS.map((slot) => {
            const matched = files.find((f) => f.type === slot.type);
            return (
              <div
                key={slot.type}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                  matched ? "bg-emerald-50/40" : ""
                }`}
              >
                {/* Status dot */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    matched ? "bg-emerald-100" : "bg-gray-100"
                  }`}
                >
                  {matched ? (
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Label + filename */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${slot.color}`}>
                      {slot.label}
                    </span>
                    {slot.required && !matched && (
                      <span className="text-[10px] text-amber-600 font-semibold">required</span>
                    )}
                  </div>
                  {matched ? (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{matched.name}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{slot.hint}</p>
                  )}
                </div>

                {/* Remove */}
                {matched && (
                  <button
                    onClick={() => removeFile(slot.type)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs font-medium flex-shrink-0 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Unknown files */}
          {unknownFiles.map((f, i) => (
            <div
              key={`unknown-${i}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 bg-amber-50/30"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                <span className="text-[9px] text-amber-600 font-bold">?</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg border bg-gray-100 text-gray-500 border-gray-200">
                  Unknown
                </span>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{f.name}</p>
              </div>
              <button
                onClick={() =>
                  setFiles((prev) => {
                    let count = 0;
                    return prev.filter((x) => {
                      if (x.type === "unknown") {
                        if (count === i) { count++; return false; }
                        count++;
                      }
                      return true;
                    });
                  })
                }
                className="text-gray-300 hover:text-red-400 transition-colors text-xs font-medium flex-shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Warning */}
        {files.length > 0 && !hasRequired && (
          <p className="mb-4 text-amber-600 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Conversions and Screen Views CSVs are required.
          </p>
        )}

        {/* Process button */}
        {files.length > 0 && (
          <button
            onClick={handleProcess}
            disabled={processing || !hasRequired}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                processing || !hasRequired
                  ? "#9CA3AF"
                  : "linear-gradient(135deg, #F59E0B, #F97316)",
            }}
          >
            {processing
              ? "Processing..."
              : `Process ${files.filter((f) => f.type !== "unknown").length} file${
                  files.filter((f) => f.type !== "unknown").length !== 1 ? "s" : ""
                }`}
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
      </main>
    </div>
  );
}
