"use client";

import { Compass, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useParticipantData } from "@/components/app-state-provider";

export function CampusMap() {
  const { mapLocations } = useParticipantData();
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

  const selected = mapLocations.find((l) => l.id === selectedId) ?? mapLocations[0];

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

      <section className="panel overflow-hidden p-4">
        <div className="relative h-[20rem] rounded-[1.5rem] border border-[color:var(--line)] overflow-hidden">
          {/* OpenStreetMap tiles stitched at z17, centered on Stanford Science & Engineering area */}
          <img
            src="/campus-map.png"
            alt="Stanford campus"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />

          {mapLocations.map((location) => {
            const isSelected = location.id === selectedId;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedId(location.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition ${
                  isSelected ? "z-10 scale-110" : "hover:scale-105"
                }`}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                aria-label={location.name}
              >
                <div className={`flex items-center gap-1.5 rounded-full border-2 px-2 py-1 text-[10px] font-bold shadow-md ${
                  isSelected
                    ? "border-white bg-[color:var(--crimson)] text-white"
                    : "border-white bg-[color:var(--ink)] text-white"
                }`}>
                  <MapPin className="h-3 w-3" />
                  {location.shortLabel}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        {mapLocations.map((location) => {
          const isSelected = location.id === selectedId;
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
              <div>
                <p className={`text-sm font-semibold ${isSelected ? "text-[color:var(--crimson)]" : "text-[color:var(--ink)]"}`}>
                  {location.name}
                </p>
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
