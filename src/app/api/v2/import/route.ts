import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createServerClient } from "@/lib/supabase";

const VALID_TABS = ["daily_actuals", "experiment_log", "weekly_summary", "monthly_metric"] as const;
type TabName = (typeof VALID_TABS)[number];

/**
 * Columns we expect to find in each tab (by the canonical header name).
 * These are checked against the actual CSV headers after upload.
 * Missing columns are surfaced as warnings on the import page — not errors.
 */
const EXPECTED_COLUMNS: Record<TabName, string[]> = {
  daily_actuals: [
    "Date",
    "TikTok Spend (£)",
    "Adjust Total Installs",
    "New Paid Subs",
    "Revenue (£)",
    "MRR (£)",
  ],
  experiment_log: [
    "Experiment Name",
    "Status",
    "Start Date",
    "End Date",
    "Hypothesis",
    "Result",
    "Decision",
  ],
  weekly_summary: [
    "Week Ending",
    "Spend (£) TW",
    "Installs TW",
    "New Paid Subs TW",
  ],
  monthly_metric: [
    "Month",
    "MRR (£)",
    "ARR (£)",
    "Net New Paid Subs",
    "Monthly Churn %",
    "Teen Ad Spend (£)",
    "Teen CPI (£)",
    "Parent Ad Spend (£)",
    "Parent CPI (£)",
    "Teen LTV:CAC",
    "Parent LTV:CAC",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") as TabName;

    if (!tab || !VALID_TABS.includes(tab)) {
      return NextResponse.json(
        { error: `Invalid tab. Must be one of: ${VALID_TABS.join(", ")}` },
        { status: 400 }
      );
    }

    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
    }

    // Parse CSV
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (result.errors.length > 0) {
      const serious = result.errors.filter((e) => e.type === "Delimiter" || e.type === "FieldMismatch");
      if (serious.length > 0) {
        return NextResponse.json(
          { error: `CSV parse errors: ${serious.map((e) => e.message).join("; ")}` },
          { status: 400 }
        );
      }
    }

    const rows = result.data.filter((r) => {
      // Skip rows that are entirely empty
      return Object.values(r).some((v) => v && v.trim() !== "");
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found in CSV" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Delete existing rows for this tab
    const { error: deleteError } = await supabase
      .from("v2_sheet_rows")
      .delete()
      .eq("tab", tab);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to clear existing data: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Insert new rows
    const inserts = rows.map((data, i) => ({
      tab,
      row_index: i,
      data,
      imported_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("v2_sheet_rows")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to insert rows: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Identify expected columns that are absent from this CSV's headers
    const foundHeaders = new Set((result.meta.fields ?? []).map((h) => h.trim()));
    const missingExpectedColumns = (EXPECTED_COLUMNS[tab] ?? []).filter(
      (col) => !foundHeaders.has(col)
    );

    return NextResponse.json({
      success: true,
      tab,
      rows_imported: rows.length,
      headers: result.meta.fields ?? [],
      missing_expected_columns: missingExpectedColumns,
    });
  } catch (err) {
    console.error("V2 import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Return import status (row counts + last imported times per tab)
  const supabase = createServerClient();

  const status: Record<string, { count: number; last_imported: string | null }> = {};

  for (const tab of VALID_TABS) {
    const { data, error } = await supabase
      .from("v2_sheet_rows")
      .select("imported_at")
      .eq("tab", tab)
      .order("imported_at", { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from("v2_sheet_rows")
      .select("id", { count: "exact", head: true })
      .eq("tab", tab);

    status[tab] = {
      count: count ?? 0,
      last_imported: data?.[0]?.imported_at ?? null,
    };
  }

  return NextResponse.json(status);
}
