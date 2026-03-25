"use client";

import { Bell, BellOff, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/app-state-provider";

type BrowserPermission = NotificationPermission | "unsupported";

export function NotificationPermissionCard() {
  const { preferences, updatePreferences } = useAppState();
  const [permission, setPermission] = useState<BrowserPermission>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }

    setRequesting(true);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      updatePreferences({
        notificationsEnabled: nextPermission === "granted"
      });
    } finally {
      setRequesting(false);
    }
  }

  if (preferences.notificationsEnabled || permission === "granted") {
    return (
      <section className="panel overflow-hidden border-[rgba(220,114,145,0.22)] bg-[rgba(244,255,251,0.9)] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(220,114,145,0.12)] p-3 text-[color:var(--rose)]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Push Alerts Enabled</p>
            <h2 className="text-lg font-semibold tracking-tight">You are set for tournament notifications.</h2>
            <p className="body-copy">
              Browser permission is already granted, so announcement blasts can reach this device once delivery is wired
              to your Supabase backend.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden border-[rgba(244,185,66,0.34)] bg-[rgba(255,248,228,0.95)] p-5">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(244,185,66,0.18)] p-3 text-[color:var(--gold)]">
            {permission === "denied" ? <BellOff className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <p className="eyebrow">Enable Push Before You Forget</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Keep real-time announcements turned on.</h2>
            <p className="body-copy mt-2">
              We ask once, on purpose. Accepting notifications now protects your ability to receive urgent room changes,
              schedule edits, and targeted student-only blasts later.
            </p>
          </div>
        </div>
        {permission === "denied" ? (
          <p className="rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
            Notifications are blocked at the browser level. Re-enable them in site settings, then refresh this page.
          </p>
        ) : permission === "unsupported" ? (
          <p className="rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
            This browser does not support notification permissions.
          </p>
        ) : (
          <button
            type="button"
            onClick={requestPermission}
            disabled={requesting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          >
            <Bell className="h-4 w-4" />
            {requesting ? "Requesting Permission..." : "Turn On Push Notifications"}
          </button>
        )}
      </div>
    </section>
  );
}
