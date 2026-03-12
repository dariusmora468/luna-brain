import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerClient } from "@/lib/supabase";

// Sheet name → tab id mapping
const SHEET_MAP: { sheetName: string; tab: string; headerRow: number }[] = [
  { sheetName: "Daily Actuals", tab: "daily_actuals", headerRow: 1 },       // row 0 = group labels, row 1 = headers
  { sheetName: "Experiment Log", tab: "experiment_log", headerRow: 0 },     // row 0 = headers
  { sheetName: "Monthly Metric", tab: "monthly_metric", headerRow: 1 },     // row 0 = group labels, row 1 = headers
];

function sheetToRows(
  sheet: XLSX.WorkSheet,
  headerRow: number
): Record<string, string>[] {
  // Get all rows as array-of-arrays (no auto header detection)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false, // format dates as strings
  });

  if (raw.length <= headerRow) return [];

  const headers = (raw[headerRow] as unknown[]).map((h) =>
    h != null ? String(h).trim() : ""
  );

  const dataRows: Record<string, string>[] = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const rowArr = raw[i] as unknown[];
    const obj: Record<string, string> = {};
    let hasValue = false;
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      const val = rowArr[j] != null ? String(rowArr[j]).trim() : "";
      obj[key] = val;
      if (val !== "") hasValue = true;
    }
    if (hasValue) dataRows.push(obj);
  }
  return dataRows;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileBlob = file as File;
    if (
      !fileBlob.name.endsWith(".xlsx") &&
      !fileBlob.name.endsWith(".xls") &&
      fileBlob.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return NextResponse.json(
        { error: "Please upload an .xlsx file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

    const supabase = createServerClient();
    const results: Record<string, { rows_imported: number; found: boolean }> = {};

    for (const { sheetName, tab, headerRow } of SHEET_MAP) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        results[tab] = { rows_imported: 0, found: false };
        continue;
      }

      const rows = sheetToRows(sheet, headerRow);
      if (rows.length === 0) {
        results[tab] = { rows_imported: 0, found: true };
        continue;
      }

      // Delete existing rows for this tab
      const { error: deleteError } = await supabase
        .from("v2_sheet_rows")
        .delete()
        .eq("tab", tab);

      if (deleteError) {
        return NextResponse.json(
          { error: `Failed to clear ${tab}: ${deleteError.message}` },
          { status: 500 }
        );
      }

      // Insert rows in batches of 500
      const inserts = rows.map((data, i) => ({
        tab,
        row_index: i,
        data,
        imported_at: new Date().toISOString(),
      }));

      const BATCH = 500;
      for (let i = 0; i < inserts.length; i += BATCH) {
        const { error: insertError } = await supabase
          .from("v2_sheet_rows")
          .insert(inserts.slice(i, i + BATCH));
        if (insertError) {
          return NextResponse.json(
            { error: `Failed to insert ${tab} rows: ${insertError.message}` },
            { status: 500 }
          );
        }
      }

      results[tab] = { rows_imported: rows.length, found: true };
    }

    const totalRows = Object.values(results).reduce(
      (sum, r) => sum + r.rows_imported,
      0
    );

    return NextResponse.json({
      success: true,
      results,
      total_rows_imported: totalRows,
    });
  } catch (err) {
    console.error("V2 xlsx import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
