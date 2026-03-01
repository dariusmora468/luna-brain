import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerClient();

  const { data: metrics, error } = await supabase
    .from("metrics")
    .select("date, tiktok_installs, total_trials, new_subscriptions, tiktok_spend_gbp, total_revenue_gbp, cost_per_install_gbp, cost_per_trial_gbp, cost_per_subscriber_gbp, roas_7d, install_to_trial_cr")
    .eq("client_id", "luna")
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: activities } = await supabase
    .from("activities")
    .select("date, category, title")
    .eq("client_id", "luna")
    .order("date", { ascending: true });

  return NextResponse.json({
    totalMetricRows: metrics?.length ?? 0,
    totalActivities: activities?.length ?? 0,
    metrics,
    activities,
  });
}
