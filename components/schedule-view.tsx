"use client";

import { CalendarRange, Check, ChevronDown, Loader2, MapPin, Radio, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  useParticipantData,
  useParticipantPreferences
} from "@/components/app-state-provider";
import { SkeletonTimelineRow } from "@/components/skeleton";
import Link from "next/link";
import { getBuildingIdFromLocation, isTodayPST, parsePST } from "@/lib/config";
import { formatScheduleTimeCompact } from "@/lib/schedule";
import type { ResolvedScheduleSlot } from "@/lib/types";

interface StudentLookupResult {
  studentName: string;
  nameAbbreviated: string;
  teamName: string;
  teamNumber: string;
  tests: string;
  overrides: Record<string, { title?: string; location?: string }>;
}

function slotTimeToday(startsAt: string, tournamentDate: string): Date {
  const original = new Date(startsAt);
  const todayBase = parsePST(tournamentDate);
  const pstStr = original.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [hours, minutes] = pstStr.split(":").map(Number);
  todayBase.setHours(hours, minutes, 0, 0);
  return todayBase;
}

function getSlotStatus(
  slot: { startsAt: string },
  nextSlot: { startsAt: string } | null,
  tournamentDate: string
): "completed" | "current" | "upcoming" | "none" {
  if (!tournamentDate || !isTodayPST(tournamentDate)) return "none";
  const now = new Date();

  const start = slotTimeToday(slot.startsAt, tournamentDate);
  const end = nextSlot
    ? slotTimeToday(nextSlot.startsAt, tournamentDate)
    : new Date(start.getTime() + 90 * 60 * 1000);

  if (now >= end) return "completed";
  if (now >= start && now < end) return "current";
  return "upcoming";
}

// Cache lookup results across re-mounts (tab switches)
const lookupCache = new Map<string, StudentLookupResult>();

