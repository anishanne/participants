import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.user || session.user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const updates = await request.json() as Record<string, string>;

  for (const [key, value] of Object.entries(updates)) {
    await supabase
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  return NextResponse.json({ success: true });
}
