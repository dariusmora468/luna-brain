import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// POST /api/v3/save-edits
// Body: { date: string, fields: Record<string, number | null> }
// Upserts field values into v3_daily_edits for the given date.
// Multiple dates can be sent as an array for batch saves.

interface EditPayload {
  date: string;
  fields: Record<string, number | null>;
}

export async function POST(req: NextRequest) {

  const body = await req.json();

  // Accept single object or array
  const payloads: EditPayload[] = Array.isArray(body) ? body : [body];

  if (!payloads.length) return NextResponse.json({ ok: true });

  const supabase = createServerClient();

  // Upsert each date — merge new fields into existing data
  const upserts = payloads.map((p) => ({
    date: p.date,
    data: p.fields,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("v3_daily_edits")
    .upsert(upserts, { onConflict: "date", ignoreDuplicates: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, saved: payloads.length });
}
