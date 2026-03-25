"use client";

import { CalendarRange, Loader2, MapPin, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import { lookupStudent, type StudentLookupResult } from "@/lib/csv-lookup";
import type { ResolvedScheduleSlot } from "@/lib/types";

export function ScheduleView() {
  const { generalSchedule, preferences, updatePreferences } = useAppState();
  const [mode, setMode] = useState<"personalized" | "general">("personalized");
  const [lookupResult, setLookupResult] = useState<StudentLookupResult | null>(null);
  const [lookupError, setLookupError] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLookup = useCallback(async (badge: string) => {
    if (!badge) {
      setLookupResult(null);
      setLookupError(false);
      return;
    }

    setLoading(true);
    setLookupError(false);

    try {
      const result = await lookupStudent(badge);
      setLookupResult(result);
      setLookupError(!result);
    } catch {
      setLookupResult(null);
      setLookupError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Look up when badge number changes (debounced)
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
        const override = lookupResult.overrides[slot.id];
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
    <div className="space-y-5">
      <section className="panel bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(255,251,240,0.95))] p-5">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[rgba(152,28,29,0.1)] p-3 text-[color:var(--crimson)]">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <p className="eyebrow">Schedule</p>
              <h1 className="section-title mt-1">SMT 2026 Tournament Day</h1>
              <p className="body-copy mt-2">
                April 18, 2026 at Stanford University. Enter your badge number to see your room assignments.
              </p>
            </div>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[color:var(--ink)]">Badge Number</span>
            <div className="relative">
              <input
                value={preferences.studentId}
                onChange={(event) => updatePreferences({ studentId: event.target.value.trim() })}
                placeholder="e.g. 001A"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
              />
              {loading ? (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--ink-soft)]" />
              ) : null}
            </div>
          </label>

          {/* Student found banner */}
          {lookupResult ? (
            <div className="flex items-center gap-3 rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <User className="h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900 truncate">
                  {lookupResult.studentName}
                </p>
                <p className="text-xs text-emerald-700 truncate">
                  Team {lookupResult.teamNumber} &middot; {lookupResult.teamName}
                  {lookupResult.tests ? ` · ${lookupResult.tests}` : ""}
                </p>
              </div>
            </div>
          ) : null}

          {/* Not found */}
          {lookupError && preferences.studentId ? (
            <p className="rounded-[1.2rem] border border-[rgba(152,28,29,0.15)] bg-[rgba(152,28,29,0.04)] px-4 py-3 text-sm text-[color:var(--crimson)]">
              No student found for badge &ldquo;{preferences.studentId}&rdquo;
            </p>
          ) : null}

          <div className="inline-flex rounded-full border border-[color:var(--line)] bg-white/85 p-1">
            <button
              type="button"
              onClick={() => setMode("personalized")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                showPersonalized ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
              }`}
            >
              My Schedule
            </button>
            <button
              type="button"
              onClick={() => setMode("general")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !showPersonalized ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
              }`}
            >
              General
            </button>
          </div>
        </div>
      </section>

      {!lookupResult && mode === "personalized" ? (
        <section className="panel-muted p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--gold)]" />
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {preferences.studentId ? "Looking up your schedule..." : "Enter your badge number to see your rooms."}
              </h2>
              <p className="body-copy mt-2">
                Your badge number is printed on your name tag (e.g. 001A). It unlocks personalized room assignments and test info.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {displayedSlots.map((slot) => {
          const personalized = slot.isPersonalized;
          const displayTitle = personalized && slot.personalizedTitle
            ? slot.personalizedTitle
            : slot.title;
          const displayLocation = personalized && slot.personalizedLocation
            ? slot.personalizedLocation
            : slot.location;

          return (
            <article key={slot.id} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{slot.time}</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--ink)]">
                    {displayTitle}
                  </h2>
                  {personalized && slot.personalizedTitle && slot.personalizedTitle !== slot.title ? (
                    <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                      General: {slot.title}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{slot.description}</p>
                  )}
                </div>
                <span className="pill">{slot.track}</span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[1.2rem] bg-[rgba(59,28,28,0.04)] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-[color:var(--ink)]">
                  <MapPin className="h-3.5 w-3.5 text-[color:var(--ink-soft)]" />
                  {displayLocation}
                </span>
                {personalized ? (
                  <span className="rounded-full bg-[rgba(152,28,29,0.12)] px-3 py-1 text-xs font-semibold text-[color:var(--crimson)]">
                    Your Room
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
