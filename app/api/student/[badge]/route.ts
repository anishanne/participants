import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ badge: string }> }
) {
  const { badge } = await params;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json(null);

  const upperBadge = badge.toUpperCase().trim();

  // Get student metadata
  const { data: meta } = await supabase
    .from("student_metadata")
    .select("*")
    .eq("badge_number", upperBadge)
    .single();

  if (!meta) return NextResponse.json(null);

  // Get overrides joined with schedule slot slugs
  const { data: overrideRows } = await supabase
    .from("student_schedule_overrides")
    .select("replacement_title, replacement_location, schedule_slot_id, schedule_slots(slug)")
    .eq("student_id", upperBadge);

  // Build overrides map keyed by slug
  const overrides: Record<string, { title?: string; location?: string }> = {};
  for (const row of overrideRows ?? []) {
    const slotData = row.schedule_slots as unknown as { slug: string } | null;
    const slug = slotData?.slug;
    if (!slug) continue;
    overrides[slug] = {
      title: row.replacement_title || undefined,
      location: row.replacement_location || undefined
    };
  }

  return NextResponse.json({
    studentName: meta.student_name,
    nameAbbreviated: meta.name_abbreviated,
    teamName: meta.team_name,
    teamNumber: meta.team_number,
    tests: meta.tests,
    overrides
  });
}
