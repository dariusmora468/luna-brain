// ============================================================
// luna Brain — Utility Functions
// ============================================================

/**
 * Format a number as GBP currency
 */
export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-GB").format(value);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number | null, decimals: number = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a decimal (like ROAS)
 */
export function formatDecimal(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

/**
 * Calculate percentage change between two values
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0 || previous === null || previous === undefined) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Get trend direction and color
 */
export function getTrend(
  change: number | null,
  invertColors: boolean = false
): { direction: "up" | "down" | "flat"; color: string; arrow: string } {
  if (change === null || Math.abs(change) < 0.5) {
    return { direction: "flat", color: "text-gray-400", arrow: "→" };
  }
  if (change > 0) {
    return {
      direction: "up",
      color: invertColors ? "text-red-400" : "text-emerald-400",
      arrow: "↑",
    };
  }
  return {
    direction: "down",
    color: invertColors ? "text-emerald-400" : "text-red-400",
    arrow: "↓",
  };
}

/**
 * Format a value based on its type
 */
export function formatValue(
  value: number | null,
  format: "currency" | "number" | "decimal" | "percent"
): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "number":
      return formatNumber(value);
    case "decimal":
      return formatDecimal(value);
    case "percent":
      return formatPercent(value);
    default:
      return String(value ?? "—");
  }
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD
 */
export function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Format date for display (e.g., "Feb 27")
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

/**
 * Format date for display (e.g., "27 February 2026")
 */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
