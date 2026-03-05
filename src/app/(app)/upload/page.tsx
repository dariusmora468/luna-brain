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
  detectedDate: string | null;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function extractFileDate(file: File, type: FileType): Promise<string | null> {
  // First: try filename — works for TikTok (2026-03-04 to 2026-03-04.xlsx)
  // and Purchasely (Luna - Conversion - 2026-03-05T10_37_20.csv)
  const filenameMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
  if (filenameMatch) return filenameMatch[1];

  // Fallback: scan first 500 bytes of CSV content for a date
  if (type !== "tiktok") {
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.readAsText(file.slice(0, 500));
    });
    for (const line of text.split("\n").slice(1)) {
      const match = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
  }
  return null;
}

function detectFileType(name: string): FileType {
  const lower = name.toLowerCase();
  if (lower.includes("campaign") || (lower.includes("tiktok") && lower.includes("report"))) return "tiktok";
  if (lower.includes("conversion")) return "conversions";
  if (lower.includes("screen") && lower.includes("view")) return "screenviews";
  if (lower.includes("subscription") || lower.includes("churn")) return "subscriptions";
  if (lower.includes("revenue") && lower.includes("country")) return "revenue_country";
  if (lower.includes("revenue") && lower.includes("plan")) return "revenue_plans";
  if (lower.includes("revenue") && lower.includes("store")) return "revenue_stores";
  if (lower.includes("revenue")) return "revenue_stores";
  return "unknown";
}

// ---- Source group URL builders ----

function buildTikTokUrl(date: string) {
  return `https://ads.tiktok.com/i18n/manage/campaign?aadvid=7279002125701595138&sort_state=ctr&sort_order=1&relative_time=1&filters%5B0%5D%5Bfield%5D=campaign_status&filters%5B0%5D%5Bin_field_values%5D%5B0%5D=delivery_ok&filters%5B0%5D%5Bfilter_type%5D=0&st=${date}&et=${date}`;
}

function buildPurchaselySubsUrl(date: string) {
  const dr = encodeURIComponent(`${date}T00:00:00.000Z,${date}T00:00:00.000Z`);
  return `https://console.purchasely.io/app_LqxssVldDI20rClHxeoFUTvC6yoPOr/dashboards/subscriptions?date_range%5B%5D=${dr}&primary_metric=paywalls_viewed&secondary_metric=conversions_to_regular_ratio&group_by_primary=none&group_by_secondary=none&primary_metric_sub_evolution=all&group_by_primary_sub_evolution=none&offer_types%5B%5D=NONE%2CINTRO_OFFER%2CPROMOTIONAL_OFFER%2CPROMO_CODE`;
}

function buildPurchaselyConvUrl(date: string) {
  const dr = encodeURIComponent(`${date}T00:00:00.000Z,${date}T00:00:00.000Z`);
  return `https://console.purchasely.io/app_LqxssVldDI20rClHxeoFUTvC6yoPOr/dashboards/conversion?date_range%5B%5D=${dr}&primary_metric=unique_viewers&secondary_metric=conversions_to_offer_count&group_by_primary=none&group_by_secondary=country&primary_metric_sub_evolution=all&group_by_primary_sub_evolution=none&placements%5B%5D=plac_gvXbX7H4ZXWZCiUiy4nCnr44JOsYIdS1%2Cplac_CuGQ9FOmG0LZuRwlRqslqLZiANlQZVMd%2Cplac_z2g1ZzLErwl7vgeVTawyBhE6kblC0Gk%2Cplac_IimeiB5pmR4LAAnAxYO1ONIsIVtws%2Cplac_kLsaF2kQCFt6cLmAEqaSgaHdeaBAcI%2Cplac_8R2GVz5FglxSHOH683EHdWmPwRQhQGd%2Cplac_gYqfthRUjcI8u1qANae5qiIgqZpl0I%2Cplac_LpfgptgxTvvLwlpFxvcpYf9joLFFcG6e%2Cplac_HcV6MfgC7Up53f51lyYbRBXQPEO7Kc%2Cplac_19ZBIgn3SPdaZElCnO02jMrRh3z9gi6I%2Cplac_vdP2WpEXVkUrUdkPZqkBhJp1SnAlr9e%2Cplac_CE8SN0x4K91nSkuOI0AGLuAVMW8hvfBl%2Cplac_tN4AlcKDMQpQROy4B3hoK8SxZzg4Pct%2Cplac_CaP0Aep3nhqE8O1O2sEp2X73At2P2zPW%2Cplac_PMa3jMkW8dkYMO5kTbtiCGmgp1MFkBI%2Cplac_crRzibqkyebdUJfeeUjoUtERuhRrb%2Cplac_1MPUQhYp4pwMuV92wPAgOL7aUwGU9X%2Cplac_aV17R1BdqUi06q2744fi9xFqmzkl3FfI%2Cplac_IWzW3Z1dPaaMdtBv1QP3cJZiGQyFVdLo&countries%5B%5D=US%2CGB`;
}

