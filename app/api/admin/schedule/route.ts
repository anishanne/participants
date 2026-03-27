import { NextRequest, NextResponse } from "next/server";
import { isApprovedAdmin } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

function getScheduleWritePayload(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  if (typeof input.slug === "string") payload.slug = input.slug;
  if (typeof input.starts_at === "string") payload.starts_at = input.starts_at;
  if (typeof input.startsAt === "string") payload.starts_at = input.startsAt;
  if (typeof input.title === "string") payload.title = input.title;
  if (typeof input.location === "string") payload.location = input.location;
  if (typeof input.description === "string") payload.description = input.description;
  if (typeof input.track === "string") payload.track = input.track;
  if (typeof input.sort_order === "number") payload.sort_order = input.sort_order;

  return payload;
}

export async function POST(request: NextRequest) {
  if (!await isApprovedAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const payload = getScheduleWritePayload(await request.json());

  if (
    typeof payload.slug !== "string" ||
    typeof payload.starts_at !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.location !== "string" ||
    typeof payload.description !== "string" ||
    typeof payload.track !== "string"
  ) {
    return NextResponse.json({ error: "Invalid schedule slot payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_slots")
    .insert({
      ...payload,
      sort_order: payload.sort_order ?? 99
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data?.id });
}

export async function PATCH(request: NextRequest) {
  if (!await isApprovedAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { id, ...input } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const payload = getScheduleWritePayload(input);
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No schedule fields provided" }, { status: 400 });
  }

  const { error } = await supabase.from("schedule_slots").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!await isApprovedAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
