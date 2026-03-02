import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch last 90 days
  const { data: metrics, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: false })
    .limit(90);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = metrics?.[0] ?? null;
  const yesterday = metrics?.[1] ?? null;
  const history = (metrics ?? []).reverse();

  return NextResponse.json({ today, yesterday, history });
}

// PATCH: Update specific fields for a date (cell edit)
export async function PATCH(request: Request) {
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, updates } = await request.json();

    if (!date || !updates || typeof updates !== "object") {
      return NextResponse.json({ error: "date and updates required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("metrics")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("client_id", "luna")
      .eq("date", date);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, date, updated: Object.keys(updates) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Create a new empty row for a date
export async function PUT(request: Request) {
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await request.json();

    if (!row.date || !row.client_id) {
      return NextResponse.json({ error: "date and client_id required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("metrics")
      .upsert(
        { ...row, computed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "client_id,date" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, date: row.date });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
