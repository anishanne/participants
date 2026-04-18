"use client";

import { Compass, Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useParticipantData } from "@/components/app-state-provider";
import { getBuildingIdFromLocation } from "@/lib/config";
import { getEventStatus } from "@/lib/schedule";
import type { ScheduleSlot } from "@/lib/types";

type MarkerKind = "live" | "next" | "selected" | null;

export function CampusMap() {
  const { mapLocations, generalSchedule, tournamentDate } = useParticipantData();
  const searchParams = useSearchParams();
  const buildingParam = searchParams.get("building");

  const [selectedId, setSelectedId] = useState(
    buildingParam ?? mapLocations[0]?.id ?? ""
  );

  useEffect(() => {
    if (buildingParam && mapLocations.some((l) => l.id === buildingParam)) {
      setSelectedId(buildingParam);
    }
  }, [buildingParam, mapLocations]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const { liveBuildingId, liveSlot, nextBuildingId, nextSlot } = useMemo(() => {
    const status = getEventStatus(generalSchedule, tournamentDate);
    let live: ScheduleSlot | null = null;
    let up: ScheduleSlot | null = null;
    if (status.mode === "happening-now") {
      live = status.currentSlot;
      up = status.nextSlot;
    } else if (status.mode === "up-next") {
      up = status.nextSlot;
    } else if (status.mode === "preview") {
      up = status.firstSlot;
    }
    return {
      liveSlot: live,
      nextSlot: up,
      liveBuildingId: live ? getBuildingIdFromLocation(live.location) : null,
      nextBuildingId: up ? getBuildingIdFromLocation(up.location) : null
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalSchedule, tournamentDate, now]);

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(152,28,29,0.1)] p-3 text-[color:var(--crimson)]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Map</p>
            <h1 className="section-title mt-1">Campus Buildings</h1>
          </div>
        </div>
      </section>

      {(liveSlot || nextSlot) && (
        <section className="panel p-4">
          <div className="space-y-2">
            {liveSlot && (
              <EventHint
                kind="live"
                slot={liveSlot}
                building={mapLocations.find((l) => l.id === liveBuildingId) ?? null}
                onGo={() => liveBuildingId && setSelectedId(liveBuildingId)}
              />
            )}
            {nextSlot && (
              <EventHint
                kind="next"
                slot={nextSlot}
                building={mapLocations.find((l) => l.id === nextBuildingId) ?? null}
                onGo={() => nextBuildingId && setSelectedId(nextBuildingId)}
              />
            )}
          </div>
        </section>
      )}

      <section className="panel overflow-hidden p-4">
        <div className="relative h-[20rem] rounded-[1.5rem] border border-[color:var(--line)] overflow-hidden bg-white">
          <img
            src="/smt-map.png"
            alt="Stanford campus"
            className="absolute inset-0 h-full w-full object-contain"
          />

          {mapLocations.map((location) => {
            const isSelected = location.id === selectedId;
            const isLive = location.id === liveBuildingId;
            const isNext = !isLive && location.id === nextBuildingId;
            const kind: MarkerKind = isLive
              ? "live"
              : isNext
                ? "next"
                : isSelected
                  ? "selected"
                  : null;

            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedId(location.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--crimson)]"
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                aria-label={location.name}
                aria-pressed={isSelected}
              >
                <Marker kind={kind} ringed={isSelected && (isLive || isNext)} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        {mapLocations.map((location) => {
          const isSelected = location.id === selectedId;
          const isLive = location.id === liveBuildingId;
          const isNext = !isLive && location.id === nextBuildingId;
          return (
            <button
              key={location.id}
              type="button"
              onClick={() => setSelectedId(location.id)}
              className={`flex w-full items-center justify-between gap-4 rounded-panel border p-4 text-left transition hover:-translate-y-0.5 ${
                isSelected
                  ? "border-[color:var(--crimson)] bg-[rgba(152,28,29,0.06)] shadow-lift"
                  : "border-white/70 bg-white/80 shadow-lift backdrop-blur"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${isSelected ? "text-[color:var(--crimson)]" : "text-[color:var(--ink)]"}`}>
                    {location.name}
                  </p>
                  {isLive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--crimson)] px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Radio className="h-2.5 w-2.5 animate-pulse" />
                      Live
                    </span>
                  )}
                  {isNext && (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--crimson)]/40 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--crimson)]">
                      Next
                    </span>
                  )}
                </div>
                <p className="text-xs text-[color:var(--ink-soft)]">{location.description}</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                isSelected
                  ? "border-[color:var(--crimson)]/20 bg-[color:var(--crimson)] text-white"
                  : "border-white/70 bg-white/85 text-[color:var(--ink)]"
              }`}>
                {location.shortLabel}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function Marker({ kind, ringed }: { kind: MarkerKind; ringed: boolean }) {
  if (kind === null) return null;
  const ring = ringed ? "ring-2 ring-[color:var(--crimson)] ring-offset-2 ring-offset-white" : "";

  if (kind === "live") {
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="absolute h-10 w-10 rounded-full bg-[color:var(--crimson)]/30 animate-ping" />
        <span className={`relative h-4 w-4 rounded-full bg-[color:var(--crimson)] shadow-[0_0_0_3px_rgba(255,255,255,0.95)] ${ring}`} />
      </span>
    );
  }

  if (kind === "next") {
    return (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className={`relative h-3.5 w-3.5 rounded-full border-2 border-[color:var(--crimson)] bg-white shadow-sm ${ring}`} />
      </span>
    );
  }

  // selected (no live/next)
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="absolute h-8 w-8 rounded-full bg-[color:var(--crimson)]/20 animate-ping" />
      <span className="relative h-3 w-3 rounded-full bg-[color:var(--crimson)] shadow-[0_0_0_3px_rgba(255,255,255,0.95)]" />
    </span>
  );
}

function EventHint({
  kind,
  slot,
  building,
  onGo
}: {
  kind: "live" | "next";
  slot: ScheduleSlot;
  building: { id: string; name: string; shortLabel: string } | null;
  onGo: () => void;
}) {
  const isLive = kind === "live";
  return (
    <button
      type="button"
      onClick={building ? onGo : undefined}
      disabled={!building}
      className={`flex w-full items-center gap-3 rounded-[1.2rem] border px-3 py-2.5 text-left transition ${
        building ? "hover:-translate-y-0.5" : "cursor-default"
      } ${
        isLive
          ? "border-[color:var(--crimson)]/40 bg-[rgba(152,28,29,0.06)]"
          : "border-[color:var(--line)] bg-white/70"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        {isLive ? (
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[color:var(--crimson)]/30 animate-ping" />
            <span className="relative h-3 w-3 rounded-full bg-[color:var(--crimson)]" />
          </span>
        ) : (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-[color:var(--crimson)] bg-white" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLive ? "text-[color:var(--crimson)]" : "text-[color:var(--ink-soft)]"}`}>
          {isLive ? "Happening now" : "Up next"}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[color:var(--ink)]">{slot.title}</p>
        <p className="truncate text-xs text-[color:var(--ink-soft)]">
          {slot.time} &middot; {building ? building.name : slot.location}
        </p>
      </div>
      {building && (
        <span className="shrink-0 rounded-full bg-[color:var(--crimson)] px-3 py-1 text-[11px] font-semibold text-white">
          Show
        </span>
      )}
    </button>
  );
}
