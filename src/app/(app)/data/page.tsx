import { createServerClient } from "@/lib/supabase";
import DataView from "./DataView";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const supabase = createServerClient();

  const { data: metrics, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error loading data: {error.message}</p>
      </div>
    );
  }

  return <DataView initialData={metrics ?? []} />;
}
