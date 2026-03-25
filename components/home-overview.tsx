"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Bell,
  CalendarClock,
  Check,
  Circle,
  Download,
  MapPinned,
  MessageSquareText,
  Radio,
  Share2,
  SmartphoneCharging
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import { TOURNAMENT_DATE } from "@/lib/demo-data";
import type { ScheduleSlot } from "@/lib/types";
import { formatDisplayPhone, formatPhone } from "@/lib/utils";

const quickLinks = [
  {
    href: "/schedule",
    label: "Your schedule",
    description: "Full tournament timeline with personalized room assignments.",
    icon: CalendarClock
  },
  {
    href: "/announcements",
    label: "Announcements",
    description: "Live updates, alerts, and targeted student messages.",
    icon: Bell
  },
  {
    href: "/map",
    label: "Campus map",
    description: "Find rooms, halls, and event spaces on campus.",
    icon: MapPinned
  }
];

/* ---------- Time helpers ---------- */

function getTimeLeft(targetDate: string) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}

function parseScheduleTime(timeStr: string, tournamentDate: string): Date {
  const base = new Date(tournamentDate);
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return base;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const result = new Date(base);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

type EventStatus =
  | { mode: "countdown" }
  | { mode: "preview"; firstSlot: ScheduleSlot }
  | { mode: "happening-now"; currentSlot: ScheduleSlot; nextSlot: ScheduleSlot | null }
  | { mode: "up-next"; nextSlot: ScheduleSlot }
  | { mode: "finished" };

function getEventStatus(schedule: ScheduleSlot[], tournamentDate: string): EventStatus {
  const now = new Date();
  const tDay = new Date(tournamentDate);

  if (now.toDateString() !== tDay.toDateString()) {
    if (now < tDay && schedule.length > 0) return { mode: "preview", firstSlot: schedule[0] };
    if (now > tDay) return { mode: "finished" };
    return { mode: "countdown" };
  }

  // Tournament day — find current/next
  for (let i = 0; i < schedule.length; i++) {
    const slotStart = parseScheduleTime(schedule[i].time, tournamentDate);
    const slotEnd = i + 1 < schedule.length
      ? parseScheduleTime(schedule[i + 1].time, tournamentDate)
      : new Date(slotStart.getTime() + 90 * 60 * 1000); // assume 90 min for last

    if (now >= slotStart && now < slotEnd) {
      return {
        mode: "happening-now",
        currentSlot: schedule[i],
        nextSlot: i + 1 < schedule.length ? schedule[i + 1] : null
      };
    }

    if (now < slotStart) {
      return { mode: "up-next", nextSlot: schedule[i] };
    }
  }

  return { mode: "finished" };
}

/* ---------- Main component ---------- */

export function HomeOverview() {
  const { announcements, generalSchedule, preferences, updatePreferences } = useAppState();

  const setupDone =
    preferences.homeScreenPinned && preferences.notificationsEnabled && preferences.phoneVerified;

  const [eventStatus, setEventStatus] = useState<EventStatus>(() =>
    getEventStatus(generalSchedule, TOURNAMENT_DATE)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setEventStatus(getEventStatus(generalSchedule, TOURNAMENT_DATE));
    }, 30_000); // re-check every 30 seconds
    return () => clearInterval(interval);
  }, [generalSchedule]);

  const latestAnnouncement = announcements[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="panel relative overflow-hidden bg-[linear-gradient(140deg,rgba(74,14,14,0.96),rgba(152,28,29,0.88))] px-5 py-6 text-white">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[rgba(220,114,145,0.2)] blur-2xl" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <Image
              src="/smt-logo.png"
              alt="SMT Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="pill border-white/20 bg-white/10 text-white">SMT 2026</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Stanford Math Tournament</h1>
            <p className="mt-1 text-sm text-white/74">
              April 18, 2026 &middot; Stanford University
            </p>
          </div>
          <Countdown targetDate={TOURNAMENT_DATE} />
          <div className="flex flex-wrap gap-2">
            <StatusPill done={preferences.homeScreenPinned} label="Home screen" />
            <StatusPill done={preferences.notificationsEnabled} label="Push" />
            <StatusPill done={preferences.phoneVerified} label="SMS" />
          </div>
        </div>
      </section>

      {/* Setup checklist (if incomplete) */}
      {!setupDone ? <SetupChecklist /> : null}

      {/* Event status: Happening Now / Up Next / Preview */}
      <EventStatusCard status={eventStatus} />

      {/* Latest announcement */}
      {latestAnnouncement ? (
        <section className="panel p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Latest Announcement</p>
              <Link
                href="/announcements"
                className="text-xs font-medium text-[color:var(--crimson)] transition hover:underline"
              >
                See all &rarr;
              </Link>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
              {latestAnnouncement.title}
            </h2>
            <div className="markdown line-clamp-3">
              <ReactMarkdown>{latestAnnouncement.body}</ReactMarkdown>
            </div>
            <p className="text-xs text-[color:var(--ink-soft)]">
              {new Date(latestAnnouncement.createdAt).toLocaleString()} &middot; {latestAnnouncement.author}
            </p>
          </div>
        </section>
      ) : null}

      {/* Quick links */}
      <section className="panel p-5">
        <div className="space-y-3">
          <div>
            <p className="eyebrow">Quick Jump</p>
            <h2 className="section-title mt-1">Move through the event in one tap.</h2>
          </div>
          <div className="space-y-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 rounded-[1.4rem] border border-[color:var(--line)] bg-white/82 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="rounded-2xl bg-[rgba(59,28,28,0.06)] p-3 text-[color:var(--ink)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</p>
                    <p className="text-sm text-[color:var(--ink-soft)]">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Countdown ---------- */

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2">
      <CountdownUnit value={timeLeft.days} label="Days" />
      <CountdownUnit value={timeLeft.hours} label="Hours" />
      <CountdownUnit value={timeLeft.minutes} label="Min" />
      <CountdownUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-center backdrop-blur">
      <p className="text-xl font-bold tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}

/* ---------- Event status card ---------- */

function EventStatusCard({ status }: { status: EventStatus }) {
  if (status.mode === "countdown") return null;

  if (status.mode === "finished") {
    return (
      <section className="panel p-5">
        <div className="space-y-2 text-center">
          <p className="eyebrow">SMT 2026</p>
          <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
            That&apos;s a wrap! Thanks for competing.
          </h2>
        </div>
      </section>
    );
  }

  if (status.mode === "preview") {
    return (
      <section className="panel p-5">
        <div className="space-y-3">
          <p className="eyebrow">Coming Up on April 18</p>
          <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
            {status.firstSlot.title}
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)]">
            {status.firstSlot.time} &middot; {status.firstSlot.location}
          </p>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            View full schedule
          </Link>
        </div>
      </section>
    );
  }

  if (status.mode === "happening-now") {
    return (
      <div className="space-y-3">
        <section className="panel relative overflow-hidden border-[rgba(152,28,29,0.3)] p-5">
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--crimson)] px-3 py-1 text-xs font-semibold text-white">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Happening Now</p>
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
              {status.currentSlot.title}
            </h2>
            <p className="text-sm text-[color:var(--ink-soft)]">
              {status.currentSlot.time} &middot; {status.currentSlot.location}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Schedule
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
            >
              <MapPinned className="h-3.5 w-3.5" />
              Map
            </Link>
          </div>
        </section>
        {status.nextSlot ? (
          <section className="panel-muted p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Up Next</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{status.nextSlot.title}</p>
                <p className="text-xs text-[color:var(--ink-soft)]">
                  {status.nextSlot.time} &middot; {status.nextSlot.location}
                </p>
              </div>
              <span className="pill">{status.nextSlot.track}</span>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  // up-next
  return (
    <section className="panel p-5">
      <div className="space-y-3">
        <p className="eyebrow">Up Next</p>
        <h2 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
          {status.nextSlot.title}
        </h2>
        <p className="text-sm text-[color:var(--ink-soft)]">
          {status.nextSlot.time} &middot; {status.nextSlot.location}
        </p>
        {status.nextSlot.track ? <span className="pill">{status.nextSlot.track}</span> : null}
        <div className="flex gap-2 pt-1">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Full schedule
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/82 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
          >
            <MapPinned className="h-3.5 w-3.5" />
            Find on map
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Status pill with colored dot ---------- */

function StatusPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="pill border-white/15 bg-white/10 text-white">
      <span
        className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      {label} {done ? "on" : "pending"}
    </span>
  );
}

/* ---------- Setup checklist ---------- */

function SetupChecklist() {
  const { preferences, updatePreferences } = useAppState();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [notifRequesting, setNotifRequesting] = useState(false);

  // Phone verification state
  const [showPhoneFlow, setShowPhoneFlow] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(preferences.phoneNumber);
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phonePending, setPhonePending] = useState(false);

  const updatePreferencesRef = useRef(updatePreferences);

  useEffect(() => {
    updatePreferencesRef.current = updatePreferences;
  }, [updatePreferences]);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(window.navigator.standalone);

    if (installed) {
      updatePreferencesRef.current({ homeScreenPinned: true, installPromptDismissed: false });
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      updatePreferencesRef.current({ homeScreenPinned: true, installPromptDismissed: false });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  const completedSteps = [
    preferences.homeScreenPinned,
    preferences.notificationsEnabled,
    preferences.phoneVerified
  ].filter(Boolean).length;

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        updatePreferences({ homeScreenPinned: true, installPromptDismissed: false });
      }
    }
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      setNotifPermission("unsupported");
      return;
    }
    setNotifRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      updatePreferences({ notificationsEnabled: permission === "granted" });
    } finally {
      setNotifRequesting(false);
    }
  }

  async function startPhoneVerification() {
    setPhonePending(true);
    setPhoneError("");
    try {
      const response = await fetch("/api/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", phoneNumber })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start verification.");
      setVerificationId(data.verificationId);
      setPreviewCode(data.previewCode ?? "");
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Could not start verification.");
    } finally {
      setPhonePending(false);
    }
  }

  async function confirmPhoneVerification() {
    setPhonePending(true);
    setPhoneError("");
    try {
      const response = await fetch("/api/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", verificationId, code })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not confirm verification.");
      updatePreferences({ phoneNumber: data.phoneNumber, phoneVerified: true });
      setVerificationId("");
      setPreviewCode("");
      setCode("");
      setShowPhoneFlow(false);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Could not confirm verification.");
    } finally {
      setPhonePending(false);
    }
  }

  return (
    <section className="panel p-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Setup</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Get ready for tournament day
            </h2>
          </div>
          <span className="pill">{completedSteps}/3</span>
        </div>

        <SetupStepRow
          done={preferences.homeScreenPinned}
          label="Add to home screen"
          detail={
            preferences.homeScreenPinned ? (
              "App is pinned"
            ) : isIos && !installEvent ? (
              <span className="inline-flex items-center gap-1 text-xs text-[color:var(--ink-soft)]">
                <Share2 className="h-3 w-3" /> Tap Share then Add to Home Screen
              </span>
            ) : null
          }
          action={
            !preferences.homeScreenPinned && installEvent ? (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Download className="h-3 w-3" />
                Install
              </button>
            ) : null
          }
        />

        <SetupStepRow
          done={preferences.notificationsEnabled}
          label="Enable push alerts"
          detail={
            preferences.notificationsEnabled
              ? "Notifications on"
              : notifPermission === "denied"
                ? "Blocked in browser settings"
                : notifPermission === "unsupported"
                  ? "Not supported in this browser"
                  : null
          }
          action={
            !preferences.notificationsEnabled &&
            notifPermission !== "denied" &&
            notifPermission !== "unsupported" ? (
              <button
                type="button"
                onClick={requestNotifications}
                disabled={notifRequesting}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
              >
                <Bell className="h-3 w-3" />
                {notifRequesting ? "Requesting..." : "Enable"}
              </button>
            ) : null
          }
        />

        <SetupStepRow
          done={preferences.phoneVerified}
          label="Verify phone for SMS"
          detail={
            preferences.phoneVerified
              ? `Texts go to ${formatDisplayPhone(preferences.phoneNumber)}`
              : "Optional backup channel"
          }
          action={
            !preferences.phoneVerified && !showPhoneFlow ? (
              <button
                type="button"
                onClick={() => setShowPhoneFlow(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <MessageSquareText className="h-3 w-3" />
                Verify
              </button>
            ) : null
          }
        />

        {showPhoneFlow && !preferences.phoneVerified ? (
          <div className="space-y-3 rounded-[1.4rem] border border-[rgba(220,114,145,0.18)] bg-[rgba(255,245,248,0.84)] p-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[color:var(--ink)]">Mobile Number</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(formatPhone(event.target.value))}
                placeholder="(555) 555-5555"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--crimson)]"
                inputMode="numeric"
              />
            </label>
            {verificationId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--rose)]">
                  <SmartphoneCharging className="h-4 w-4" />
                  Enter the verification code
                </div>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--rose)]"
                  inputMode="numeric"
                />
                {previewCode ? (
                  <p className="rounded-2xl border border-dashed border-[rgba(220,114,145,0.25)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                    Demo mode code: <strong>{previewCode}</strong>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={confirmPhoneVerification}
                  disabled={phonePending || code.length < 6}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--rose)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-70"
                >
                  {phonePending ? "Verifying..." : "Confirm Number"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startPhoneVerification}
                disabled={phonePending || phoneNumber.replace(/\D/g, "").length < 10}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
              >
                {phonePending ? "Sending Code..." : "Send Verification Code"}
              </button>
            )}
            {phoneError ? (
              <p className="text-sm text-[color:var(--crimson)]">{phoneError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- Setup step row ---------- */

function SetupStepRow({
  action,
  detail,
  done,
  label
}: {
  action: React.ReactNode;
  detail: React.ReactNode;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.2rem] border border-[color:var(--line)] bg-white/60 px-4 py-3">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done
            ? "bg-emerald-100 text-emerald-600"
            : "border border-[color:var(--line)] text-[color:var(--ink-soft)]"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-[color:var(--ink-soft)] line-through" : "text-[color:var(--ink)]"}`}>
          {label}
        </p>
        {detail ? (
          <p className="mt-0.5 text-xs text-[color:var(--ink-soft)] truncate">{detail}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
