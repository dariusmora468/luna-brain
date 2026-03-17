"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { DailyActualsRow } from "@/lib/v2/parsers";
import { DAILY_COLUMNS, REQUIRED_MISSING_KEYS, ColumnDef } from "@/lib/v2/column-definitions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  dailyRows: DailyActualsRow[];
  projectedLtv: number | null;
}

type Granularity = "daily" | "weekly" | "monthly" | "quarterly";

interface AggregatedRow {
  periodLabel: string;
  date?: string;
  tiktok_spend: number | null;
  tiktok_spend_us: number | null;
  tiktok_spend_uk: number | null;
  tiktok_spend_row: number | null;
  google_spend: number | null;
  meta_spend: number | null;
  teen_spend: number | null;
  teen_spend_us: number | null;
  teen_spend_uk: number | null;
  teen_spend_row: number | null;
  parent_spend: number | null;
  parent_spend_us: number | null;
  parent_spend_uk: number | null;
  parent_spend_row: number | null;
  adjust_total_installs: number | null;
  installs_us: number | null;
  installs_uk: number | null;
  installs_row: number | null;
  cpi_computed: number | null;
  new_paid_subs: number | null;
  revenue: number | null;
  trials_teen: number | null;
  trials_parent: number | null;
  cac_computed: number | null;
  ltv_cac_computed: number | null;
  [key: string]: string | number | null | undefined;
}

interface TikTokReport {
  type: "tiktok";
  date: string;
  tiktok_spend: number;
  tiktok_spend_us: number;
  tiktok_spend_uk: number;
  tiktok_spend_row: number;
  teen_spend: number;
  teen_spend_us: number;
  teen_spend_uk: number;
  teen_spend_row: number;
  parent_spend: number;
  parent_spend_us: number;
  parent_spend_uk: number;
  parent_spend_row: number;
}

interface AppStoreReport {
  type: "appstore";
  date: string;
  adjust_total_installs: number;
  installs_us: number;
  installs_uk: number;
  installs_row: number;
}

type ParsedReport = TikTokReport | AppStoreReport;

