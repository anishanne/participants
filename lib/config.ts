export const TOURNAMENT_DATE = "2026-03-27";

/** Parse a date string as PST (America/Los_Angeles). */
export function parsePST(dateStr: string): Date {
  if (!dateStr.includes("T")) {
    return new Date(dateStr + "T00:00:00-07:00");
  }
  if (dateStr.match(/[+-]\d{2}:\d{2}$/) || dateStr.endsWith("Z")) {
    return new Date(dateStr);
  }
  return new Date(dateStr + "-07:00");
}

/** Get today's date in PST as YYYY-MM-DD */
export function todayPST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

/** Check if a date string is today in PST */
export function isTodayPST(dateStr: string): boolean {
  const d = parsePST(dateStr);
  const dStr = d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return dStr === todayPST();
}

const BUILDING_IDS: Record<string, string> = {
  hewlett: "hewlett",
  stlc: "stlc",
  coda: "coda",
  lathrop: "lathrop",
};

/** Extract building ID from a location string like "Hewlett 200" → "hewlett" */
export function getBuildingIdFromLocation(location: string): string | null {
  if (!location) return null;
  const firstWord = location.split(/[\s,]/)[0].toLowerCase();
  return BUILDING_IDS[firstWord] ?? null;
}