// ---- Source group definitions ----

interface SlotDef {
  type: FileType;
  label: string;
  hint: string;
  required: boolean;
}

interface GroupDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  getUrl: (date: string) => string;
  slots: SlotDef[];
}

const SOURCE_GROUPS: GroupDef[] = [
  {
    id: "tiktok",
    label: "TikTok Ads",
    emoji: "📊",
    color: "#E8184A",
    bgColor: "#FFF0F3",
    getUrl: buildTikTokUrl,
    slots: [
      {
        type: "tiktok",
        label: "Campaign Report",
        hint: "luna life limited *Campaign Report*.xlsx",
        required: false,
      },
    ],
  },
  {
    id: "purchasely_subs",
    label: "Purchasely: Subscriptions",
    emoji: "📱",
    color: "#6366F1",
    bgColor: "#F5F3FF",
    getUrl: buildPurchaselySubsUrl,
    slots: [
      {
        type: "subscriptions",
        label: "New Subscriptions & Churn",
        hint: "*day_new-subscriptions-and-churn.csv",
        required: false,
      },
      {
        type: "revenue_stores",
        label: "Revenue by Stores",
        hint: "*day_revenues-by-stores.csv",
        required: false,
      },
      {
        type: "revenue_country",
        label: "Revenue by Country",
        hint: "*day_revenues-by-country.csv",
        required: false,
      },
      {
        type: "revenue_plans",
        label: "Revenue by Plans",
        hint: "*day_revenues-by-plans.csv",
        required: false,
      },
    ],
  },
  {
    id: "purchasely_conv",
    label: "Purchasely: Conversions",
    emoji: "📈",
    color: "#10B981",
    bgColor: "#F0FDF8",
    getUrl: buildPurchaselyConvUrl,
    slots: [
      {
        type: "conversions",
        label: "Conversions",
        hint: "Luna - Conversion - *.csv",
        required: true,
      },
      {
        type: "screenviews",
        label: "Screen Views",
        hint: "Luna - Screen Views - *.csv",
        required: true,
      },
    ],
  },
];

