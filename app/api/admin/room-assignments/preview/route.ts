import { NextResponse } from "next/server";
import { isApprovedAdmin } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";
import { autoMatchColumns } from "@/lib/csv-import";

export async function POST(request: Request) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { headers } = await request.json() as { headers: string[] };

  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("id, slug, title")
    .order("sort_order");

  const scheduleSlots = (slots ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    slug: s.slug as string,
    title: s.title as string,
    time: "",
    location: "",
    description: "",
    track: ""
  }));

  const mappings = autoMatchColumns(headers, scheduleSlots);
  const availableSlugs = scheduleSlots.map((s) => ({ slug: s.slug, title: s.title, id: s.id }));

  return NextResponse.json({ mappings, availableSlugs });
}
