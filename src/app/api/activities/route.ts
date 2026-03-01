import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET /api/activities — list activities with optional filters
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = supabase
    .from("activities")
    .select("*", { count: "exact" })
    .eq("client_id", "luna")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [], total: count ?? 0 });
}

// POST /api/activities — create a new activity
export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    const body = await request.json();
    const { date, category, title, description, created_by } = body;

    if (!date || !category || !title) {
      return NextResponse.json(
        { error: "date, category, and title are required" },
        { status: 400 }
      );
    }

    const validCategories = ["campaign", "paywall", "product", "aso", "growth", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("activities")
      .insert({
        client_id: "luna",
        date,
        category,
        title,
        description: description || null,
        created_by: created_by || null,
        auto_detected: false,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activity: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
