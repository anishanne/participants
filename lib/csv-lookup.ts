import Papa from "papaparse";
import type { StudentSlotOverride } from "@/lib/types";

export interface StudentRecord {
  number: string;
  studentName: string;
  nameAbbreviated: string;
  teamName: string;
  teamNumber: string;
  openingAwards: string;
  powerTeam: string;
  lunch: string;
  subject: string;
  guts: string;
  tests: string;
}

export interface StudentLookupResult {
  studentName: string;
  nameAbbreviated: string;
  teamName: string;
  teamNumber: string;
  tests: string;
  overrides: Record<string, StudentSlotOverride>;
}

function parseTestName(tests: string, index: number): string | undefined {
  if (!tests) return undefined;
  const parts = tests.split("+").map((s) => s.trim()).filter(Boolean);
  return parts[index] || undefined;
}

function parseCheckinCsv(text: string): Map<string, StudentRecord> {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  });

  const lookup = new Map<string, StudentRecord>();

  for (const row of result.data) {
    const number = (row["number"] ?? "").trim();
    if (!number) continue;

    lookup.set(number.toUpperCase(), {
      number,
      studentName: (row["student_name"] ?? "").trim(),
      nameAbbreviated: (row["name_abbreviated"] ?? "").trim(),
      teamName: (row["team_name"] ?? "").trim(),
      teamNumber: (row["team_number"] ?? "").trim(),
      openingAwards: (row["OpeningAwards"] ?? "").trim(),
      powerTeam: (row["PowerTeam"] ?? "").trim(),
      lunch: (row["Lunch"] ?? "").trim(),
      subject: (row["Subject"] ?? "").trim(),
      guts: (row["Guts"] ?? "").trim(),
      tests: (row["custom_field.tests"] ?? "").trim()
    });
  }

  return lookup;
}

let cache: Map<string, StudentRecord> | null = null;

export async function getStudentLookup(): Promise<Map<string, StudentRecord>> {
  if (cache) return cache;

  const response = await fetch("/2025smtcheckin.csv");
  const text = await response.text();
  cache = parseCheckinCsv(text);
  return cache;
}

export async function getAllStudents(): Promise<StudentRecord[]> {
  const lookup = await getStudentLookup();
  return Array.from(lookup.values());
}

export async function lookupStudent(
  badgeNumber: string
): Promise<StudentLookupResult | null> {
  const lookup = await getStudentLookup();
  const student = lookup.get(badgeNumber.toUpperCase().trim());
  if (!student) return null;

  const test1 = parseTestName(student.tests, 0);
  const test2 = parseTestName(student.tests, 1);

  const overrides: Record<string, StudentSlotOverride> = {};

  if (student.openingAwards) {
    overrides["opening"] = { location: student.openingAwards };
  }
  if (student.powerTeam) {
    overrides["power"] = { location: student.powerTeam };
    overrides["team"] = { location: student.powerTeam };
  }
  if (student.lunch) {
    overrides["lunch"] = { location: student.lunch };
  }
  if (student.subject) {
    overrides["subject1"] = {
      title: test1 || undefined,
      location: student.subject
    };
    overrides["subject2"] = {
      title: test2 || undefined,
      location: student.subject
    };
  }
  if (student.guts) {
    overrides["guts"] = { location: student.guts };
  }

  return {
    studentName: student.studentName,
    nameAbbreviated: student.nameAbbreviated,
    teamName: student.teamName,
    teamNumber: student.teamNumber,
    tests: student.tests,
    overrides
  };
}
