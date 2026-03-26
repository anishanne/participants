import { NextResponse } from "next/server";
import { isApprovedAdmin } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";
import { processImportRows, type ColumnMapping } from "@/lib/csv-import";

export async function POST(request: Request) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { rows, mappings } = await request.json() as {
    rows: Record<string, string>[];
    mappings: ColumnMapping[];
  };

  // Fetch schedule slots for ID mapping
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

  const { metadata, overrides } = processImportRows(rows, mappings, scheduleSlots);

  // Clear existing data
  await supabase.from("student_schedule_overrides").delete().neq("student_id", "");
  await supabase.from("student_metadata").delete().neq("badge_number", "");

  // Upsert metadata in chunks
  const CHUNK = 500;
  let metaInserted = 0;
  for (let i = 0; i < metadata.length; i += CHUNK) {
    const chunk = metadata.slice(i, i + CHUNK);
    const { error } = await supabase.from("student_metadata").upsert(chunk, { onConflict: "badge_number" });
    if (error) {
      console.error("Metadata upsert error:", error);
      return NextResponse.json({ error: `Metadata insert failed: ${error.message}` }, { status: 500 });
    }
    metaInserted += chunk.length;
  }

  // Upsert overrides in chunks
  let overridesInserted = 0;
  for (let i = 0; i < overrides.length; i += CHUNK) {
    const chunk = overrides.slice(i, i + CHUNK);
    const { error } = await supabase.from("student_schedule_overrides").upsert(chunk, {
      onConflict: "student_id,schedule_slot_id"
    });
    if (error) {
      console.error("Override upsert error:", error);
      return NextResponse.json({ error: `Override insert failed: ${error.message}` }, { status: 500 });
    }
    overridesInserted += chunk.length;
  }

  return NextResponse.json({
    importedStudents: metaInserted,
    overridesCreated: overridesInserted
  });
}
