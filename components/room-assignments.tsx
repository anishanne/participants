"use client";

import {
  ChevronDown,
  ChevronRight,
  FileUp,
  MapPin,
  Pencil,
  Search,
  Upload,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import {
  getAllStudents,
  lookupStudent,
  type StudentLookupResult,
  type StudentRecord
} from "@/lib/csv-lookup";

type Tab = "upload" | "lookup" | "browse";

export function RoomAssignments() {
  const [tab, setTab] = useState<Tab>("browse");

  return (
    <section className="panel p-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Room Assignments</p>
            <h2 className="section-title mt-1">Student Schedules</h2>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-[color:var(--line)] bg-white/85 p-1">
          {(["browse", "lookup", "upload"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-[color:var(--ink)] text-white" : "text-[color:var(--ink-soft)]"
              }`}
            >
              {t === "browse" ? "Browse" : t === "lookup" ? "Lookup" : "Upload CSV"}
            </button>
          ))}
        </div>

        {tab === "upload" ? <UploadTab /> : null}
        {tab === "lookup" ? <LookupTab /> : null}
        {tab === "browse" ? <BrowseTab /> : null}
      </div>
    </section>
  );
}

/* ========== Upload Tab ========== */

function UploadTab() {
  const { importOverrideCsv } = useAppState();
  const [csvStatus, setCsvStatus] = useState("");
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [csvText, setCsvText] = useState("");

  function downloadSample() {
    const csv = `number,student_name,team_name,team_number,OpeningAwards,PowerTeam,Lunch,Subject,Guts,custom_field.tests
001A,Jane Smith,Mathletes,001,Hewlett 200,Hewlett 201,Huang Courtyard,STLC 111,Hewlett 201,Algebra + Discrete
001B,John Doe,Mathletes,001,Hewlett 200,Hewlett 201,Huang Courtyard,Hewlett 200,Hewlett 201,Calculus + Geometry`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smt-room-assignments-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file.text().then((text) => {
      setCsvText(text);
      setCsvStatus("");

      // Parse for preview
      import("papaparse").then(({ default: Papa }) => {
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true
        });
        setPreviewRows(parsed.data.slice(0, 50));
      });
    });
  }

  function confirmImport() {
    if (!csvText) return;
    const result = importOverrideCsv(csvText);
    setCsvStatus(
      `Imported ${result.importedStudents} students. Matched: ${
        result.matchedColumns.join(", ") || "none"
      }. ${result.unmatchedColumns.length ? `Unmatched: ${result.unmatchedColumns.join(", ")}.` : ""}`
    );
    setPreviewRows([]);
    setCsvText("");
  }

  const previewCols = previewRows.length > 0
    ? ["number", "student_name", "team_name", "OpeningAwards", "PowerTeam", "Lunch", "Subject", "Guts", "custom_field.tests"].filter(
        (col) => col in previewRows[0]
      )
    : [];

  const colLabels: Record<string, string> = {
    number: "Badge",
    student_name: "Name",
    team_name: "Team",
    OpeningAwards: "Opening",
    PowerTeam: "Power/Team",
    Lunch: "Lunch",
    Subject: "Subject Room",
    Guts: "Guts",
    "custom_field.tests": "Tests"
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-xs text-[color:var(--ink-soft)] space-y-2">
        <p className="font-semibold text-[color:var(--ink)]">Expected CSV columns:</p>
        <p><code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">number</code> (badge #), <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">student_name</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">team_name</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">team_number</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">OpeningAwards</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">PowerTeam</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">Lunch</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">Subject</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">Guts</code>, <code className="rounded bg-[color:var(--canvas-deep)] px-1 py-0.5">custom_field.tests</code></p>
        <p>Room columns contain the assigned room (e.g. &ldquo;Hewlett 201&rdquo;). Tests column contains subject choices (e.g. &ldquo;Algebra + Discrete&rdquo;).</p>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-1 text-[color:var(--crimson)] font-medium hover:underline"
        >
          Download sample CSV
        </button>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[1.4rem] border border-dashed border-[rgba(220,114,145,0.28)] bg-[rgba(255,245,248,0.75)] px-4 py-6 text-sm font-medium text-[color:var(--rose)]">
        <FileUp className="h-4 w-4" />
        Upload CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelect} />
      </label>

      {csvStatus ? <p className="text-sm text-[color:var(--ink-soft)]">{csvStatus}</p> : null}

      {previewRows.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[color:var(--ink)]">
              Preview ({previewRows.length} rows shown)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreviewRows([]); setCsvText(""); }}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink-soft)] transition hover:bg-white"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="inline-flex items-center gap-1 rounded-full bg-[color:var(--crimson)] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
              >
                <Upload className="h-3 w-3" />
                Confirm Import
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[1.2rem] border border-[color:var(--line)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[color:var(--line)] bg-white/60">
                  {previewCols.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 font-semibold text-[color:var(--ink)]">
                      {colLabels[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-[color:var(--line)] last:border-0 hover:bg-white/40">
                    {previewCols.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3 py-2 text-[color:var(--ink-soft)]">
                        {row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ========== Lookup Tab ========== */

function LookupTab() {
  const { generalSchedule } = useAppState();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<StudentLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setNotFound(false);
    const found = await lookupStudent(query.trim());
    if (found) {
      setResult(found);
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  }

  function startEdit(slotId: string, currentValue: string) {
    setEditing(slotId);
    setEditValue(currentValue);
  }

  function saveEdit(slotId: string) {
    if (result) {
      const override = result.overrides[slotId] || {};
      result.overrides[slotId] = { ...override, location: editValue };
      setResult({ ...result });
    }
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-soft)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Badge number (e.g. 001A)"
            className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 py-3 pl-10 pr-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-2xl bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Search
        </button>
      </div>

      {notFound ? (
        <p className="rounded-[1.2rem] border border-[rgba(152,28,29,0.15)] bg-[rgba(152,28,29,0.04)] px-4 py-3 text-sm text-[color:var(--crimson)]">
          No student found for &ldquo;{query}&rdquo;
        </p>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">{result.studentName}</p>
            <p className="text-xs text-emerald-700">
              Team {result.teamNumber} &middot; {result.teamName}
              {result.tests ? ` · ${result.tests}` : ""}
            </p>
          </div>

          <div className="space-y-2">
            {generalSchedule.map((slot) => {
              const override = result.overrides[slot.id];
              const displayTitle = override?.title || slot.title;
              const displayLocation = override?.location || slot.location;
              const isEditing = editing === slot.id;

              return (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3"
                >
                  <div className="w-16 shrink-0 text-xs font-semibold text-[color:var(--ink-soft)]">
                    {slot.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[color:var(--ink)] truncate">{displayTitle}</p>
                    {isEditing ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 rounded-lg border border-[color:var(--line)] bg-white px-2 py-1 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--crimson)]"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(slot.id)}
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(slot.id)}
                          className="rounded-lg bg-[color:var(--ink)] px-2 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs text-[color:var(--ink-soft)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-[color:var(--ink-soft)]" />
                        <span className="text-xs text-[color:var(--ink-soft)]">{displayLocation}</span>
                      </div>
                    )}
                  </div>
                  {override && !isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEdit(slot.id, displayLocation)}
                      className="shrink-0 rounded-lg border border-[color:var(--line)] p-1.5 text-[color:var(--ink-soft)] transition hover:bg-white"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ========== Browse Tab ========== */

function BrowseTab() {
  const { generalSchedule } = useAppState();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<StudentLookupResult | null>(null);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 25;

  useEffect(() => {
    getAllStudents().then((all) => {
      setStudents(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = search
    ? students.filter(
        (s) =>
          s.number.toLowerCase().includes(search.toLowerCase()) ||
          s.studentName.toLowerCase().includes(search.toLowerCase()) ||
          s.teamName.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageStudents = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const expand = useCallback(async (badgeNumber: string) => {
    if (expandedId === badgeNumber) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(badgeNumber);
    const data = await lookupStudent(badgeNumber);
    setExpandedData(data);
  }, [expandedId]);

  // Collect unique rooms for stats
  const roomSet = new Set<string>();
  students.forEach((s) => {
    if (s.openingAwards) roomSet.add(s.openingAwards);
    if (s.powerTeam) roomSet.add(s.powerTeam);
    if (s.subject) roomSet.add(s.subject);
    if (s.guts) roomSet.add(s.guts);
  });

  if (loading) {
    return <p className="text-sm text-[color:var(--ink-soft)]">Loading students...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-center">
          <p className="text-lg font-bold text-[color:var(--ink)]">{students.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-soft)]">Students</p>
        </div>
        <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-center">
          <p className="text-lg font-bold text-[color:var(--ink)]">{roomSet.size}</p>
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-soft)]">Rooms</p>
        </div>
        <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3 text-center">
          <p className="text-lg font-bold text-[color:var(--ink)]">
            {new Set(students.map((s) => s.teamNumber)).size}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-soft)]">Teams</p>
        </div>
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

      {/* Results */}
      <div className="space-y-1">
        {pageStudents.map((student) => {
          const isExpanded = expandedId === student.number;

          return (
            <div key={student.number} className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 overflow-hidden">
              <button
                type="button"
                onClick={() => expand(student.number)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/80"
              >
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />
                  : <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />
                }
                <span className="w-12 shrink-0 text-xs font-bold text-[color:var(--crimson)]">{student.number}</span>
                <span className="flex-1 truncate text-sm font-medium text-[color:var(--ink)]">{student.studentName}</span>
                <span className="hidden text-xs text-[color:var(--ink-soft)] sm:inline">{student.teamName}</span>
              </button>

              {isExpanded && expandedData ? (
                <div className="border-t border-[color:var(--line)] bg-white/40 px-4 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-[color:var(--ink-soft)]">
                    <Users className="h-3 w-3" />
                    Team {expandedData.teamNumber} &middot; {expandedData.teamName}
                    {expandedData.tests ? ` · ${expandedData.tests}` : ""}
                  </div>
                  <div className="space-y-1.5">
                    {generalSchedule.map((slot) => {
                      const override = expandedData.overrides[slot.id];
                      return (
                        <div key={slot.id} className="flex items-center gap-2 text-xs">
                          <span className="w-16 shrink-0 font-semibold text-[color:var(--ink-soft)]">{slot.time}</span>
                          <span className="font-medium text-[color:var(--ink)]">{override?.title || slot.title}</span>
                          <span className="text-[color:var(--ink-soft)]">&middot;</span>
                          <span className="inline-flex items-center gap-1 text-[color:var(--ink-soft)]">
                            <MapPin className="h-2.5 w-2.5" />
                            {override?.location || slot.location}
                          </span>
                          {override?.location ? (
                            <span className="ml-auto rounded-full bg-[rgba(152,28,29,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--crimson)]">
                              Assigned
                            </span>
                          ) : null}
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

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-[color:var(--ink-soft)]">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 font-medium transition hover:bg-white disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 font-medium transition hover:bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
