import { clsx, type ClassValue } from "clsx";
import type {
  CsvImportResult,
  ResolvedScheduleSlot,
  ScheduleSlot,
  StudentScheduleOverrides
} from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function mergeScheduleForStudent(
  studentId: string,
  schedule: ScheduleSlot[],
  overrides: StudentScheduleOverrides
): ResolvedScheduleSlot[] {
  const studentOverrides = overrides[studentId] ?? {};

  return schedule.map((slot) => {
    const override = studentOverrides[slot.id];

    if (!override) {
      return { ...slot, isPersonalized: false };
    }

    return {
      ...slot,
      personalizedTitle: override.title,
      personalizedLocation: override.location,
      isPersonalized: Boolean(override.title || override.location)
    };
  });
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatDisplayPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 10) {
    return value;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function parseStudentOverrideCsv(
  rows: Record<string, string>[],
  schedule: ScheduleSlot[],
  existingOverrides: StudentScheduleOverrides
): { overrides: StudentScheduleOverrides; summary: CsvImportResult } {
  const nextOverrides: StudentScheduleOverrides = { ...existingOverrides };
  const scheduleByToken = new Map<string, ScheduleSlot>();
  const matchedColumns = new Set<string>();
  const unmatchedColumns = new Set<string>();
  let importedStudents = 0;

  schedule.forEach((slot) => {
    scheduleByToken.set(normalizeToken(slot.slug), slot);
    scheduleByToken.set(normalizeToken(slot.title), slot);
  });

  rows.forEach((row) => {
    const normalizedEntries = Object.entries(row).map(([key, rawValue]) => [key.trim(), String(rawValue ?? "").trim()] as const);
    const studentIdEntry = normalizedEntries.find(([key]) =>
      ["studentid", "student_id", "student"].includes(normalizeToken(key))
    );
    const studentId = studentIdEntry?.[1];

    if (!studentId) {
      return;
    }

    importedStudents += 1;
    const slotOverrides = { ...(nextOverrides[studentId] ?? {}) };

    normalizedEntries.forEach(([key, value]) => {
      if (!value || key === studentIdEntry?.[0]) {
        return;
      }

      const normalizedKey = normalizeToken(key);

      // Check for location columns (e.g., "Power_location", "PowerRoom")
      const isLocationCol = normalizedKey.endsWith("location") || normalizedKey.endsWith("room");
      const baseToken = normalizedKey.replace(/(location|room)$/, "");

      if (isLocationCol && baseToken) {
        const slot = scheduleByToken.get(baseToken);
        if (slot) {
          matchedColumns.add(key);
          const existing = slotOverrides[slot.id] ?? {};
          slotOverrides[slot.id] = { ...existing, location: value };
          return;
        }
      }

      const slot = scheduleByToken.get(normalizedKey);

      if (!slot) {
        unmatchedColumns.add(key);
        return;
      }

      matchedColumns.add(key);
      const existing = slotOverrides[slot.id] ?? {};
      slotOverrides[slot.id] = { ...existing, title: value };
    });

    nextOverrides[studentId] = slotOverrides;
  });

  return {
    overrides: nextOverrides,
    summary: {
      importedStudents,
      matchedColumns: Array.from(matchedColumns),
      unmatchedColumns: Array.from(unmatchedColumns)
    }
  };
}
