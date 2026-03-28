"use client";

import ReactMarkdown from "react-markdown";
import { AlertTriangle, Check, Loader2, Megaphone, Pencil, Plus, SendHorizonal, Trash2, WandSparkles, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { RoomAssignments } from "@/components/room-assignments";
import { SkeletonScheduleSlot } from "@/components/skeleton";
import { TOURNAMENT_DATE } from "@/lib/config";
import {
  applySchedulePatch,
  createScheduleStartsAt,
  formatScheduleTime,
  mapScheduleRow,
  toScheduleApiPatch,
  toScheduleTimeInputValue
} from "@/lib/schedule";
import type { ScheduleSlot, ScheduleSlotPatch } from "@/lib/types";

const defaultAnnouncementBody = `## Tournament update

- Rooms open 15 minutes before each session
- Use targeted blasts for student-specific reroutes
- Toggle SMS when the update matters away from the app`;

function useAdminSchedule() {
  const [generalSchedule, setGeneralSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const inflightRef = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingPatchesRef = useRef<Map<string, ScheduleSlotPatch>>(new Map());

  function trackSave(promise: Promise<unknown>) {
    inflightRef.current += 1;
    setSaveStatus("saving");
    clearTimeout(savedTimerRef.current);

    promise.finally(() => {
      inflightRef.current -= 1;
      if (inflightRef.current === 0) {
        setSaveStatus("saved");
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }

  const refreshSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) return;
      const data = await res.json();
      setGeneralSchedule(Array.isArray(data) ? data.map(mapScheduleRow) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSchedule();
  }, [refreshSchedule]);

  useEffect(() => {
    const debounceTimers = debounceTimersRef.current;
    return () => {
      debounceTimers.forEach((timer) => clearTimeout(timer));
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  function addScheduleSlot() {
    const nextIndex = generalSchedule.length + 1;
    const startsAt = createScheduleStartsAt(TOURNAMENT_DATE, "18:00") ?? new Date().toISOString();
    const tempId = `slot_${crypto.randomUUID()}`;
    const newSlot: ScheduleSlot = {
      id: tempId,
      slug: `CustomSlot${nextIndex}`,
      startsAt,
      time: formatScheduleTime(startsAt),
      title: "New Schedule Item",
      location: "TBD",
      description: "",
      track: "Custom"
    };

    setGeneralSchedule((current) => [...current, newSlot]);

    const fetchPromise = fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newSlot.slug,
        starts_at: newSlot.startsAt,
        title: newSlot.title,
        location: newSlot.location,
        description: newSlot.description,
        track: newSlot.track,
        sort_order: nextIndex
      })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to create schedule slot");
        await refreshSchedule();
      })
      .catch(() => {
        setGeneralSchedule((current) => current.filter((slot) => slot.id !== tempId));
        void refreshSchedule();
      });

    trackSave(fetchPromise);
  }

  function removeScheduleSlot(slotId: string) {
    const timer = debounceTimersRef.current.get(slotId);
    if (timer) {
      clearTimeout(timer);
      debounceTimersRef.current.delete(slotId);
      pendingPatchesRef.current.delete(slotId);
    }

    setGeneralSchedule((current) => current.filter((slot) => slot.id !== slotId));

    const fetchPromise = fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId })
    }).catch(() => {
      void refreshSchedule();
    });

    trackSave(fetchPromise);
  }

  function updateScheduleSlot(slotId: string, patch: ScheduleSlotPatch) {
    setGeneralSchedule((current) =>
      current.map((slot) => (slot.id === slotId ? applySchedulePatch(slot, patch) : slot))
    );

    const existing = pendingPatchesRef.current.get(slotId);
    pendingPatchesRef.current.set(slotId, existing ? { ...existing, ...patch } : patch);

    const existingTimer = debounceTimersRef.current.get(slotId);
    if (existingTimer) clearTimeout(existingTimer);

    debounceTimersRef.current.set(
      slotId,
      setTimeout(() => {
        const pending = pendingPatchesRef.current.get(slotId);
        if (!pending) return;
        pendingPatchesRef.current.delete(slotId);
        debounceTimersRef.current.delete(slotId);

        const fetchPromise = fetch("/api/admin/schedule", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: slotId, ...toScheduleApiPatch(pending) })
        }).catch(() => {
          void refreshSchedule();
        });

        trackSave(fetchPromise);
      }, 500)
    );
  }

  return {
    addScheduleSlot,
    generalSchedule,
    loading,
    removeScheduleSlot,
    saveStatus,
    updateScheduleSlot
  };
}

