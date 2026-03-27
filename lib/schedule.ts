import { parsePST } from "@/lib/config";
import type { ScheduleSlot, ScheduleSlotPatch } from "@/lib/types";

const TOURNAMENT_TIME_ZONE = "America/Los_Angeles";

const scheduleTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TOURNAMENT_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit"
});

const scheduleTimeInputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TOURNAMENT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

export function formatScheduleTime(startsAt: string): string {
  return scheduleTimeFormatter.format(new Date(startsAt)).replace(/\u202f/g, " ");
}

export function formatScheduleTimeCompact(startsAt: string): string {
  return formatScheduleTime(startsAt)
    .replace(":00 ", " ")
    .replace(" AM", "a")
    .replace(" PM", "p");
}

export function toScheduleTimeInputValue(startsAt: string): string {
  return scheduleTimeInputFormatter.format(new Date(startsAt));
}

export function createScheduleStartsAt(tournamentDate: string, timeValue: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) return null;

  return parsePST(`${tournamentDate}T${timeValue}:00`).toISOString();
}

export function mapScheduleRow(row: Record<string, unknown>): ScheduleSlot {
  const startsAt = row.starts_at as string;

  return {
    id: row.id as string,
    slug: row.slug as string,
    startsAt,
    time: formatScheduleTime(startsAt),
    title: row.title as string,
    location: row.location as string,
    description: row.description as string,
    track: row.track as string
  };
}

export function applySchedulePatch(slot: ScheduleSlot, patch: ScheduleSlotPatch): ScheduleSlot {
  const next = { ...slot, ...patch };

  return {
    ...next,
    time: formatScheduleTime(next.startsAt)
  };
}

export function toScheduleApiPatch(patch: ScheduleSlotPatch): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.startsAt !== undefined) payload.starts_at = patch.startsAt;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.track !== undefined) payload.track = patch.track;

  return payload;
}
