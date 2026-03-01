import { createServerClient } from "@/lib/supabase";
import TimelineView from "./TimelineView";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const supabase = createServerClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return <TimelineView initialActivities={activities ?? []} />;
}
