import type { ScheduleSlot } from "@/lib/types";

export interface ColumnMapping {
  csvColumn: string;
  mappedSlugs: string[];
  confidence: "auto" | "partial" | "none";
  isMeta: boolean;
  isTests: boolean;
}

export interface MetadataRow {
  badge_number: string;
  student_name: string;
  name_abbreviated: string;
  team_name: string;
  team_number: string;
  tests: string;
}

export interface OverrideRow {
  student_id: string;
  schedule_slot_id: string;
  replacement_title: string | null;
  replacement_location: string | null;
}

const META_MAP: Record<string, string> = {
  number: "badge_number",
  studentname: "student_name",
  student_name: "student_name",
  nameabbreviated: "name_abbreviated",
  name_abbreviated: "name_abbreviated",
  teamname: "team_name",
  team_name: "team_name",
  teamnumber: "team_number",
  team_number: "team_number",
};

const SKIP_PREFIXES = ["customfield", "mergeddoc", "linkto", "document", "registeredat"];
const SKIP_EXACT = new Set([
  "student_id", "front_id", "waiver", "email", "first_name", "last_name",
  "team_id", "org_name", "org_id",
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSkipColumn(col: string): boolean {
  const n = normalize(col);
  if (SKIP_EXACT.has(n)) return true;
  for (const prefix of SKIP_PREFIXES) {
    if (n.startsWith(prefix)) return true;
  }
  return false;
}

export function autoMatchColumns(
  headers: string[],
  slots: ScheduleSlot[]
): ColumnMapping[] {
  const slugByToken = new Map<string, string>();
  for (const slot of slots) {
    slugByToken.set(normalize(slot.slug), slot.slug);
    slugByToken.set(normalize(slot.title), slot.slug);
  }

  return headers.map((col) => {
    const n = normalize(col);

    // Meta columns
    if (META_MAP[n] || col === "number") {
      return { csvColumn: col, mappedSlugs: [], confidence: "auto", isMeta: true, isTests: false };
    }

    // Tests column
    if (n === "customfieldtests" || n === "tests") {
      return { csvColumn: col, mappedSlugs: [], confidence: "auto", isMeta: false, isTests: true };
    }

    // Skip non-useful columns
    if (isSkipColumn(col)) {
      return { csvColumn: col, mappedSlugs: [], confidence: "none", isMeta: false, isTests: false };
    }

    // Direct match
    const directMatch = slugByToken.get(n);
    if (directMatch) {
      return { csvColumn: col, mappedSlugs: [directMatch], confidence: "auto", isMeta: false, isTests: false };
    }

    // Partial match (e.g., "PowerTeam" contains "Power" and "Team")
    const partialMatches: string[] = [];
    for (const slot of slots) {
      const slugToken = normalize(slot.slug);
      if (slugToken.length >= 3 && n.includes(slugToken)) {
        partialMatches.push(slot.slug);
      }
    }
    if (partialMatches.length > 0) {
      return { csvColumn: col, mappedSlugs: partialMatches, confidence: "partial", isMeta: false, isTests: false };
    }

    return { csvColumn: col, mappedSlugs: [], confidence: "none", isMeta: false, isTests: false };
  });
}

export function processImportRows(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  slots: ScheduleSlot[]
): { metadata: MetadataRow[]; overrides: OverrideRow[] } {
  const slotById = new Map(slots.map((s) => [s.slug, s.id]));
  const subjectSlugIds = slots
    .filter((s) => normalize(s.slug).includes("subject") || normalize(s.title).includes("subject"))
    .map((s) => ({ slug: s.slug, id: s.id }));

  const badgeCol = mappings.find((m) => m.isMeta && normalize(m.csvColumn) === "number")?.csvColumn ?? "number";
  const metaMappings = mappings.filter((m) => m.isMeta);
  const roomMappings = mappings.filter((m) => !m.isMeta && !m.isTests && m.mappedSlugs.length > 0);
  const testsMapping = mappings.find((m) => m.isTests);

  const metadata: MetadataRow[] = [];
  const overrides: OverrideRow[] = [];

  for (const row of rows) {
    const badge = (row[badgeCol] ?? "").trim();
    if (!badge) continue;

    // Build metadata
    const meta: MetadataRow = {
      badge_number: badge,
      student_name: "",
      name_abbreviated: "",
      team_name: "",
      team_number: "",
      tests: ""
    };

    for (const m of metaMappings) {
      const val = (row[m.csvColumn] ?? "").trim();
      const field = META_MAP[normalize(m.csvColumn)];
      if (field && val) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meta as any)[field] = val;
      }
    }

    // Tests
    if (testsMapping) {
      meta.tests = (row[testsMapping.csvColumn] ?? "").trim();
    }

    metadata.push(meta);

    // Room overrides
    for (const rm of roomMappings) {
      const val = (row[rm.csvColumn] ?? "").trim();
      if (!val) continue;

      for (const slug of rm.mappedSlugs) {
        const slotId = slotById.get(slug);
        if (!slotId) continue;
        overrides.push({
          student_id: badge,
          schedule_slot_id: slotId,
          replacement_title: null,
          replacement_location: val
        });
      }
    }

    // Test names → Subject slot titles
    if (meta.tests && subjectSlugIds.length > 0) {
      const parts = meta.tests.split("+").map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(parts.length, subjectSlugIds.length); i++) {
        // Find if there's already an override for this slot
        const existing = overrides.find(
          (o) => o.student_id === badge && o.schedule_slot_id === subjectSlugIds[i].id
        );
        if (existing) {
          existing.replacement_title = parts[i];
        } else {
          overrides.push({
            student_id: badge,
            schedule_slot_id: subjectSlugIds[i].id,
            replacement_title: parts[i],
            replacement_location: null
          });
        }
      }
    }
  }

  return { metadata, overrides };
}
