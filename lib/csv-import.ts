type SlotInfo = { id: string; slug: string; title: string };

/**
 * Target format:
 * - "badge_number", "student_name", "name_abbreviated", "team_name", "team_number" — metadata
 * - "{slug}:room" — replacement_location for a schedule slot
 * - "{slug}:name" — replacement_title for a schedule slot
 * - "skip" — ignore this column
 */
export interface ColumnMapping {
  csvColumn: string;
  targets: string[];
  confidence: "high" | "medium" | "none";
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

const META_FIELDS: Record<string, string> = {
  number: "badge_number",
  badgenumber: "badge_number",
  badge_number: "badge_number",
  badge: "badge_number",
  studentname: "student_name",
  student_name: "student_name",
  nameabbreviated: "name_abbreviated",
  name_abbreviated: "name_abbreviated",
  teamname: "team_name",
  team_name: "team_name",
  teamnumber: "team_number",
  team_number: "team_number",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoMatchColumns(
  headers: string[],
  slots: SlotInfo[]
): ColumnMapping[] {
  const slugByToken = new Map<string, string>();
  for (const slot of slots) {
    slugByToken.set(normalize(slot.slug), slot.slug);
    slugByToken.set(normalize(slot.title), slot.slug);
  }

  return headers.map((col) => {
    const n = normalize(col);

    // Meta field match
    const metaField = META_FIELDS[n];
    if (metaField) {
      return { csvColumn: col, targets: [metaField], confidence: "high" as const };
    }

    // Tests
    if (n === "customfieldtests" || n === "tests") {
      const subjectSlot = slots.find((s) => normalize(s.slug).includes("subject") || normalize(s.title).includes("subject"));
      if (subjectSlot) {
        return { csvColumn: col, targets: [`${subjectSlot.slug}:name`], confidence: "high" as const };
      }
    }

    // Direct slug match → room
    const directMatch = slugByToken.get(n);
    if (directMatch) {
      return { csvColumn: col, targets: [`${directMatch}:room`], confidence: "high" as const };
    }

    // Partial match — collect ALL matching slugs (e.g., "OpeningAwards" → Opening + Awards)
    const partialMatches: string[] = [];
    for (const slot of slots) {
      const slugToken = normalize(slot.slug);
      if (slugToken.length >= 3 && n.includes(slugToken)) {
        partialMatches.push(`${slot.slug}:room`);
      }
    }
    if (partialMatches.length > 0) {
      return { csvColumn: col, targets: partialMatches, confidence: "medium" as const };
    }

    // Column name contains "subject" or "test" + "room" → subject room
    if ((n.includes("subject") || n.includes("test")) && (n.includes("room") || n.includes("location"))) {
      const subjectSlot = slots.find((s) => normalize(s.slug).includes("subject"));
      if (subjectSlot) {
        return { csvColumn: col, targets: [`${subjectSlot.slug}:room`], confidence: "medium" as const };
      }
    }

    return { csvColumn: col, targets: [], confidence: "none" as const };
  });
}

/** Build all dropdown options for the mapping UI */
export function getMappingOptions(slots: SlotInfo[]): { value: string; label: string; group: string }[] {
  const options: { value: string; label: string; group: string }[] = [
    { value: "badge_number", label: "Badge Number", group: "Student Info" },
    { value: "student_name", label: "Student Name", group: "Student Info" },
    { value: "name_abbreviated", label: "Name (abbreviated)", group: "Student Info" },
    { value: "team_name", label: "Team Name", group: "Student Info" },
    { value: "team_number", label: "Team Number", group: "Student Info" },
  ];

  for (const slot of slots) {
    options.push(
      { value: `${slot.slug}:room`, label: `${slot.title} → Room`, group: "Schedule Slots" },
      { value: `${slot.slug}:name`, label: `${slot.title} → Name`, group: "Schedule Slots" }
    );
  }

  options.push({ value: "skip", label: "Skip (ignore)", group: "Other" });

  return options;
}

export function processImportRows(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  slots: SlotInfo[]
): { metadata: MetadataRow[]; overrides: OverrideRow[] } {
  const slotIdBySlug = new Map(slots.map((s) => [s.slug, s.id]));

  // Group mappings by type
  const badgeCol = mappings.find((m) => m.targets.includes("badge_number"))?.csvColumn;
  if (!badgeCol) return { metadata: [], overrides: [] };

  const metaTargets = new Set(["badge_number", "student_name", "name_abbreviated", "team_name", "team_number"]);

  const metadata: MetadataRow[] = [];
  const overrides: OverrideRow[] = [];

  for (const row of rows) {
    const badge = (row[badgeCol] ?? "").trim().toUpperCase();
    if (!badge) continue;

    const meta: MetadataRow = {
      badge_number: badge,
      student_name: "",
      name_abbreviated: "",
      team_name: "",
      team_number: "",
      tests: ""
    };

    const slotOverrides = new Map<string, { title: string | null; location: string | null }>();

    for (const mapping of mappings) {
      const val = (row[mapping.csvColumn] ?? "").trim();
      if (!val || mapping.targets.length === 0) continue;

      for (const target of mapping.targets) {
        // Meta field
        if (metaTargets.has(target)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (meta as any)[target] = val;
          continue;
        }

        // Slot mapping: "Power:room" or "Subject1:name"
        const colonIdx = target.indexOf(":");
        if (colonIdx === -1) continue;

        const slug = target.substring(0, colonIdx);
        const field = target.substring(colonIdx + 1);
        const slotId = slotIdBySlug.get(slug);
        if (!slotId) continue;

        const existing = slotOverrides.get(slotId) ?? { title: null, location: null };
        if (field === "room") existing.location = val;
        if (field === "name") {
          existing.title = val;
          if (!meta.tests && val) meta.tests = val;
        }
        slotOverrides.set(slotId, existing);
      }
    }

    metadata.push(meta);

    for (const [slotId, override] of slotOverrides) {
      overrides.push({
        student_id: badge,
        schedule_slot_id: slotId,
        replacement_title: override.title,
        replacement_location: override.location
      });
    }
  }

  return { metadata, overrides };
}
