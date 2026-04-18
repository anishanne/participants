import { isTodayPST, parsePST } from "@/lib/config";
import type { ScheduleSlot, ScheduleSlotPatch } from "@/lib/types";

export type EventStatus =
  | { mode: "countdown" }
  | { mode: "preview"; firstSlot: ScheduleSlot }
  | { mode: "happening-now"; currentSlot: ScheduleSlot; nextSlot: ScheduleSlot | null }
  | { mode: "up-next"; nextSlot: ScheduleSlot }
  | { mode: "finished" };

export function getEventStatus(schedule: ScheduleSlot[], tournamentDate: string): EventStatus {
  if (!tournamentDate) return { mode: "countdown" };

  const now = new Date();

  if (!isTodayPST(tournamentDate)) {
    const tDay = parsePST(tournamentDate);
    if (now < tDay && schedule.length > 0) return { mode: "preview", firstSlot: schedule[0] };
    if (now > tDay) return { mode: "finished" };
    return { mode: "countdown" };
  }

  if (schedule.length === 0) return { mode: "countdown" };

  const slotTimeToday = (startsAt: string): Date => {
    const original = new Date(startsAt);
    const todayBase = parsePST(tournamentDate);
    const pstStr = original.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
    const [hours, minutes] = pstStr.split(":").map(Number);
    todayBase.setHours(hours, minutes, 0, 0);
    return todayBase;
  };

  for (let i = 0; i < schedule.length; i++) {
    const slotStart = slotTimeToday(schedule[i].startsAt);
    const slotEnd =
      i + 1 < schedule.length
        ? slotTimeToday(schedule[i + 1].startsAt)
        : new Date(slotStart.getTime() + 90 * 60 * 1000);

    if (now >= slotStart && now < slotEnd) {
      return {
        mode: "happening-now",
        currentSlot: schedule[i],
        nextSlot: i + 1 < schedule.length ? schedule[i + 1] : null
      };
    }

    if (now < slotStart) {
      return { mode: "up-next", nextSlot: schedule[i] };
    }
  }

  return { mode: "finished" };
}

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
  const sortOrder = typeof row.sort_order === "number" ? row.sort_order : 0;

  return {
    id: row.id as string,
    sortOrder,
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

  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;
  if (patch.slug !== undefined) payload.slug = patch.slug;
  if (patch.startsAt !== undefined) payload.starts_at = patch.startsAt;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.track !== undefined) payload.track = patch.track;

  return payload;
}
