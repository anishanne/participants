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
import type { ColumnMapping } from "@/lib/csv-import";
import type { ScheduleSlot } from "@/lib/types";

type Tab = "browse" | "upload";

export function RoomAssignments({ scheduleSlots }: { scheduleSlots: ScheduleSlot[] }) {
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

        {tab === "upload" ? <UploadTab /> : <BrowseTab scheduleSlots={scheduleSlots} />}
      </div>
    </section>
  );
}

/* ========== Upload Tab ========== */

interface MappingOption { value: string; label: string; group: string }

function UploadTab() {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [options, setOptions] = useState<MappingOption[]>([]);
  const [phase, setPhase] = useState<"select" | "map" | "importing" | "done">("select");
  const [result, setResult] = useState<{
    importedStudents: number;
    overridesCreated: number;
    studentsRemoved: number;
    overridesRemoved: number;
  } | null>(null);
  const [error, setError] = useState("");

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file.text().then((text) => {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setParsedRows(parsed.data);
      fetch("/api/admin/room-assignments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: parsed.meta.fields })
      })
        .then((res) => res.json())
        .then((data) => {
          setMappings(data.mappings);
          setOptions(data.options);
          setPhase("map");
        })
        .catch(() => setError("Failed to process CSV"));
    });
  }

  function setTargets(csvColumn: string, targets: string[]) {
    setMappings((prev) =>
      prev.map((m) => m.csvColumn === csvColumn ? { ...m, targets, confidence: "high" as const } : m)
    );
  }

  function addTarget(csvColumn: string, target: string) {
    setMappings((prev) =>
      prev.map((m) => m.csvColumn === csvColumn ? { ...m, targets: [...m.targets, target], confidence: "high" as const } : m)
    );
  }

  function removeTarget(csvColumn: string, target: string) {
    setMappings((prev) =>
      prev.map((m) => m.csvColumn === csvColumn ? { ...m, targets: m.targets.filter((t) => t !== target) } : m)
    );
  }

  async function confirmImport() {
    const hasBadge = mappings.some((m) => m.targets.includes("badge_number"));
    if (!hasBadge) {
      setError("You must map one column to Badge Number.");
      return;
    }

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
      setResult(await res.json());
      setPhase("done");
    } catch {
      setError("Import failed");
      setPhase("map");
    }
  }

  // Get sample values for a column (first 3 non-empty)
  function getSamples(col: string): string[] {
    const samples: string[] = [];
    for (const row of parsedRows) {
      const val = (row[col] ?? "").trim();
      if (val && !samples.includes(val)) {
        samples.push(val);
        if (samples.length >= 3) break;
      }
    }
    return samples;
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
        {result.studentsRemoved > 0 || result.overridesRemoved > 0 ? (
          <p className="text-xs text-[color:var(--ink-soft)]">
            Removed {result.studentsRemoved} students and {result.overridesRemoved} stale overrides.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => { setPhase("select"); setParsedRows([]); setMappings([]); setResult(null); }}
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
    const hasBadge = mappings.some((m) => m.targets.includes("badge_number"));
    const mappedCount = mappings.filter((m) => m.targets.length > 0).length;
    const skippedCount = mappings.filter((m) => m.targets.length === 0).length;

    // Detect duplicate meta mappings (badge_number, student_name etc. should only appear once)
    const metaFields = new Set(["badge_number", "student_name", "name_abbreviated", "team_name", "team_number"]);
    const metaCounts = new Map<string, string[]>();
    for (const m of mappings) {
      for (const t of m.targets) {
        if (!metaFields.has(t)) continue;
        const list = metaCounts.get(t) ?? [];
        list.push(m.csvColumn);
        metaCounts.set(t, list);
      }
    }
    const duplicates = new Map<string, string[]>();
    for (const [target, cols] of metaCounts) {
      if (cols.length > 1) duplicates.set(target, cols);
    }
    const hasDuplicates = duplicates.size > 0;

    // Group options for the select
    const groupedOptions = new Map<string, MappingOption[]>();
    for (const opt of options) {
      const list = groupedOptions.get(opt.group) ?? [];
      list.push(opt);
      groupedOptions.set(opt.group, list);
    }

    const canImport = hasBadge && !hasDuplicates;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--ink)]">
              {parsedRows.length} rows &middot; {mappedCount} mapped &middot; {skippedCount} skipped
            </p>
            {!hasBadge ? (
              <p className="text-xs text-[color:var(--crimson)]">A Badge Number column is required</p>
            ) : null}
            {hasDuplicates ? (
              <p className="text-xs text-[color:var(--crimson)]">
                Duplicate mapping: {Array.from(duplicates.entries()).map(([t, cols]) => `"${cols.join("\" and \"")}" both map to ${t}`).join("; ")}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setPhase("select"); setParsedRows([]); setMappings([]); }}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink-soft)]"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={!canImport}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--crimson)] px-4 py-1.5 text-xs font-semibold text-white hover:brightness-105 disabled:opacity-50"
            >
              <Upload className="h-3 w-3" /> Import
            </button>
          </div>
        </div>

        {error ? <p className="text-xs text-[color:var(--crimson)]">{error}</p> : null}

        {/* Mapping table */}
        <div className="space-y-1.5">
          {mappings.map((m) => {
            const samples = getSamples(m.csvColumn);
            const isSkip = m.targets.length === 0;
            const hasDuplicateTarget = m.targets.some((t) => duplicates.has(t));

            return (
              <div
                key={m.csvColumn}
                className={`rounded-xl border px-3 py-2.5 ${
                  hasDuplicateTarget
                    ? "border-[color:var(--crimson)] bg-[rgba(152,28,29,0.04)]"
                    : isSkip
                      ? "border-[color:var(--line)] bg-white/30 opacity-50"
                      : "border-emerald-200 bg-emerald-50/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[color:var(--ink)] truncate">{m.csvColumn}</p>
                    {samples.length > 0 ? (
                      <p className="mt-0.5 text-[10px] text-[color:var(--ink-soft)] truncate">
                        {samples.join(" · ")}
                      </p>
                    ) : null}
                    {/* Target chips */}
                    {m.targets.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.targets.map((t) => {
                          const opt = options.find((o) => o.value === t);
                          return (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                              {opt?.label ?? t}
                              <button type="button" onClick={() => removeTarget(m.csvColumn, t)} className="hover:text-emerald-950">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      // If it's a meta field, replace all targets (only one meta per column makes sense)
                      const metaFields = ["badge_number", "student_name", "name_abbreviated", "team_name", "team_number"];
                      if (metaFields.includes(e.target.value)) {
                        setTargets(m.csvColumn, [e.target.value]);
                      } else {
                        addTarget(m.csvColumn, e.target.value);
                      }
                    }}
                    className="shrink-0 rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5 text-xs text-[color:var(--ink)] max-w-[14rem]"
                  >
                    <option value="">{m.targets.length === 0 ? "Select mapping..." : "+ Add mapping"}</option>
                    {Array.from(groupedOptions.entries()).map(([group, opts]) => (
                      <optgroup key={group} label={group}>
                        {opts.filter((opt) => !m.targets.includes(opt.value)).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Phase: select
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.4rem] border border-dashed border-[rgba(220,114,145,0.28)] bg-[rgba(255,245,248,0.75)] px-4 py-8 text-center text-sm font-medium text-[color:var(--rose)]">
        <FileUp className="h-5 w-5" />
        Select CSV File
        <span className="text-xs font-normal text-[color:var(--ink-soft)]">
          Columns will be auto-matched to schedule slots. You can adjust before importing.
        </span>
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
  last_looked_up: string | null;
}

interface StudentDetail {
  studentName: string;
  nameAbbreviated: string;
  teamName: string;
  teamNumber: string;
  tests: string;
  overrides: Record<string, { title?: string; location?: string }>;
}

function BrowseTab({ scheduleSlots }: { scheduleSlots: ScheduleSlot[] }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [detailsByBadge, setDetailsByBadge] = useState<Record<string, StudentDetail | null>>({});
  const [loadingBadges, setLoadingBadges] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [setupCount, setSetupCount] = useState(0);

  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/room-assignments/students?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Could not load students.");
        return;
      }
      const data = await res.json();
      setStudents(data.students);
      setTotal(data.total);
      if (data.teamCount !== undefined) setTeamCount(data.teamCount);
      if (data.setupCount !== undefined) setSetupCount(data.setupCount);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setExpandedBadge(null);
    setEditingKey(null);
  }, [search, page]);

  const fetchStudentDetail = useCallback(async (badge: string) => {
    setLoadingBadges((current) => ({ ...current, [badge]: true }));
    setActionError("");

    try {
      const res = await fetch(`/api/student/${encodeURIComponent(badge)}`);
      if (!res.ok) {
        setDetailsByBadge((current) => ({ ...current, [badge]: null }));
        setActionError("Could not load that student schedule.");
        return null;
      }

      const data = await res.json();
      const detail = (data ?? null) as StudentDetail | null;

      setDetailsByBadge((current) => ({ ...current, [badge]: detail }));

      if (!detail) {
        setActionError("Could not load that student schedule.");
      }

      return detail;
    } catch {
      setDetailsByBadge((current) => ({ ...current, [badge]: null }));
      setActionError("Could not load that student schedule.");
      return null;
    } finally {
      setLoadingBadges((current) => {
        const next = { ...current };
        delete next[badge];
        return next;
      });
    }
  }, []);

  async function toggleExpanded(badge: string) {
    if (expandedBadge === badge) {
      setExpandedBadge(null);
      setEditingKey(null);
      return;
    }

    setExpandedBadge(badge);
    setEditingKey(null);

    if (!(badge in detailsByBadge) || detailsByBadge[badge] === null) {
      await fetchStudentDetail(badge);
    }
  }

  function getEditKey(badge: string, slotSlug: string) {
    return `${badge}:${slotSlug}`;
  }

  async function saveEdit(badge: string, slotSlug: string) {
    const slot = scheduleSlots.find((s) => s.slug === slotSlug);
    if (!slot) return;
    const key = getEditKey(badge, slotSlug);

    setSavingKey(key);
    setActionError("");

    try {
      const res = await fetch("/api/admin/room-assignments/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, scheduleSlotId: slot.id, location: editValue })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Could not save room assignment.");
        return;
      }

      await fetchStudentDetail(badge);
      setEditingKey(null);
    } finally {
      setSavingKey(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <StatBox value={total} label="Students" />
        <StatBox value={teamCount} label="Teams" />
        <StatBox value={setupCount} label="Setup App" />
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

      {actionError ? (
        <div className="rounded-xl border border-[rgba(152,28,29,0.15)] bg-[rgba(152,28,29,0.04)] px-3 py-2 text-xs text-[color:var(--crimson)]">
          {actionError}
        </div>
      ) : null}

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
            const detail = detailsByBadge[student.badge_number];
            const detailLoading = Boolean(loadingBadges[student.badge_number]);

            return (
              <div key={student.badge_number} className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpanded(student.badge_number)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/80"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />}
                  <span className="w-12 shrink-0 text-xs font-bold text-[color:var(--crimson)]">{student.badge_number}</span>
                  <span className="flex-1 truncate text-sm font-medium text-[color:var(--ink)]">{student.student_name}</span>
                  {student.last_looked_up ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Setup</span>
                  ) : null}
                  <span className="hidden text-xs text-[color:var(--ink-soft)] sm:inline">{student.team_name}</span>
                </button>

                {isExpanded ? (
                  <div className="border-t border-[color:var(--line)] bg-white/40 px-4 py-3">
                    {detailLoading && detail === undefined ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-[color:var(--ink-soft)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading student schedule...
                      </div>
                    ) : detail ? (
                      <>
                        <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
                          <Users className="h-3 w-3" />
                          Team {detail.teamNumber} &middot; {detail.teamName}
                          {detail.tests ? ` · ${detail.tests}` : ""}
                        </div>
                        <div className="space-y-1.5">
                          {scheduleSlots.map((slot) => {
                            const override = detail.overrides[slot.slug];
                            const editKey = getEditKey(student.badge_number, slot.slug);
                            const isEditing = editingKey === editKey;
                            const isSaving = savingKey === editKey;

                            return (
                              <div key={slot.id} className="flex items-center gap-2 text-xs">
                                <span className="w-16 shrink-0 font-semibold text-[color:var(--ink-soft)]">{slot.time}</span>
                                <span className="font-medium text-[color:var(--ink)]">{override?.title || slot.title}</span>
                                <span className="text-[color:var(--ink-soft)]">&middot;</span>
                                {isEditing ? (
                                  <div className="flex flex-1 gap-1">
                                    <input
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="flex-1 rounded border border-[color:var(--line)] bg-white px-2 py-0.5 text-xs outline-none"
                                      autoFocus
                                      onKeyDown={(e) => e.key === "Enter" && void saveEdit(student.badge_number, slot.slug)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void saveEdit(student.badge_number, slot.slug)}
                                      disabled={isSaving}
                                      className="rounded bg-[color:var(--ink)] px-2 py-0.5 text-white disabled:opacity-60"
                                    >
                                      {isSaving ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingKey(null)}
                                      disabled={isSaving}
                                      className="rounded border border-[color:var(--line)] px-2 py-0.5 disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
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
                                      onClick={() => {
                                        setEditingKey(editKey);
                                        setEditValue(override?.location || slot.location);
                                      }}
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
                      </>
                    ) : (
                      <p className="text-xs text-[color:var(--ink-soft)]">Could not load this student&apos;s schedule.</p>
                    )}
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
