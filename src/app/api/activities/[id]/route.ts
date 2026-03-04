import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/activities/[id] — delete a single activity by id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid activity id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("client_id", "luna");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
