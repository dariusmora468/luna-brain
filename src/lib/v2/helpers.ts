// ============================================================
// luna Brain V2 — Helpers
// ============================================================

/** Parse a numeric value from a sheet cell (handles £, %, commas, empty). Returns null if empty. */
export function num(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).replace(/[£%,\s]/g, "").trim();
  if (s === "" || s === "-" || s === "N/A" || s === "n/a") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Normalize a percentage value that may be stored as either a decimal (0.75)
 * or a whole number (75). Heuristic: if 0 < val ≤ 1, multiply by 100.
 * Values like 75.3 pass through unchanged. Values like 0.753 become 75.3.
 */
export function normalizePct(val: number | null): number | null {
  if (val === null || val === undefined) return null;
  if (val > 0 && val <= 1) return val * 100;
  return val;
}

/** Format a number as GBP currency string. */
export function fmtGBP(val: number | null, decimals = 0): string {
  if (val === null || val === undefined) return "—";
  return `£${val.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Format a number with commas. */
export function fmtNum(val: number | null, decimals = 0): string {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Format a number as a percentage. */
export function fmtPct(val: number | null, decimals = 1): string {
  if (val === null || val === undefined) return "—";
  return `${val.toFixed(decimals)}%`;
}

/** Format a multiplier (e.g. 2.3x). */
export function fmtX(val: number | null, decimals = 1): string {
  if (val === null || val === undefined) return "—";
  return `${val.toFixed(decimals)}x`;
}

/** Return the display value, or "—" if null/empty. */
export function dash(val: unknown): string {
  if (val === null || val === undefined) return "—";
  const s = String(val).trim();
  if (s === "" || s === "-" || s === "N/A" || s === "n/a") return "—";
  return s;
}

/** Calculate percentage change between two values. Returns null if either is null. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Format a percentage change with + or - prefix and arrow. */
export function fmtChange(pct: number | null): { text: string; positive: boolean | null } {
  if (pct === null) return { text: "—", positive: null };
  const positive = pct >= 0;
  return {
    text: `${positive ? "+" : ""}${pct.toFixed(1)}%`,
    positive,
  };
}

/**
 * Parse a date string from sheet format to YYYY-MM-DD.
 *
 * Supported formats (in priority order):
 *  1. YYYY-MM-DD (ISO — always preferred, set sheet locale or use TEXT() formula)
 *  2. DD/MM/YYYY (UK slash format — the only slash format supported)
 *  3. Natural language: "Jan 1, 2026", "1 Jan 2026" etc.
 *
 * NOTE: MM/DD/YYYY (US slash format) is NOT supported because it is
 * indistinguishable from DD/MM/YYYY. Export your sheet in ISO format.
 */
export function parseSheetDate(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === "-") return null;

  // 1. ISO format YYYY-MM-DD — pass through directly (no timezone risk)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // 2. DD/MM/YYYY (UK format only — US MM/DD is visually identical, not supported)
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  // 3. Natural language: "Jan 1, 2026" or "1 Jan 2026" etc.
  // Parse manually to avoid UTC midnight timezone shift from new Date(string).
  // The built-in parser can push a date back by 1 day for users west of UTC.
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  // "Jan 15, 2026" or "January 15, 2026"
  const m1 = s.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m1) {
    const month = months[m1[1].toLowerCase().slice(0, 3)];
    if (month) {
      return `${m1[3]}-${String(month).padStart(2, "0")}-${m1[2].padStart(2, "0")}`;
    }
  }
  // "15 Jan 2026" or "15 January 2026"
  const m2 = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (m2) {
    const month = months[m2[2].toLowerCase().slice(0, 3)];
    if (month) {
      return `${m2[3]}-${String(month).padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
    }
  }

  return null;
}

/** Get first available value from a row object by trying multiple key names. */
export function firstVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}
