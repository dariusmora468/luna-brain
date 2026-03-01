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