const ALL_SLOTS = SOURCE_GROUPS.flatMap((g) => g.slots);

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    metrics?: Record<string, unknown>;
  } | null>(null);
  const [targetDate, setTargetDate] = useState(getYesterday);
  const router = useRouter();

  const addFiles = useCallback(async (newFiles: File[]) => {
    const processed: UploadFile[] = await Promise.all(
      newFiles.map(async (file) => {
        const type = detectFileType(file.name);
        const detectedDate = await extractFileDate(file, type);
        return { name: file.name, file, type, detectedDate };
      })
    );
    setFiles((prev) => {
      const next = [...prev];
      for (const pf of processed) {
        if (pf.type !== "unknown") {
          const idx = next.findIndex((f) => f.type === pf.type);
          if (idx >= 0) { next[idx] = pf; continue; }
        }
        next.push(pf);
      }
      return next;
    });
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
    },
    [addFiles]
  );

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
      formData.append("date", targetDate);

      const res = await fetch("/api/metrics/upload", { method: "POST", body: formData });
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
  const totalFilled = ALL_SLOTS.filter((s) => filledTypes.has(s.type)).length;
  const readyFiles = files.filter((f) => f.type !== "unknown");

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      <header
        className="bg-white/80 backdrop-blur-sm"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/dashboard"
            className="text-gray-400 hover:text-gray-700 transition-colors font-medium text-sm"
          >
            ← Dashboard
          </a>
          <a
            href="/data"
            className="text-gray-400 hover:text-gray-700 transition-colors font-medium text-sm"
          >
            View Data →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload Daily Data</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Click a source to open it, download the files, then drop them here. Auto-detected by
          filename.{" "}
          <strong className="text-gray-700">
            {totalFilled} / {ALL_SLOTS.length}
          </strong>{" "}
          files ready.
        </p>

        {/* Target date */}
        <div className="mb-6 flex items-center gap-4">
          <div>
            <label className="text-sm text-gray-500 font-medium block mb-1.5">Data for date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-5">Source links update automatically to this date</p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-200 cursor-pointer mb-6"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div
            className="w-10 h-10 rounded-2xl mx-auto mb-2 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))",
            }}
          >
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-sm">
            Drop all files here or click to browse
          </p>
          <p className="text-gray-400 text-xs mt-1">Accepts .csv and .xlsx</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Source groups */}
        <div className="space-y-3 mb-6">
          {SOURCE_GROUPS.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Group header */}
              <div
                className="px-4 py-3 flex items-center justify-between border-b border-gray-100"
                style={{ background: group.bgColor }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{group.emoji}</span>
                  <span className="font-semibold text-sm" style={{ color: group.color }}>
                    {group.label}
                  </span>
                </div>
                <a
                  href={group.getUrl(targetDate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: group.color }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open{" "}
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </a>
              </div>

              {/* File slots */}
              {group.slots.map((slot) => {
                const matched = files.find((f) => f.type === slot.type);
                const dateOk = matched?.detectedDate === targetDate;
                const dateMismatch =
                  matched && matched.detectedDate && matched.detectedDate !== targetDate;
                const dateUnknown = matched && matched.detectedDate === null;

                return (
                  <div
                    key={slot.type}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                      matched && dateOk
                        ? "bg-emerald-50/40"
                        : dateMismatch
                        ? "bg-amber-50/40"
                        : ""
                    }`}
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        matched && dateOk
                          ? "bg-emerald-100"
                          : dateMismatch
                          ? "bg-amber-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {matched && dateOk ? (
                        <svg
                          className="w-3 h-3 text-emerald-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : dateMismatch ? (
                        <svg
                          className="w-3 h-3 text-amber-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                          />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>

                    {/* Label + info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{slot.label}</span>
                        {slot.required && !matched && (
                          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded">
                            required
                          </span>
                        )}
                      </div>
                      {matched ? (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-gray-500 truncate max-w-[220px]">
                            {matched.name}
                          </p>
                          {dateMismatch && (
                            <span className="text-[10px] text-amber-600 font-semibold flex-shrink-0">
                              ⚠ file date {matched.detectedDate} ≠ {targetDate}
                            </span>
                          )}
                          {dateUnknown && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              date undetected
                            </span>
                          )}
                          {dateOk && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex-shrink-0">
                              ✓ {matched.detectedDate}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{slot.hint}</p>
                      )}
                    </div>

                    {/* Remove button */}
                    {matched && (
                      <button
                        onClick={() => removeFile(slot.type)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-sm flex-shrink-0 px-1 leading-none"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Unknown files */}
          {unknownFiles.length > 0 && (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Unrecognised files
                </span>
              </div>
              {unknownFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-amber-600 font-bold">?</span>
                  </div>
                  <p className="flex-1 text-xs text-gray-500 truncate">{f.name}</p>
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
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning */}
        {files.length > 0 && !hasRequired && (
          <p className="mb-4 text-amber-600 text-sm font-medium flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Conversions and Screen Views are required before processing.
          </p>
        )}

        {/* Process button */}
        {readyFiles.length > 0 && (
          <button
            onClick={handleProcess}
            disabled={processing || !hasRequired}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                processing || !hasRequired
                  ? "#9CA3AF"
                  : "linear-gradient(135deg, #F59E0B, #F97316)",
              boxShadow:
                !processing && hasRequired ? "0 4px 14px rgba(245,158,11,0.35)" : "none",
            }}
          >
            {processing
              ? "Processing..."
              : `Process ${readyFiles.length} file${readyFiles.length !== 1 ? "s" : ""} for ${targetDate}`}
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
            <p className="font-semibold">{result.success ? "✓ Data saved" : "Error"}</p>
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
