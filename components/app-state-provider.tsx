"use client";

import Papa from "papaparse";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { MAP_LOCATIONS } from "@/lib/demo-data";
import type {
  Announcement,
  CsvImportResult,
  MapLocation,
  ParticipantPreferences,
  ScheduleSlot,
  StudentScheduleOverrides
} from "@/lib/types";
import { parseStudentOverrideCsv } from "@/lib/utils";

const PREFS_KEY = "smt-user-prefs";

interface AppStateContextValue {
  preferences: ParticipantPreferences;
  updatePreferences: (patch: Partial<ParticipantPreferences>) => void;
  generalSchedule: ScheduleSlot[];
  addScheduleSlot: () => void;
  removeScheduleSlot: (slotId: string) => void;
  updateScheduleSlot: (slotId: string, patch: Partial<ScheduleSlot>) => void;
  personalizedOverrides: StudentScheduleOverrides;
  importOverrideCsv: (csvText: string) => CsvImportResult;
  announcements: Announcement[];
  refreshAnnouncements: () => Promise<void>;
  tournamentDate: string;
  mapLocations: MapLocation[];
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const DEFAULT_PREFERENCES: ParticipantPreferences = {
  studentId: "",
  phoneNumber: "",
  phoneVerified: false,
  notificationsEnabled: false,
  homeScreenPinned: false,
  installPromptDismissed: false
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [generalSchedule, setGeneralSchedule] = useState<ScheduleSlot[]>([]);
  const [personalizedOverrides, setPersonalizedOverrides] = useState<StudentScheduleOverrides>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tournamentDate, setTournamentDate] = useState("2026-04-18T07:00:00-07:00");
  const [hydrated, setHydrated] = useState(false);

  // Load user prefs from localStorage (only studentId + dismissals — not shared data)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ParticipantPreferences>;
        setPreferences((current) => ({ ...current, ...saved }));
      }
    } catch {}

    const homeScreenPinned =
      window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);
    const notificationsEnabled =
      typeof Notification !== "undefined" && Notification.permission === "granted";

    setPreferences((current) => ({
      ...current,
      homeScreenPinned: current.homeScreenPinned || homeScreenPinned,
      notificationsEnabled: current.notificationsEnabled || notificationsEnabled
    }));
    setHydrated(true);
  }, []);

  // Persist only user prefs to localStorage
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({
      studentId: preferences.studentId,
      phoneNumber: preferences.phoneNumber,
      phoneVerified: preferences.phoneVerified,
      installPromptDismissed: preferences.installPromptDismissed
    }));
  }, [hydrated, preferences]);

  // Load schedule + announcements from API on mount
  useEffect(() => {
    async function loadFromApi() {
      try {
        const [scheduleRes, announcementsRes, settingsRes] = await Promise.all([
          fetch("/api/schedule"),
          fetch("/api/announcements"),
          fetch("/api/settings")
        ]);

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setGeneralSchedule(data.map(mapDbSlot));
          }
        }

        if (announcementsRes.ok) {
          const data = await announcementsRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setAnnouncements(data.map(mapDbAnnouncement));
          }
        }

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.tournament_date) {
            setTournamentDate(settings.tournament_date);
          }
        }
      } catch {
        // API unavailable — keep defaults
      }
    }

    loadFromApi();
  }, []);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAnnouncements(data.map(mapDbAnnouncement));
      }
    } catch {}
  }, []);

  function updatePreferences(patch: Partial<ParticipantPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  function addScheduleSlot() {
    const nextIndex = generalSchedule.length + 1;
    const newSlot: ScheduleSlot = {
      id: `slot_${crypto.randomUUID()}`,
      slug: `CustomSlot${nextIndex}`,
      time: "6:00 PM",
      title: "New Schedule Item",
      location: "TBD",
      description: "",
      track: "Custom"
    };

    setGeneralSchedule((current) => [...current, newSlot]);

    fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newSlot.slug,
        title: newSlot.title,
        location: newSlot.location,
        description: newSlot.description,
        track: newSlot.track,
        sort_order: nextIndex
      })
    }).catch(() => {});
  }

  function removeScheduleSlot(slotId: string) {
    setGeneralSchedule((current) => current.filter((slot) => slot.id !== slotId));
    setPersonalizedOverrides((current) => {
      const nextEntries = Object.entries(current).map(([studentId, slots]) => {
        const { [slotId]: removed, ...rest } = slots;
        void removed;
        return [studentId, rest] as const;
      });
      return Object.fromEntries(nextEntries);
    });

    fetch("/api/admin/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId })
    }).catch(() => {});
  }

  function updateScheduleSlot(slotId: string, patch: Partial<ScheduleSlot>) {
    setGeneralSchedule((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );

    fetch("/api/admin/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId, ...patch })
    }).catch(() => {});
  }

  function importOverrideCsv(csvText: string) {
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true
    });

    const { overrides, summary } = parseStudentOverrideCsv(
      parsed.data,
      generalSchedule,
      personalizedOverrides
    );

    startTransition(() => {
      setPersonalizedOverrides(overrides);
    });

    return summary;
  }


  return (
    <AppStateContext.Provider
      value={{
        preferences,
        updatePreferences,
        generalSchedule,
        addScheduleSlot,
        removeScheduleSlot,
        updateScheduleSlot,
        personalizedOverrides,
        importOverrideCsv,
        announcements,
        refreshAnnouncements,
        tournamentDate,
        mapLocations: MAP_LOCATIONS
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}

// Map Supabase row shapes to app types
function mapDbSlot(row: Record<string, unknown>): ScheduleSlot {
  const startsAt = new Date(row.starts_at as string);
  // Force PST display
  const pst = new Date(startsAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const hours = pst.getHours();
  const minutes = pst.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const time = `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;

  return {
    id: row.id as string,
    slug: row.slug as string,
    time,
    title: row.title as string,
    location: row.location as string,
    description: row.description as string,
    track: row.track as string
  };
}

function mapDbAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body_markdown as string,
    createdAt: row.created_at as string,
    author: row.author_name as string,
    smsEnabled: row.sms_enabled as boolean,
    pushEnabled: row.push_enabled as boolean
  };
}