export function AdminDashboard() {
  const {
    addScheduleSlot,
    generalSchedule,
    loading: appLoading,
    removeScheduleSlot,
    saveStatus,
    updateScheduleSlot
  } = useAdminSchedule();
  const [announcement, setAnnouncement] = useState({
    title: "New announcement",
    body: defaultAnnouncementBody,
    smsEnabled: true,
    pushEnabled: true
  });
  const [publishing, setPublishing] = useState(false);
  const [sentReloadKey, setSentReloadKey] = useState(0);
  const deferredBody = useDeferredValue(announcement.body);

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);

    try {
      const response = await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: announcement.title,
          body: announcement.body,
          pushEnabled: announcement.pushEnabled,
          smsEnabled: announcement.smsEnabled
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Publish failed:", data.error);
        return;
      }

      setSentReloadKey((k) => k + 1);

      setAnnouncement((current) => ({
        ...current,
        title: "",
        body: defaultAnnouncementBody
      }));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="panel bg-[linear-gradient(145deg,rgba(74,14,14,0.96),rgba(152,28,29,0.9))] p-5 text-white">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.28em] text-white/68">SMT 2026</p>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        </div>
      </section>


      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Schedule</p>
            <h2 className="section-title mt-1">Tournament Day</h2>
          </div>
          <button
            type="button"
            onClick={addScheduleSlot}
            className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {appLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonScheduleSlot key={i} />
            ))
          ) : null}
          {generalSchedule.map((slot) => (
            <article key={slot.id} className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <TimeField
                  label="Start (PT)"
                  value={toScheduleTimeInputValue(slot.startsAt)}
                  onChange={(value) => {
                    const startsAt = createScheduleStartsAt(TOURNAMENT_DATE, value);
                    if (!startsAt) return;
                    updateScheduleSlot(slot.id, { startsAt });
                  }}
                />
                <Field
                  label="Slug"
                  value={slot.slug}
                  onChange={(value) => updateScheduleSlot(slot.id, { slug: value })}
                />
                <Field
                  label="Title"
                  value={slot.title}
                  onChange={(value) => updateScheduleSlot(slot.id, { title: value })}
                />
                <Field
                  label="Location"
                  value={slot.location}
                  onChange={(value) => updateScheduleSlot(slot.id, { location: value })}
                />
                <Field
                  label="Track"
                  value={slot.track}
                  onChange={(value) => updateScheduleSlot(slot.id, { track: value })}
                />
              </div>
              <label className="mt-3 block space-y-2">
                <span className="text-sm font-medium text-[color:var(--ink)]">Description</span>
                <textarea
                  value={slot.description}
                  onChange={(event) => updateScheduleSlot(slot.id, { description: event.target.value })}
                  className="min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
                />
              </label>
              <button
                type="button"
                onClick={() => removeScheduleSlot(slot.id)}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-[rgba(152,28,29,0.2)] px-4 py-2 text-sm font-medium text-[color:var(--crimson)] transition hover:bg-[rgba(152,28,29,0.06)]"
              >
                <Trash2 className="h-4 w-4" />
                Remove Slot
              </button>
            </article>
          ))}
        </div>
      </section>

      <RoomAssignments scheduleSlots={generalSchedule} />

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handlePublish} className="panel space-y-4 p-5">
          <div>
            <p className="eyebrow">Announcements</p>
            <h2 className="section-title mt-1">New Announcement</h2>
          </div>
          <Field
            label="Title"
            value={announcement.title}
            onChange={(value) => setAnnouncement((current) => ({ ...current, title: value }))}
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[color:var(--ink)]">Markdown Body</span>
            <textarea
              value={announcement.body}
              onChange={(event) => setAnnouncement((current) => ({ ...current, body: event.target.value }))}
              className="min-h-44 w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
            />
          </label>
          <div className={`grid gap-3 ${process.env.NEXT_PUBLIC_SMS_ENABLED === "true" ? "grid-cols-2" : "grid-cols-1"}`}>
            <ToggleRow
              label="Send Push"
              checked={announcement.pushEnabled}
              onChange={(checked) => setAnnouncement((current) => ({ ...current, pushEnabled: checked }))}
            />
            {process.env.NEXT_PUBLIC_SMS_ENABLED === "true" ? (
              <ToggleRow
                label="Send SMS"
                checked={announcement.smsEnabled}
                onChange={(checked) => setAnnouncement((current) => ({ ...current, smsEnabled: checked }))}
              />
            ) : null}
          </div>
          <button
            type="submit"
            disabled={publishing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--crimson)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-70"
          >
            <SendHorizonal className="h-4 w-4" />
            {publishing ? "Publishing..." : "Publish Announcement"}
          </button>
        </form>

        <section className="panel space-y-4 p-5">
          <div className="flex items-center gap-2">
            <WandSparkles className="h-4 w-4 text-[color:var(--gold)]" />
            <p className="eyebrow">Preview</p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/82 p-4">
            <p className="text-lg font-semibold tracking-tight">{announcement.title || "Announcement title"}</p>
            <div className="markdown mt-4">
              <ReactMarkdown>{deferredBody}</ReactMarkdown>
            </div>
          </div>
        </section>
      </section>

      <SentAnnouncements reloadKey={sentReloadKey} />

      {/* Floating save status bar */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-4 py-2.5 shadow-lift backdrop-blur transition-all duration-300 ${
          saveStatus === "idle"
            ? "translate-y-4 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        {saveStatus === "saving" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--crimson)]" />
            <span className="text-sm font-medium text-[color:var(--ink)]">Saving...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-[color:var(--ink)]">Saved!</span>
          </>
        )}
      </div>
    </div>
  );
}

