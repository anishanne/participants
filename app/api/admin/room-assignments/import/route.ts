import { NextResponse } from "next/server";
import { isApprovedAdmin } from "@/lib/admin-session";
import {
  processImportRows,
  type ColumnMapping,
  type MetadataRow,
  type OverrideRow
} from "@/lib/csv-import";
import { getSupabase } from "@/lib/supabase-server";

const CHUNK_SIZE = 500;

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function makeOverrideKey(studentId: string, scheduleSlotId: string) {
  return `${studentId}::${scheduleSlotId}`;
}

function dedupeMetadataRows(rows: MetadataRow[]) {
  return Array.from(
    rows.reduce((map, row) => map.set(row.badge_number, row), new Map<string, MetadataRow>()).values()
  );
}

function dedupeOverrideRows(rows: OverrideRow[]) {
  const overrides = new Map<string, OverrideRow>();

  for (const row of rows) {
    const key = makeOverrideKey(row.student_id, row.schedule_slot_id);
    const existing = overrides.get(key);

    overrides.set(key, {
      student_id: row.student_id,
      schedule_slot_id: row.schedule_slot_id,
      replacement_title: row.replacement_title ?? existing?.replacement_title ?? null,
      replacement_location: row.replacement_location ?? existing?.replacement_location ?? null
    });
  }

  return Array.from(overrides.values());
}

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

  const { data: slots, error: slotError } = await supabase
    .from("schedule_slots")
    .select("id, slug, title")
    .order("sort_order");

  if (slotError) {
    return NextResponse.json({ error: slotError.message }, { status: 500 });
  }

  const scheduleSlots = (slots ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    slug: s.slug as string,
    title: s.title as string
  }));

  const processed = processImportRows(rows, mappings, scheduleSlots);
  const metadata = dedupeMetadataRows(processed.metadata);
  const overrides = dedupeOverrideRows(processed.overrides);

  if (metadata.length === 0) {
    return NextResponse.json(
      { error: "No student rows were found. Make sure the CSV includes badge numbers." },
      { status: 400 }
    );
  }

  const importedBadges = metadata.map((row) => row.badge_number);
  const importedBadgeSet = new Set(importedBadges);
  const desiredOverrideKeys = new Set(
    overrides.map((row) => makeOverrideKey(row.student_id, row.schedule_slot_id))
  );

  const { data: existingStudents, error: existingStudentsError } = await supabase
    .from("student_metadata")
    .select("badge_number");

  if (existingStudentsError) {
    return NextResponse.json({ error: existingStudentsError.message }, { status: 500 });
  }

  const removedBadges = (existingStudents ?? [])
    .map((row) => row.badge_number as string)
    .filter((badge) => !importedBadgeSet.has(badge));

  let metaInserted = 0;
  for (const chunk of chunkItems(metadata, CHUNK_SIZE)) {
    const { error } = await supabase
      .from("student_metadata")
      .upsert(chunk, { onConflict: "badge_number" });

    if (error) {
      console.error("Metadata upsert error:", error);
      return NextResponse.json({ error: `Metadata insert failed: ${error.message}` }, { status: 500 });
    }

    metaInserted += chunk.length;
  }

  let overridesInserted = 0;
  for (const chunk of chunkItems(overrides, CHUNK_SIZE)) {
    const { error } = await supabase
      .from("student_schedule_overrides")
      .upsert(chunk, { onConflict: "student_id,schedule_slot_id" });

    if (error) {
      console.error("Override upsert error:", error);
      return NextResponse.json({ error: `Override insert failed: ${error.message}` }, { status: 500 });
    }

    overridesInserted += chunk.length;
  }

  let overridesRemoved = 0;
  for (const badgeChunk of chunkItems(importedBadges, CHUNK_SIZE)) {
    const { data: existingOverrides, error } = await supabase
      .from("student_schedule_overrides")
      .select("id, student_id, schedule_slot_id")
      .in("student_id", badgeChunk);

    if (error) {
      return NextResponse.json({ error: `Override reconciliation failed: ${error.message}` }, { status: 500 });
    }

    const staleIds = (existingOverrides ?? [])
      .filter((row) => {
        const key = makeOverrideKey(row.student_id as string, row.schedule_slot_id as string);
        return !desiredOverrideKeys.has(key);
      })
      .map((row) => row.id as string);

    for (const idChunk of chunkItems(staleIds, CHUNK_SIZE)) {
      if (idChunk.length === 0) continue;
      const { error: deleteError } = await supabase
        .from("student_schedule_overrides")
        .delete()
        .in("id", idChunk);

      if (deleteError) {
        return NextResponse.json({ error: `Override cleanup failed: ${deleteError.message}` }, { status: 500 });
      }

      overridesRemoved += idChunk.length;
    }
  }

  for (const badgeChunk of chunkItems(removedBadges, CHUNK_SIZE)) {
    if (badgeChunk.length === 0) continue;

    const { error: overrideDeleteError } = await supabase
      .from("student_schedule_overrides")
      .delete()
      .in("student_id", badgeChunk);

    if (overrideDeleteError) {
      return NextResponse.json({ error: `Removed-student override cleanup failed: ${overrideDeleteError.message}` }, { status: 500 });
    }

    const { error: metadataDeleteError } = await supabase
      .from("student_metadata")
      .delete()
      .in("badge_number", badgeChunk);

    if (metadataDeleteError) {
      return NextResponse.json({ error: `Removed-student cleanup failed: ${metadataDeleteError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    importedStudents: metaInserted,
    overridesCreated: overridesInserted,
    studentsRemoved: removedBadges.length,
    overridesRemoved
  });
}
