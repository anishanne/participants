"use client";

import ReactMarkdown from "react-markdown";
import { FileUp, Megaphone, Plus, SendHorizonal, Trash2, WandSparkles } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useAppState } from "@/components/app-state-provider";

const defaultAnnouncementBody = `## Tournament update

- Rooms open 15 minutes before each session
- Use targeted blasts for student-specific reroutes
- Toggle SMS when the update matters away from the app`;

export function AdminDashboard() {
  const {
    addScheduleSlot,
    announcements,
    generalSchedule,
    importOverrideCsv,
    publishAnnouncement,
    removeScheduleSlot,
    updateScheduleSlot
  } = useAppState();
  const [csvStatus, setCsvStatus] = useState("");
  const [announcement, setAnnouncement] = useState({
    title: "New announcement",
    body: defaultAnnouncementBody,
    smsEnabled: true,
    pushEnabled: true
  });
  const deferredBody = useDeferredValue(announcement.body);
  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    const result = importOverrideCsv(text);

    setCsvStatus(
      `Imported ${result.importedStudents} students. Matched columns: ${
        result.matchedColumns.join(", ") || "none"
      }. ${result.unmatchedColumns.length ? `Unmatched: ${result.unmatchedColumns.join(", ")}.` : ""}`
    );
  }

  function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    publishAnnouncement({
      title: announcement.title,
      body: announcement.body,
      smsEnabled: announcement.smsEnabled,
      pushEnabled: announcement.pushEnabled
    });

    setAnnouncement((current) => ({
      ...current,
      title: "",
      body: defaultAnnouncementBody
    }));
  }

  return (
    <div className="space-y-5">
      <section className="panel bg-[linear-gradient(145deg,rgba(74,14,14,0.96),rgba(152,28,29,0.9))] p-5 text-white">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.28em] text-white/68">SMT 2026 Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Schedules, announcements, and SMS targeting.</h1>
          <p className="max-w-md text-sm leading-6 text-white/76">
            Demo-persistent in local storage. Structured to hand off to Supabase tables and edge functions.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="pill border-white/18 bg-white/10 text-white">
              Supabase {supabaseReady ? "connected" : "ready to wire"}
            </span>
            <span className="pill border-white/18 bg-white/10 text-white">Markdown preview included</span>
            <span className="pill border-white/18 bg-white/10 text-white">Student-targeted blasts supported</span>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">General Schedule</p>
            <h2 className="section-title mt-1">Editable admin timeline</h2>
            <p className="body-copy mt-2">
              Slot slugs are what the CSV importer uses to map student-specific replacements into the right time block.
            </p>
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
          {generalSchedule.map((slot) => (
            <article key={slot.id} className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Time"
                  value={slot.time}
                  onChange={(value) => updateScheduleSlot(slot.id, { time: value })}
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

      <section className="panel p-5">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">CSV Overrides</p>
            <h2 className="section-title mt-1">Import personalized substitutions</h2>
            <p className="body-copy mt-2">
              Upload a CSV with `studentId` plus schedule slugs like `CheckIn`, `Power`, or any other slot slug
              you define above.
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[1.4rem] border border-dashed border-[rgba(220,114,145,0.28)] bg-[rgba(255,245,248,0.75)] px-4 py-6 text-sm font-medium text-[color:var(--rose)]">
            <FileUp className="h-4 w-4" />
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          {csvStatus ? <p className="text-sm text-[color:var(--ink-soft)]">{csvStatus}</p> : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handlePublish} className="panel space-y-4 p-5">
          <div>
            <p className="eyebrow">Announcements</p>
            <h2 className="section-title mt-1">Compose once, send through the app and SMS.</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow
              label="Send Push"
              checked={announcement.pushEnabled}
              onChange={(checked) => setAnnouncement((current) => ({ ...current, pushEnabled: checked }))}
            />
            <ToggleRow
              label="Send SMS"
              checked={announcement.smsEnabled}
              onChange={(checked) => setAnnouncement((current) => ({ ...current, smsEnabled: checked }))}
            />
          </div>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--crimson)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <SendHorizonal className="h-4 w-4" />
            Publish Announcement
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

      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[color:var(--crimson)]" />
          <div>
            <p className="eyebrow">Recent Sends</p>
            <h2 className="section-title mt-1">Published announcements</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {announcements.map((item) => (
            <article key={item.id} className="rounded-[1.4rem] border border-[color:var(--line)] bg-white/75 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {item.pushEnabled ? <span className="pill">Push</span> : null}
                  {item.smsEnabled ? <span className="pill">SMS</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
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
