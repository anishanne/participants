import { NextRequest, NextResponse } from "next/server";
import { isApprovedAdmin } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "25", 10);

  let query = supabase
    .from("student_metadata")
    .select("*", { count: "exact" })
    .order("badge_number")
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.or(`badge_number.ilike.%${search}%,student_name.ilike.%${search}%,team_name.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get global stats (not filtered by search/page)
  let teamCount = 0;
  let setupCount = 0;
  if (!search) {
    const { data: teams } = await supabase
      .from("student_metadata")
      .select("team_number")
      .neq("team_number", "");
    if (teams) {
      teamCount = new Set(teams.map((t: Record<string, unknown>) => t.team_number)).size;
    }

    const { count: lookedUp } = await supabase
      .from("student_metadata")
      .select("id", { count: "exact", head: true })
      .not("last_looked_up", "is", null);
    setupCount = lookedUp ?? 0;
  }

  return NextResponse.json({ students: data ?? [], total: count ?? 0, teamCount, setupCount });
}

export async function PATCH(request: NextRequest) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { badge, scheduleSlotId, location, title } = await request.json();
  const normalizedBadge = typeof badge === "string" ? badge.trim().toUpperCase() : "";

  if (!normalizedBadge || !scheduleSlotId) {
    return NextResponse.json({ error: "badge and scheduleSlotId required" }, { status: 400 });
  }

  const { error } = await supabase.from("student_schedule_overrides").upsert({
    student_id: normalizedBadge,
    schedule_slot_id: scheduleSlotId,
    replacement_location: location ?? null,
    replacement_title: title ?? null
  }, { onConflict: "student_id,schedule_slot_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
