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
          </div>
        </div>
      </section>

      {announcements.length === 0 ? (
        <section className="panel-muted p-5 text-center space-y-2">
          <p className="text-sm text-[color:var(--ink-soft)]">No announcements yet. Check back closer to tournament day.</p>
          <a href="mailto:info@stanfordmathtournament.org" className="text-xs text-[color:var(--ink-soft)] hover:underline">
            Questions? Contact us at info@stanfordmathtournament.org
          </a>
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
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
