import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { parseDailyActualsRow } from "@/lib/v2/parsers";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("v2_sheet_rows")
    .select("row_index, data")
    .eq("tab", "daily_actuals")
    .order("row_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? [])
    .map((r) => parseDailyActualsRow(r.data as Record<string, string>))
    .filter(Boolean);

  return NextResponse.json(rows);
}