function TimeField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[color:var(--ink)]">{label}</span>
      <input
        type="time"
        step={60}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
      />
    </label>
  );
}

function Field({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[color:var(--ink)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
      />
    </label>
  );
}

/* ---------- Sent announcements with edit ---------- */

interface DbAnnouncement {
  id: string;
  title: string;
  body_markdown: string;
  created_at: string;
  author_name: string;
  push_enabled: boolean;
  sms_enabled: boolean;
}

function SentAnnouncements({ reloadKey }: { reloadKey: number }) {
  const [items, setItems] = useState<DbAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announce");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  function startEdit(item: DbAnnouncement) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditBody(item.body_markdown);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/announce", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title: editTitle, body: editBody })
      });
      await load();
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[color:var(--ink-soft)]" />
          <p className="text-sm text-[color:var(--ink-soft)]">Loading announcements...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-[color:var(--crimson)]" />
        <div>
          <p className="eyebrow">All Announcements</p>
          <h2 className="section-title mt-1">Sent</h2>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 rounded-[1rem] border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Editing updates the announcement text. Push notifications already delivered cannot be changed.
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--ink-soft)]">No announcements yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <article key={item.id} className="rounded-[1.4rem] border border-[color:var(--line)] bg-white/75 px-4 py-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] outline-none focus:border-[color:var(--crimson)]"
                    />
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--crimson)]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
                      >
                        <Check className="h-3 w-3" />
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--ink-soft)]"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--ink-soft)] truncate">{item.body_markdown?.slice(0, 80)}</p>
                      <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                        {new Date(item.created_at).toLocaleString()} &middot; {item.author_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.push_enabled ? <span className="pill">Push</span> : null}
                      {item.sms_enabled ? <span className="pill">SMS</span> : null}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg border border-[color:var(--line)] p-1.5 text-[color:var(--ink-soft)] transition hover:bg-white"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ToggleRow({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-[1.2rem] border border-[color:var(--line)] bg-white/82 px-4 py-3">
      <span className="text-sm font-medium text-[color:var(--ink)]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[color:var(--line)] text-[color:var(--crimson)] focus:ring-[color:var(--crimson)]"
      />
    </label>
  );
}
