import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// POST /api/import/revenue — import revenue segmentation CSVs
// Accepts: revenues-by-stores, revenues-by-country, revenues-by-plans
export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results: Record<string, { rows: number; error?: string }> = {};

    for (const file of files) {
      const text = await file.text();
      const name = file.name.toLowerCase();

      try {
        if (name.includes("stores")) {
          const count = await importStores(supabase, text);
          results["stores"] = { rows: count };
        } else if (name.includes("country")) {
          const count = await importCountry(supabase, text);
          results["country"] = { rows: count };
        } else if (name.includes("plans")) {
          const count = await importPlans(supabase, text);
          results["plans"] = { rows: count };
        } else {
          results[file.name] = { rows: 0, error: "Unrecognized file type" };
        }
      } catch (err: unknown) {
        results[file.name] = { rows: 0, error: err instanceof Error ? err.message : "Parse error" };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function safeFloat(val: string): number {
  if (!val || val.trim() === "") return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importStores(supabase: any, text: string): Promise<number> {
  const { rows } = parseCSV(text);
  let count = 0;

  for (const row of rows) {
    const date = row["Period"];
    if (!date) continue;

    const apple = safeFloat(row["apple"]);
    const google = safeFloat(row["google"]);

    const { error } = await supabase
      .from("metrics")
      .update({
        apple_revenue_gbp: apple,
        google_revenue_gbp: google,
        total_revenue_gbp: Math.round((apple + google) * 100) / 100,
      })
      .eq("client_id", "luna")
      .eq("date", date);

    if (!error) count++;
  }
  return count;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importCountry(supabase: any, text: string): Promise<number> {
  const { headers, rows } = parseCSV(text);
  let count = 0;

  for (const row of rows) {
    const date = row["Period"];
    if (!date) continue;

    let ukRev = 0;
    let usRev = 0;

    for (const h of headers) {
      if (h === "Period") continue;
      const val = safeFloat(row[h]);
      const lower = h.toLowerCase();
      if (lower.includes("united kingdom") || lower === "uk" || lower === "gb") {
        ukRev += val;
      } else if (lower.includes("united states") || lower === "us" || lower === "usa") {
        usRev += val;
      }
    }

    const { error } = await supabase
      .from("metrics")
      .update({
        gb_revenue_gbp: Math.round(ukRev * 100) / 100,
        us_revenue_gbp: Math.round(usRev * 100) / 100,
      })
      .eq("client_id", "luna")
      .eq("date", date);

    if (!error) count++;
  }
  return count;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importPlans(supabase: any, text: string): Promise<number> {
  const { headers, rows } = parseCSV(text);
  let count = 0;

  for (const row of rows) {
    const date = row["Period"];
    if (!date) continue;

    let parentRevenue = 0;
    let teenRevenue = 0;
    let revParentAnnual = 0;
    let revParentMonthly = 0;
    let revTeenAnnual = 0;
    let revTeenMonthly = 0;
    let revTeenWeekly = 0;

    for (const h of headers) {
      if (h === "Period") continue;
      const val = safeFloat(row[h]);
      if (val === 0) continue;

      const lower = h.toLowerCase();
      const isParent = lower.includes("parent");
      const isAnnual = lower.includes("annual");
      const isWeekly = lower.includes("weekly");
      // Everything else is monthly

      if (isParent) {
        parentRevenue += val;
        if (isAnnual) {
          revParentAnnual += val;
        } else {
          revParentMonthly += val;
        }
      } else {
        teenRevenue += val;
        if (isAnnual) {
          revTeenAnnual += val;
        } else if (isWeekly) {
          revTeenWeekly += val;
        } else {
          revTeenMonthly += val;
        }
      }
    }

    const { error } = await supabase
      .from("metrics")
      .update({
        parent_revenue_gbp: Math.round(parentRevenue * 100) / 100,
        teen_revenue_gbp: Math.round(teenRevenue * 100) / 100,
        rev_parent_annual_gbp: Math.round(revParentAnnual * 100) / 100,
        rev_parent_monthly_gbp: Math.round(revParentMonthly * 100) / 100,
        rev_teen_annual_gbp: Math.round(revTeenAnnual * 100) / 100,
        rev_teen_monthly_gbp: Math.round(revTeenMonthly * 100) / 100,
        rev_teen_weekly_gbp: Math.round(revTeenWeekly * 100) / 100,
      })
      .eq("client_id", "luna")
      .eq("date", date);

    if (!error) count++;
  }
  return count;
}