export function ScheduleView() {
  const { generalSchedule, loading: appLoading, tournamentDate } = useParticipantData();
  const { preferences, updatePreferences } = useParticipantPreferences();
  const [mode, setMode] = useState<"personalized" | "general">("personalized");
  const cachedResult = preferences.studentId ? lookupCache.get(preferences.studentId.toUpperCase()) ?? null : null;
  const [lookupResult, setLookupResult] = useState<StudentLookupResult | null>(cachedResult);
  const [lookupError, setLookupError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Re-render every 30s to update current event indicator
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const doLookup = useCallback(async (badge: string) => {
    if (!badge) {
      setLookupResult(null);
      setLookupError(false);
      return;
    }
    // Use cache if available
    const cached = lookupCache.get(badge.toUpperCase());
    if (cached) {
      setLookupResult(cached);
      setLookupError(false);
      return;
    }
    setLoading(true);
    setLookupError(false);
    try {
      const res = await fetch(`/api/student/${encodeURIComponent(badge)}`);
      if (!res.ok) { setLookupResult(null); setLookupError(true); return; }
      const result = await res.json();
      if (result) {
        lookupCache.set(badge.toUpperCase(), result);
      }
      setLookupResult(result);
      setLookupError(!result);
    } catch {
      setLookupResult(null);
      setLookupError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!preferences.studentId) {
      setLookupResult(null);
      setLookupError(false);
      return;
    }
    const timeout = setTimeout(() => doLookup(preferences.studentId), 300);
    return () => clearTimeout(timeout);
  }, [preferences.studentId, doLookup]);

  const showPersonalized = mode === "personalized" && lookupResult !== null;
  const displayedSlots: ResolvedScheduleSlot[] = showPersonalized
    ? generalSchedule.map((slot) => {
      const override = lookupResult.overrides[slot.slug];
      if (!override) return { ...slot, isPersonalized: false };
      return {
        ...slot,
        personalizedTitle: override.title,
        personalizedLocation: override.location,
        isPersonalized: Boolean(override.title || override.location)
      };
    })
    : generalSchedule.map((slot) => ({ ...slot, isPersonalized: false }));

  return (
    <div className="space-y-4">
      {/* Header — matches map page style */}
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(152,28,29,0.1)] p-3 text-[color:var(--crimson)]">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Schedule</p>
            <h1 className="section-title mt-1">SMT 2026 Tournament Day</h1>
          </div>
        </div>
      </section>

      {/* Badge lookup */}
      <section className="panel p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[color:var(--ink)]">Badge Number</label>
            <div className="inline-flex rounded-full border border-[color:var(--line)] bg-white/85 p-0.5">
              <button
                type="button"
                onClick={() => setMode("personalized")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${showPersonalized ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
                  }`}
              >
                My Schedule
              </button>
              <button
                type="button"
                onClick={() => setMode("general")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${!showPersonalized ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
                  }`}
              >
                General
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              value={preferences.studentId}
              onChange={(event) => updatePreferences({ studentId: event.target.value.trim() })}
              placeholder="e.g. 001A"
              className="w-full rounded-xl border border-[color:var(--line)] bg-white/85 px-3 py-2.5 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
            />
            {loading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[color:var(--ink-soft)]" />
              </div>
            ) : null}
          </div>

          {lookupResult ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
              <User className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <p className="text-xs font-medium text-emerald-900 truncate">
                {lookupResult.studentName} &middot; Team {lookupResult.teamNumber}
                {lookupResult.tests ? ` · ${lookupResult.tests}` : ""}
              </p>
            </div>
          ) : null}

          {lookupError && preferences.studentId ? (
            <div className="rounded-xl border border-[rgba(152,28,29,0.15)] bg-[rgba(152,28,29,0.04)] px-3 py-2">
              <p className="text-xs text-[color:var(--crimson)]">
                No student found for &ldquo;{preferences.studentId}&rdquo;
              </p>
              <a href="mailto:info@stanfordmathtournament.org" className="text-[10px] text-[color:var(--ink-soft)] hover:underline">
                Need help? Contact info@stanfordmathtournament.org
              </a>
            </div>
          ) : null}

          {!lookupResult && !lookupError && !preferences.studentId ? (
            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--line)] bg-white/50 px-3 py-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--gold)]" />
              <p className="text-xs text-[color:var(--ink-soft)]">
                Your badge number is printed on your name tag. It unlocks personalized room assignments and test info.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Timeline */}
      <section className="panel px-4 py-3">
        <div className="relative">
          {appLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTimelineRow key={i} isLast={i === 5} />
            ))
          ) : displayedSlots.length === 0 ? (
            <p className="py-4 text-center text-sm text-[color:var(--ink-soft)]">No schedule loaded.</p>
          ) : displayedSlots.map((slot, i) => {
            const nextSlot = i + 1 < displayedSlots.length ? displayedSlots[i + 1] : null;
            const status = getSlotStatus(slot, nextSlot, tournamentDate);
            const isLast = i === displayedSlots.length - 1;
            const isExpanded = expandedId === slot.id;
            const personalized = slot.isPersonalized;
            const displayTitle = personalized && slot.personalizedTitle ? slot.personalizedTitle : slot.title;
            const displayLocation = personalized && slot.personalizedLocation ? slot.personalizedLocation : slot.location;
            const isCompleted = status === "completed";
            const isCurrent = status === "current";

            return (
              <div key={slot.id} className="flex gap-3">
                {/* Time column */}
                <div className={`w-14 shrink-0 pt-2.5 text-right text-xs font-semibold ${isCompleted ? "text-[color:var(--ink-soft)]/50 line-through" : isCurrent ? "text-[color:var(--crimson)]" : "text-[color:var(--ink-soft)]"
                  }`}>
                  {formatScheduleTimeCompact(slot.startsAt)}
                </div>

                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isCompleted
                      ? "bg-emerald-100"
                      : isCurrent
                        ? "bg-[color:var(--crimson)] shadow-[0_0_0_4px_rgba(152,28,29,0.12)]"
                        : "border-2 border-[color:var(--line)] bg-white"
                    }`}>
                    {isCompleted ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : isCurrent ? (
                      <Radio className="h-3 w-3 text-white animate-pulse" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink-soft)]/30" />
                    )}
                  </div>
                  {!isLast ? (
                    <div className={`w-0.5 flex-1 ${isCompleted ? "bg-emerald-200" : "bg-[color:var(--line)]"
                      }`} />
                  ) : null}
                </div>

                {/* Content */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : slot.id)}
                  className={`mb-1 flex-1 rounded-xl px-3 py-2 text-left transition ${isCurrent ? "bg-[rgba(152,28,29,0.04)]" : "hover:bg-white/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${isCompleted ? "text-[color:var(--ink-soft)]/60" : "text-[color:var(--ink)]"
                          }`}>
                          {displayTitle}
                        </p>
                        {isCurrent ? (
                          <span className="shrink-0 rounded-full bg-[color:var(--crimson)] px-2 py-0.5 text-[10px] font-bold text-white">
                            NOW
                          </span>
                        ) : null}
                      </div>
                      <LocationLink location={displayLocation} />
                    </div>
                    <ChevronDown className={`mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--ink-soft)] transition ${isExpanded ? "rotate-180" : ""
                      }`} />
                  </div>

                  {isExpanded ? (
                    <div className="mt-2 space-y-1 border-t border-[color:var(--line)] pt-2">
                      <p className="text-xs text-[color:var(--ink-soft)]">{slot.description}</p>
                      <span className="inline-block rounded-full border border-[color:var(--line)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--ink-soft)]">
                        {slot.track}
                      </span>
                      {personalized && slot.personalizedTitle && slot.personalizedTitle !== slot.title ? (
                        <p className="text-[10px] text-[color:var(--ink-soft)]">General: {slot.title}</p>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function LocationLink({ location }: { location: string }) {
  const buildingId = getBuildingIdFromLocation(location);

  if (buildingId) {
    return (
      <Link
        href={`/map?building=${buildingId}`}
        className="mt-0.5 flex items-center gap-1 text-xs text-[color:var(--crimson)] hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{location}</span>
      </Link>
    );
  }

  return (
    <div className="mt-0.5 flex items-center gap-1 text-xs text-[color:var(--ink-soft)]">
      <MapPin className="h-3 w-3 shrink-0" />
      <span className="truncate">{location}</span>
    </div>
  );
}
