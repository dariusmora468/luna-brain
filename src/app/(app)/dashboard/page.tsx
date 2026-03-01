import { createServerClient } from "@/lib/supabase";
import DashboardView from "./DashboardView";
import type { DailyMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerClient();

  // Fetch last 90 days of metrics
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: false })
    .limit(90);

  // Fetch recent activities for clickable days
  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: false })
    .limit(200);

  const today = metrics?.[0] as DailyMetrics | null;
  const yesterday = metrics?.[1] as DailyMetrics | null;
  const history = (metrics ?? []).reverse() as DailyMetrics[];

  return (
    <DashboardView
      today={today}
      yesterday={yesterday}
      history={history}
      activities={activities ?? []}
    />
  );
}
