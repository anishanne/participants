"use client";

import { Compass, MapPin } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/components/app-state-provider";

export function CampusMap() {
  const { mapLocations } = useAppState();
  const [selectedLocationId, setSelectedLocationId] = useState(mapLocations[0]?.id ?? "");
  const selectedLocation = mapLocations.find((location) => location.id === selectedLocationId) ?? mapLocations[0];

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(152,28,29,0.1)] p-3 text-[color:var(--crimson)]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Map</p>
            <h1 className="section-title mt-1">Stanford Campus</h1>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden p-4">
        <div className="relative h-[22rem] rounded-[1.5rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,251,240,0.8))]">
          <div className="absolute inset-4 rounded-[1.3rem] border-2 border-dashed border-[rgba(59,28,28,0.1)]" />
          <div className="absolute left-[6%] top-[10%] h-[32%] w-[28%] rounded-[1.2rem] bg-[rgba(220,114,145,0.09)]" />
          <div className="absolute left-[40%] top-[12%] h-[28%] w-[46%] rounded-[1.2rem] bg-[rgba(152,28,29,0.07)]" />
          <div className="absolute left-[18%] top-[52%] h-[30%] w-[56%] rounded-[1.2rem] bg-[rgba(244,185,66,0.11)]" />
          {mapLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setSelectedLocationId(location.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[color:var(--ink)] p-2 text-white shadow-lg transition hover:scale-105 ${location.id === selectedLocationId ? "scale-110 bg-[color:var(--crimson)]" : ""
                }`}
              style={{ left: `${location.x}%`, top: `${location.y}%` }}
              aria-label={location.name}
            >
              <MapPin className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      {selectedLocation ? (
        <section className="panel p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{selectedLocation.area}</p>
                <h2 className="text-xl font-semibold tracking-tight">{selectedLocation.name}</h2>
              </div>
              <span className="pill">{selectedLocation.shortLabel}</span>
            </div>
            <p className="body-copy">{selectedLocation.description}</p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {mapLocations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => setSelectedLocationId(location.id)}
            className="panel flex w-full items-center justify-between gap-4 p-4 text-left transition hover:-translate-y-0.5"
          >
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">{location.name}</p>
              <p className="text-sm text-[color:var(--ink-soft)]">{location.area}</p>
            </div>
            <span className="pill">{location.shortLabel}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
