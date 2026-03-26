"use client";

import Papa from "papaparse";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileUp,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Upload,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import type { ColumnMapping } from "@/lib/csv-import";

type Tab = "browse" | "upload";

export function RoomAssignments() {
  const [tab, setTab] = useState<Tab>("browse");

  return (
    <section className="panel p-5">
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Room Assignments</p>
          <h2 className="section-title mt-1">Student Schedules</h2>
        </div>

        <div className="inline-flex rounded-full border border-[color:var(--line)] bg-white/85 p-1">
          {(["browse", "upload"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
              }`}
            >
              {t === "browse" ? "Browse" : "Upload CSV"}
            </button>
          ))}
        </div>

        {tab === "upload" ? <UploadTab /> : <BrowseTab />}
      </div>
    </section>
  );
}

/* ========== Upload Tab ========== */

interface SlugOption { slug: string; title: string; id: string }

function UploadTab() {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [availableSlugs, setAvailableSlugs] = useState<SlugOption[]>([]);
  const [phase, setPhase] = useState<"select" | "map" | "importing" | "done">("select");
  const [result, setResult] = useState<{ importedStudents: number; overridesCreated: number } | null>(null);
  const [error, setError] = useState("");

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file.text().then((text) => {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setParsedRows(parsed.data);
      setHeaders(parsed.meta.fields ?? []);
      // Send headers to server for auto-matching
      fetch("/api/admin/room-assignments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: parsed.meta.fields })
      })
        .then((res) => res.json())
        .then((data) => {
          setMappings(data.mappings);
          setAvailableSlugs(data.availableSlugs);
          setPhase("map");
        })
        .catch(() => setError("Failed to preview CSV"));
    });
  }

  function updateMapping(csvColumn: string, slugs: string[]) {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn ? { ...m, mappedSlugs: slugs, confidence: "auto" } : m
      )
    );
  }

  async function confirmImport() {
    setPhase("importing");
    setError("");
    try {
      const res = await fetch("/api/admin/room-assignments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, mappings })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        setPhase("map");
        return;
      }
      const data = await res.json();
      setResult(data);
      setPhase("done");
    } catch {
      setError("Import failed");
      setPhase("map");
    }
  }

  if (phase === "done" && result) {
    return (
      <div className="space-y-3 text-center py-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-[color:var(--ink)]">
          Imported {result.importedStudents} students with {result.overridesCreated} room assignments
        </p>
        <button
          type="button"
          onClick={() => { setPhase("select"); setParsedRows([]); setHeaders([]); setMappings([]); setResult(null); }}
          className="text-xs text-[color:var(--crimson)] hover:underline"
        >
          Upload another
        </button>
      </div>
    );
  }

  if (phase === "importing") {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[color:var(--ink-soft)]" />
        <p className="text-sm text-[color:var(--ink-soft)]">Importing {parsedRows.length} students...</p>
      </div>
    );
  }

  if (phase === "map") {
    const roomMappings = mappings.filter((m) => !m.isMeta && !m.isTests && m.confidence !== "none");
    const metaMappings = mappings.filter((m) => m.isMeta);
    const testsMappings = mappings.filter((m) => m.isTests);
    const skippedCount = mappings.filter((m) => m.confidence === "none" && !m.isMeta && !m.isTests).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[color:var(--ink)]">
            {parsedRows.length} rows &middot; {headers.length} columns &middot; {skippedCount} skipped
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setPhase("select"); setParsedRows([]); }}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink-soft)]"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={confirmImport}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--crimson)] px-4 py-1.5 text-xs font-semibold text-white hover:brightness-105"
            >
              <Upload className="h-3 w-3" /> Confirm Import
            </button>
          </div>
        </div>

        {error ? <p className="text-xs text-[color:var(--crimson)]">{error}</p> : null}

        {/* Meta columns */}
        {metaMappings.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[color:var(--ink-soft)]">Metadata columns</p>
            {metaMappings.map((m) => (
              <div key={m.csvColumn} className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2 text-xs">
                <span className="font-medium text-[color:var(--ink)]">{m.csvColumn}</span>
                <span className="rounded-full bg-[rgba(59,28,28,0.06)] px-2 py-0.5 text-[color:var(--ink-soft)]">Metadata</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Tests */}
        {testsMappings.map((m) => (
          <div key={m.csvColumn} className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2 text-xs">
            <span className="font-medium text-[color:var(--ink)]">{m.csvColumn}</span>
            <span className="rounded-full bg-[rgba(220,114,145,0.1)] px-2 py-0.5 text-[color:var(--rose)]">Tests → Subject slots</span>
          </div>
        ))}

        {/* Room column mappings */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[color:var(--ink-soft)]">Room columns</p>
          {roomMappings.map((m) => (
            <div key={m.csvColumn} className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-white/60 px-3 py-2 text-xs">
              <span className="w-32 shrink-0 font-medium text-[color:var(--ink)] truncate">{m.csvColumn}</span>
              <span className="text-[color:var(--ink-soft)]">→</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {m.mappedSlugs.map((slug) => (
                  <span key={slug} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    {slug}
                    <button
                      type="button"
                      onClick={() => updateMapping(m.csvColumn, m.mappedSlugs.filter((s) => s !== slug))}
                      className="hover:text-emerald-900"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) updateMapping(m.csvColumn, [...m.mappedSlugs, e.target.value]);
                }}
                className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1 text-xs text-[color:var(--ink)]"
              >
                <option value="">+ Add slug</option>
                {availableSlugs
                  .filter((s) => !m.mappedSlugs.includes(s.slug))
                  .map((s) => (
                    <option key={s.slug} value={s.slug}>{s.slug} ({s.title})</option>
                  ))}
              </select>
            </div>
          ))}
        </div>

        {/* Unmapped columns that might be rooms */}
        {mappings.filter((m) => !m.isMeta && !m.isTests && m.confidence === "none" && !headers.some((h) => h === m.csvColumn && mappings.find((mm) => mm.csvColumn === h)?.mappedSlugs.length)).length > 0 ? (
          <details className="text-xs text-[color:var(--ink-soft)]">
            <summary className="cursor-pointer font-medium">Skipped columns ({skippedCount})</summary>
            <div className="mt-1 space-y-0.5 pl-4">
              {mappings.filter((m) => m.confidence === "none" && !m.isMeta && !m.isTests).map((m) => (
                <p key={m.csvColumn}>{m.csvColumn}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  // Phase: select
  return (
    <div className="space-y-4">
      <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-xs text-[color:var(--ink-soft)] space-y-2">
        <p className="font-semibold text-[color:var(--ink)]">Upload a CSV with student room assignments</p>
        <p>Must include a <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">number</code> column for badge numbers. Room columns will be auto-matched to schedule slots.</p>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[1.4rem] border border-dashed border-[rgba(220,114,145,0.28)] bg-[rgba(255,245,248,0.75)] px-4 py-6 text-sm font-medium text-[color:var(--rose)]">
        <FileUp className="h-4 w-4" />
        Select CSV File
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
      </label>

      {error ? <p className="text-xs text-[color:var(--crimson)]">{error}</p> : null}
    </div>
  );
}

/* ========== Browse Tab ========== */

interface StudentRow {
  badge_number: string;
  student_name: string;
  team_name: string;
  team_number: string;
  tests: string;
}

function BrowseTab() {
  const { generalSchedule } = useAppState();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, { title?: string; location?: string }>>({});
  const [expandedMeta, setExpandedMeta] = useState<StudentRow | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/room-assignments/students?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) return;
      const data = await res.json();
      setStudents(data.students);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  async function expand(badge: string) {
    if (expandedBadge === badge) {
      setExpandedBadge(null);
      return;
    }
    setExpandedBadge(badge);
    const res = await fetch(`/api/student/${encodeURIComponent(badge)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data) {
      setExpandedOverrides(data.overrides ?? {});
      setExpandedMeta(data);
    }
  }

  async function saveEdit(badge: string, slotSlug: string) {
    const slot = generalSchedule.find((s) => s.slug === slotSlug);
    if (!slot) return;
    await fetch("/api/admin/room-assignments/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badge, scheduleSlotId: slot.id, location: editValue })
    });
    setEditing(null);
    // Refresh expanded view
    expand(badge);
    // Force re-expand
    setExpandedBadge(null);
    setTimeout(() => expand(badge), 100);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats
  const roomSet = new Set<string>();
  const teamSet = new Set<string>();
  students.forEach((s) => { if (s.team_number) teamSet.add(s.team_number); });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <StatBox value={total} label="Students" />
        <StatBox value={teamSet.size} label="Teams" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-soft)]" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by badge, name, or team..."
          className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 py-3 pl-10 pr-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[color:var(--ink-soft)]" />
        </div>
      ) : students.length === 0 ? (
        <p className="py-4 text-center text-sm text-[color:var(--ink-soft)]">
          {search ? "No students match your search." : "No students imported yet. Upload a CSV to get started."}
        </p>
      ) : (
        <div className="space-y-1">
          {students.map((student) => {
            const isExpanded = expandedBadge === student.badge_number;

            return (
              <div key={student.badge_number} className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => expand(student.badge_number)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/80"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />}
                  <span className="w-12 shrink-0 text-xs font-bold text-[color:var(--crimson)]">{student.badge_number}</span>
                  <span className="flex-1 truncate text-sm font-medium text-[color:var(--ink)]">{student.student_name}</span>
                  <span className="hidden text-xs text-[color:var(--ink-soft)] sm:inline">{student.team_name}</span>
                </button>

                {isExpanded && expandedMeta ? (
                  <div className="border-t border-[color:var(--line)] bg-white/40 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
                      <Users className="h-3 w-3" />
                      Team {expandedMeta.team_number} &middot; {expandedMeta.team_name}
                      {expandedMeta.tests ? ` · ${expandedMeta.tests}` : ""}
                    </div>
                    <div className="space-y-1.5">
                      {generalSchedule.map((slot) => {
                        const override = expandedOverrides[slot.slug];
                        const isEditing = editing === slot.slug;
                        return (
                          <div key={slot.id} className="flex items-center gap-2 text-xs">
                            <span className="w-16 shrink-0 font-semibold text-[color:var(--ink-soft)]">{slot.time}</span>
                            <span className="font-medium text-[color:var(--ink)]">{override?.title || slot.title}</span>
                            <span className="text-[color:var(--ink-soft)]">&middot;</span>
                            {isEditing ? (
                              <div className="flex gap-1 flex-1">
                                <input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 rounded border border-[color:var(--line)] bg-white px-2 py-0.5 text-xs outline-none"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && saveEdit(student.badge_number, slot.slug)}
                                />
                                <button type="button" onClick={() => saveEdit(student.badge_number, slot.slug)} className="rounded bg-[color:var(--ink)] px-2 py-0.5 text-white">Save</button>
                                <button type="button" onClick={() => setEditing(null)} className="rounded border border-[color:var(--line)] px-2 py-0.5">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 text-[color:var(--ink-soft)]">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {override?.location || slot.location}
                                </span>
                                {override?.location ? (
                                  <span className="rounded-full bg-[rgba(152,28,29,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--crimson)]">Assigned</span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => { setEditing(slot.slug); setEditValue(override?.location || slot.location); }}
                                  className="ml-auto shrink-0 rounded border border-[color:var(--line)] p-1 text-[color:var(--ink-soft)] hover:bg-white"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-[color:var(--ink-soft)]">
          <span>Page {page + 1} of {totalPages} ({total} students)</span>
          <div className="flex gap-1">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 font-medium disabled:opacity-40">Prev</button>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 font-medium disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-center">
      <p className="text-lg font-bold text-[color:var(--ink)]">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-soft)]">{label}</p>
    </div>
  );
}
