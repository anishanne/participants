"use client";

import ReactMarkdown from "react-markdown";
import { BellRing } from "lucide-react";
import { useAppState } from "@/components/app-state-provider";

export function AnnouncementsFeed() {
  const { announcements } = useAppState();

  return (
    <div className="space-y-5">
      <section className="panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(220,114,145,0.12)] p-3 text-[color:var(--rose)]">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Announcements</p>
            <h1 className="section-title mt-1">Tournament updates</h1>
            <p className="body-copy mt-2">
              Live announcements from SMT organizers. Check back for schedule changes, reminders, and event info.
            </p>
          </div>
        </div>
      </section>

      {announcements.length === 0 ? (
        <section className="panel-muted p-5 text-center">
          <p className="text-sm text-[color:var(--ink-soft)]">No announcements yet. Check back closer to tournament day.</p>
        </section>
      ) : (
        <section className="space-y-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="panel p-5">
              <p className="eyebrow">{new Date(announcement.createdAt).toLocaleString()}</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-[color:var(--ink)]">
                {announcement.title}
              </h2>
              <div className="markdown mt-3">
                <ReactMarkdown>{announcement.body}</ReactMarkdown>
              </div>
              <p className="mt-4 border-t border-[color:var(--line)] pt-3 text-xs text-[color:var(--ink-soft)]">
                {announcement.author}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