const LS_KEY = "luna-v3-metrics-edits";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtGbp(v: number | null): string {
  if (v === null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-GB");
}

function fmtRatio(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(2)}x`;
}

function fmtCell(v: string | number | null | undefined, format: ColumnDef["format"]): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  switch (format) {
    case "gbp":    return fmtGbp(v);
    case "number": return fmtNum(v);
    case "ratio":  return fmtRatio(v);
    default:       return String(v);
  }
}

function sumOrNull(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1);
  const diff = d.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function labelPeriod(key: string, granularity: Granularity): string {
  if (granularity === "weekly") {
    const [yr, wk] = key.split("-W");
    return `W${wk} ${yr}`;
  }
  if (granularity === "monthly") {
    const [yr, mo] = key.split("-");
    const d = new Date(Number(yr), Number(mo) - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  if (granularity === "quarterly") {
    return key.replace("-", " ");
  }
  return key;
}

function applyEdits(row: DailyActualsRow, edits: Record<string, string>): DailyActualsRow {
  const result = { ...row };
  for (const col of DAILY_COLUMNS) {
    if (col.isComputed || col.key === "date") continue;
    const editKey = `${row.date}:${col.key}`;
    if (editKey in edits) {
      const raw = edits[editKey].trim();
      const num = parseFloat(raw.replace(/[£,]/g, ""));
      (result as Record<string, unknown>)[col.key] = raw === "" ? null : isNaN(num) ? null : num;
    }
  }
  return result;
}

// ── Report parsing ─────────────────────────────────────────────────────────────

async function parseTikTokReport(file: File): Promise<ParsedReport | null> {
  // Extract date from filename: "...2026-03-16 to 2026-03-16.xlsx"
  const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;
  const date = dateMatch[2]; // use end date

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  // Detect TikTok report: must have "Campaign name" and "Cost" columns
  if (!rows.length || !("Campaign name" in rows[0]) || !("Cost" in rows[0])) return null;

  let total = 0, totalUs = 0, totalUk = 0, totalRow = 0;
  let teen = 0, teenUs = 0, teenUk = 0, teenRow = 0;
  let parent = 0, parentUs = 0, parentUk = 0, parentRow = 0;

  for (const row of rows) {
    const name = String(row["Campaign name"] ?? "");
    // Skip summary row ("Total of X results")
    if (/^total of \d+/i.test(name)) continue;
    const cost = typeof row["Cost"] === "number" ? row["Cost"] : parseFloat(String(row["Cost"] ?? "0"));
    if (isNaN(cost) || cost <= 0) continue;

    // Detect country: look for " US" or "US " or "[US]" etc; same for UK; else ROW
    const isUs = /\bUS\b/.test(name);
    const isUk = /\bUK\b/.test(name);
    const isTeen = /teen|teens/i.test(name);
    const isParent = /parent|parents/i.test(name);

    total += cost;
    if (isUs) totalUs += cost;
    else if (isUk) totalUk += cost;
    else totalRow += cost;

    if (isTeen) {
      teen += cost;
      if (isUs) teenUs += cost;
      else if (isUk) teenUk += cost;
      else teenRow += cost;
    }
    if (isParent) {
      parent += cost;
      if (isUs) parentUs += cost;
      else if (isUk) parentUk += cost;
      else parentRow += cost;
    }
  }

  return {
    type: "tiktok", date,
    tiktok_spend: total, tiktok_spend_us: totalUs, tiktok_spend_uk: totalUk, tiktok_spend_row: totalRow,
    teen_spend: teen, teen_spend_us: teenUs, teen_spend_uk: teenUk, teen_spend_row: teenRow,
    parent_spend: parent, parent_spend_us: parentUs, parent_spend_uk: parentUk, parent_spend_row: parentRow,
  };
}

// ── App Store Connect CSV parser ───────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

async function parseAppStoreReport(file: File): Promise<AppStoreReport[] | null> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Find header row starting with "Date,"
  const headerIdx = lines.findIndex((l) => l.startsWith("Date,"));
  if (headerIdx === -1) return null;

  const headers = parseCSVLine(lines[headerIdx]);
  const dataLines = lines.slice(headerIdx + 1);
  if (!dataLines.length) return null;

  const results: AppStoreReport[] = [];
  for (const line of dataLines) {
    const vals = parseCSVLine(line);
    if (!vals[0]) continue;

    // Parse date: M/D/YY or M/D/YYYY
    const m = vals[0].match(/^(\d+)\/(\d+)\/(\d+)$/);
    if (!m) continue;
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    const date = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;

    let total = 0, us = 0, uk = 0, row = 0;
    for (let i = 1; i < headers.length; i++) {
      const v = parseFloat(vals[i] ?? "0") || 0;
      if (v <= 0) continue;
      total += v;
      if (headers[i].includes("United States")) us += v;
      else if (headers[i].includes("United Kingdom")) uk += v;
      else row += v;
    }

    results.push({
      type: "appstore",
      date,
      adjust_total_installs: Math.round(total),
      installs_us: Math.round(us),
      installs_uk: Math.round(uk),
      installs_row: Math.round(row),
    });
  }

  return results.length > 0 ? results : null;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function groupRows(rows: DailyActualsRow[], granularity: Granularity, projectedLtv: number | null): AggregatedRow[] {
  if (granularity === "daily") {
    return rows.map((r) => {
      const cpi = r.tiktok_spend !== null && r.adjust_total_installs
        ? r.tiktok_spend / r.adjust_total_installs : null;
      const cac = r.tiktok_spend !== null && r.new_paid_subs
        ? r.tiktok_spend / r.new_paid_subs : null;
      const ltv_cac = cac !== null && projectedLtv !== null && cac > 0
        ? projectedLtv / cac : null;
      return {
        periodLabel: r.date,
        date: r.date,
        tiktok_spend: r.tiktok_spend,
        tiktok_spend_us: r.tiktok_spend_us,
        tiktok_spend_uk: r.tiktok_spend_uk,
        tiktok_spend_row: r.tiktok_spend_row,
        google_spend: r.google_spend,
        meta_spend: r.meta_spend,
        teen_spend: r.teen_spend,
        teen_spend_us: r.teen_spend_us,
        teen_spend_uk: r.teen_spend_uk,
        teen_spend_row: r.teen_spend_row,
        parent_spend: r.parent_spend,
        parent_spend_us: r.parent_spend_us,
        parent_spend_uk: r.parent_spend_uk,
        parent_spend_row: r.parent_spend_row,
        adjust_total_installs: r.adjust_total_installs,
        installs_us: r.installs_us,
        installs_uk: r.installs_uk,
        installs_row: r.installs_row,
        cpi_computed: cpi,
        new_paid_subs: r.new_paid_subs,
        revenue: r.revenue,
        trials_teen: r.trials_teen,
        trials_parent: r.trials_parent,
        cac_computed: cac,
        ltv_cac_computed: ltv_cac,
      };
    });
  }

  const groups = new Map<string, DailyActualsRow[]>();
  for (const r of rows) {
    const d = parseDate(r.date);
    const key =
      granularity === "weekly" ? isoWeek(d)
      : granularity === "monthly" ? isoMonth(d)
      : isoQuarter(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const spend    = sumOrNull(group.map((r) => r.tiktok_spend));
    const installs = sumOrNull(group.map((r) => r.adjust_total_installs));
    const subs     = sumOrNull(group.map((r) => r.new_paid_subs));
    const cpi  = spend !== null && installs ? spend / installs : null;
    const cac  = spend !== null && subs     ? spend / subs     : null;
    const ltv_cac = cac !== null && projectedLtv !== null && cac > 0
      ? projectedLtv / cac : null;
    return {
      periodLabel: labelPeriod(key, granularity),
      tiktok_spend:          spend,
      tiktok_spend_us:       sumOrNull(group.map((r) => r.tiktok_spend_us)),
      tiktok_spend_uk:       sumOrNull(group.map((r) => r.tiktok_spend_uk)),
      tiktok_spend_row:      sumOrNull(group.map((r) => r.tiktok_spend_row)),
      google_spend:          sumOrNull(group.map((r) => r.google_spend)),
      meta_spend:            sumOrNull(group.map((r) => r.meta_spend)),
      teen_spend:            sumOrNull(group.map((r) => r.teen_spend)),
      teen_spend_us:         sumOrNull(group.map((r) => r.teen_spend_us)),
      teen_spend_uk:         sumOrNull(group.map((r) => r.teen_spend_uk)),
      teen_spend_row:        sumOrNull(group.map((r) => r.teen_spend_row)),
      parent_spend:          sumOrNull(group.map((r) => r.parent_spend)),
      parent_spend_us:       sumOrNull(group.map((r) => r.parent_spend_us)),
      parent_spend_uk:       sumOrNull(group.map((r) => r.parent_spend_uk)),
      parent_spend_row:      sumOrNull(group.map((r) => r.parent_spend_row)),
      adjust_total_installs: installs,
      installs_us:           sumOrNull(group.map((r) => r.installs_us)),
      installs_uk:           sumOrNull(group.map((r) => r.installs_uk)),
      installs_row:          sumOrNull(group.map((r) => r.installs_row)),
      cpi_computed:          cpi,
      new_paid_subs:         subs,
      revenue:               sumOrNull(group.map((r) => r.revenue)),
      trials_teen:           sumOrNull(group.map((r) => r.trials_teen)),
      trials_parent:         sumOrNull(group.map((r) => r.trials_parent)),
      cac_computed:          cac,
      ltv_cac_computed:      ltv_cac,
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ col }: { col: ColumnDef }) {
  if (col.isComputed) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-400">
        Computed
      </span>
    );
  }
  if (!col.sourceUrl) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-400">
        {col.source}
      </span>
    );
  }
  return (
    <a
      href={col.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
    >
      {col.source}
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3M11 1L6 6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

// ── Upload Zone (multi-file) ───────────────────────────────────────────────────

type FileResult =
  | { status: "parsing"; name: string }
  | { status: "ready";   name: string; reports: ParsedReport[] }
  | { status: "error";   name: string; error: string };

type UploadPhase = "idle" | "reviewing" | "applied";

function ReportUploadZone({ onApply }: { onApply: (reports: ParsedReport[]) => void }) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [files, setFiles] = useState<FileResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const accepted = rawFiles.filter((f) =>
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv")
    );
    if (!accepted.length) return;

    setFiles(accepted.map((f) => ({ status: "parsing", name: f.name })));
    setPhase("reviewing");

    const results = await Promise.all(
      accepted.map(async (f): Promise<FileResult> => {
        try {
          if (f.name.endsWith(".csv")) {
            const reports = await parseAppStoreReport(f);
            if (!reports) return { status: "error", name: f.name, error: "Unrecognised CSV format — expected App Store Connect downloads report." };
            return { status: "ready", name: f.name, reports };
          } else {
            const report = await parseTikTokReport(f);
            if (!report) return { status: "error", name: f.name, error: "Unrecognised format — needs a date in filename and Campaign Report columns." };
            return { status: "ready", name: f.name, reports: [report] };
          }
        } catch (e) {
          return { status: "error", name: f.name, error: String(e) };
        }
      })
    );
    setFiles(results);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const readyFiles = files.filter((f): f is Extract<FileResult, { status: "ready" }> => f.status === "ready");
  const isParsing = files.some((f) => f.status === "parsing");
  const totalReports = readyFiles.reduce((s, f) => s + f.reports.length, 0);

  // ── Applied summary ──
  if (phase === "applied") {
    return (
      <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
        <p className="text-sm text-green-800">
          <span className="font-semibold">{readyFiles.length} file{readyFiles.length !== 1 ? "s" : ""} applied</span>
          {" — "}
          {totalReports} date{totalReports !== 1 ? "s" : ""} updated
        </p>
        <button onClick={() => { setPhase("idle"); setFiles([]); }} className="ml-auto text-xs text-green-600 hover:text-green-800">
          Upload more
        </button>
      </div>
    );
  }

  // ── Review list ──
  if (phase === "reviewing") {
    return (
      <div className="mb-5 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">
            {isParsing ? "Reading files…" : `${readyFiles.length} of ${files.length} file${files.length !== 1 ? "s" : ""} ready`}
          </p>
          <button onClick={() => { setPhase("idle"); setFiles([]); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>

        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
          {files.map((f, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              {f.status === "parsing" && (
                <svg className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {f.status === "ready" && (
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
              {f.status === "error" && (
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 truncate">{f.name}</p>
                {f.status === "ready" && (() => {
                  const first = f.reports[0];
                  if (first.type === "tiktok") {
                    const r = first as TikTokReport;
                    return <p className="text-[10px] text-gray-400">{r.date} · {fmtGbp(r.tiktok_spend)} total · Teen {fmtGbp(r.teen_spend)} · Parent {fmtGbp(r.parent_spend)}</p>;
                  } else {
                    const total = f.reports.reduce((s, r) => s + (r.type === "appstore" ? r.adjust_total_installs : 0), 0);
                    return <p className="text-[10px] text-gray-400">{f.reports.length} dates · {fmtNum(total)} installs · US + UK + ROW</p>;
                  }
                })()}
                {f.status === "error" && <p className="text-[10px] text-red-400">{f.error}</p>}
              </div>
            </div>
          ))}
        </div>

        {!isParsing && readyFiles.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            <button
              onClick={() => {
                onApply(readyFiles.flatMap((f) => f.reports));
                setPhase("applied");
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
            >
              Apply {readyFiles.length} file{readyFiles.length !== 1 ? "s" : ""} to sheet
            </button>
            <span className="text-[11px] text-gray-400">
              Fills TikTok Spend, Teen Spend, Parent Spend for each date
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Idle drop zone ──
  return (
    <div
      className={`mb-5 border-2 border-dashed rounded-xl px-5 py-4 transition-all cursor-pointer ${
        dragging ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) processFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-violet-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Upload reports to fill in data</p>
          <p className="text-xs text-gray-400 mt-0.5">TikTok Campaign Reports (.xlsx) or App Store Connect downloads (.csv) — all dates auto-fill</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MetricsView({ dailyRows, projectedLtv }: Props) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<{ date: string; colKey: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setEdits(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const editedRows = useMemo(
    () => dailyRows.map((r) => applyEdits(r, edits)),
    [dailyRows, edits]
  );

  const displayRows = useMemo(
    () => groupRows([...editedRows].reverse(), granularity, projectedLtv),
    [editedRows, granularity, projectedLtv]
  );

  const GRANULARITIES: Granularity[] = ["daily", "weekly", "monthly", "quarterly"];

  const startEdit = useCallback((date: string, colKey: string, currentDisplay: string) => {
    setEditingCell({ date, colKey });
    const raw = currentDisplay === "—" ? "" : currentDisplay.replace(/[£,x]/g, "");
    setEditingValue(raw);
  }, []);

  const commitEdit = useCallback((date: string, colKey: string, value: string) => {
    setEditingCell(null);
    const newEdits = { ...edits, [`${date}:${colKey}`]: value };
    if (value.trim() === "") delete newEdits[`${date}:${colKey}`];
    setEdits(newEdits);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newEdits)); } catch { /* ignore */ }

    const raw = value.trim();
    const num = raw === "" ? null : parseFloat(raw.replace(/[£,]/g, ""));
    fetch("/api/v3/save-edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, fields: { [colKey]: raw === "" || isNaN(num as number) ? null : num } }),
    }).catch(() => { /* non-blocking */ });
  }, [edits]);

  const applyReport = useCallback((reports: ParsedReport[]) => {
    const newEdits = { ...edits };
    for (const r of reports) {
      if (r.type === "tiktok") {
        newEdits[`${r.date}:tiktok_spend`]     = String(r.tiktok_spend);
        newEdits[`${r.date}:tiktok_spend_us`]  = String(r.tiktok_spend_us);
        newEdits[`${r.date}:tiktok_spend_uk`]  = String(r.tiktok_spend_uk);
        newEdits[`${r.date}:tiktok_spend_row`] = String(r.tiktok_spend_row);
        newEdits[`${r.date}:teen_spend`]       = String(r.teen_spend);
        newEdits[`${r.date}:teen_spend_us`]    = String(r.teen_spend_us);
        newEdits[`${r.date}:teen_spend_uk`]    = String(r.teen_spend_uk);
        newEdits[`${r.date}:teen_spend_row`]   = String(r.teen_spend_row);
        newEdits[`${r.date}:parent_spend`]     = String(r.parent_spend);
        newEdits[`${r.date}:parent_spend_us`]  = String(r.parent_spend_us);
        newEdits[`${r.date}:parent_spend_uk`]  = String(r.parent_spend_uk);
        newEdits[`${r.date}:parent_spend_row`] = String(r.parent_spend_row);
      } else {
        newEdits[`${r.date}:adjust_total_installs`] = String(r.adjust_total_installs);
        newEdits[`${r.date}:installs_us`]           = String(r.installs_us);
        newEdits[`${r.date}:installs_uk`]           = String(r.installs_uk);
        newEdits[`${r.date}:installs_row`]          = String(r.installs_row);
      }
    }
    setEdits(newEdits);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newEdits)); } catch { /* ignore */ }

    const payloads = reports.map((r) => ({
      date: r.date,
      fields: r.type === "tiktok"
        ? {
            tiktok_spend: r.tiktok_spend, tiktok_spend_us: r.tiktok_spend_us, tiktok_spend_uk: r.tiktok_spend_uk, tiktok_spend_row: r.tiktok_spend_row,
            teen_spend: r.teen_spend, teen_spend_us: r.teen_spend_us, teen_spend_uk: r.teen_spend_uk, teen_spend_row: r.teen_spend_row,
            parent_spend: r.parent_spend, parent_spend_us: r.parent_spend_us, parent_spend_uk: r.parent_spend_uk, parent_spend_row: r.parent_spend_row,
          }
        : {
            adjust_total_installs: r.adjust_total_installs, installs_us: r.installs_us, installs_uk: r.installs_uk, installs_row: r.installs_row,
          },
    }));
    fetch("/api/v3/save-edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads),
    }).catch(() => { /* non-blocking */ });
  }, [edits]);

  const colCount = DAILY_COLUMNS.length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">V3</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Metrics</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daily actuals. Click any cell to edit.{" "}
          {projectedLtv !== null && (
            <span className="text-amber-600">Projected LTV: {fmtGbp(projectedLtv)}</span>
          )}
        </p>
      </div>

      {/* Report upload zone */}
      <ReportUploadZone onApply={applyReport} />

      {/* Granularity tabs */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                granularity === g
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {granularity !== "daily" && (
          <span className="text-[11px] text-gray-400 italic">
            Read-only in {granularity} view — edit in Daily
          </span>
        )}
        {Object.keys(edits).length > 0 && (
          <button
            onClick={() => {
              setEdits({});
              try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
            }}
            className="ml-auto text-[11px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Clear all edits ({Object.keys(edits).length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: colCount * 120 }}>
            <thead>
              {/* Row 1: Column names */}
              <tr className="border-b border-gray-100">
                {DAILY_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 pt-3 pb-1 text-left text-xs font-semibold whitespace-nowrap ${
                      col.isCore
                        ? "bg-amber-50 text-amber-800"
                        : col.requiredMissing
                        ? "bg-amber-50/60 text-gray-700"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {col.label}
                    {col.requiredMissing && (
                      <span className="ml-1 text-amber-500" title="Missing — needed for CAC/LTV">●</span>
                    )}
                    {col.isCore && (
                      <span className="ml-1 text-amber-600" title="Core metric">★</span>
                    )}
                  </th>
                ))}
              </tr>

              {/* Row 2: Definitions */}
              <tr className="border-b border-gray-100">
                {DAILY_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 text-left align-top ${
                      col.isCore ? "bg-amber-50/60" : col.requiredMissing ? "bg-amber-50/40" : "bg-gray-50/50"
                    }`}
                  >
                    <p className="text-[10px] text-gray-500 leading-relaxed max-w-[180px]">
                      {col.definition}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Row 3: Source badges */}
              <tr className="border-b-2 border-gray-200">
                {DAILY_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 ${
                      col.isCore ? "bg-amber-50/60" : col.requiredMissing ? "bg-amber-50/40" : "bg-gray-50/50"
                    }`}
                  >
                    <SourceBadge col={col} />
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, ri) => (
                <tr
                  key={row.periodLabel}
                  className={`border-b border-gray-50 ${ri % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                >
                  {DAILY_COLUMNS.map((col) => {
                    const isDaily = granularity === "daily";
                    const isEditable = isDaily && !col.isComputed && col.key !== "date";
                    const isEditing = isEditable && editingCell?.date === row.date && editingCell?.colKey === col.key;

                    const rawVal = col.key === "date"
                      ? row.periodLabel
                      : (row[col.key] as number | null);

                    const displayVal = col.key === "date"
                      ? row.periodLabel
                      : fmtCell(rawVal as number | null, col.format);

                    const isEmpty = rawVal === null && col.key !== "date";
                    const isRequiredMissing = isEmpty && REQUIRED_MISSING_KEYS.has(col.key);
                    const isEdited = row.date && edits[`${row.date}:${col.key}`] !== undefined;

                    return (
                      <td
                        key={col.key}
                        onClick={() => {
                          if (isEditable && !isEditing) {
                            startEdit(row.date!, col.key, displayVal);
                          }
                        }}
                        className={`px-0 py-0 text-xs tabular-nums whitespace-nowrap relative ${
                          col.isCore
                            ? "font-semibold text-amber-800 bg-amber-50/40"
                            : isRequiredMissing
                            ? "bg-amber-100/60 text-amber-600"
                            : "text-gray-700"
                        } ${isEditable && !isEditing ? "cursor-text hover:bg-violet-50/60 transition-colors" : ""}`}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitEdit(row.date!, col.key, editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(row.date!, col.key, editingValue);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full px-3 py-2 bg-violet-50 border-2 border-violet-400 outline-none text-xs text-gray-900 tabular-nums"
                            style={{ minWidth: 80 }}
                          />
                        ) : (
                          <span className="block px-3 py-2">
                            {displayVal}
                            {isEdited && (
                              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400 inline-block align-middle" title="Manually edited" />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            {displayRows.length} {granularity} row{displayRows.length !== 1 ? "s" : ""} · most recent first
          </p>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-300 inline-block" />
              Missing data
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              Edited
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
