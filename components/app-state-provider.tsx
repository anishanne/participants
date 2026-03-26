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
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_SCHEDULE,
  MAP_LOCATIONS
} from "@/lib/demo-data";
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
  const [generalSchedule, setGeneralSchedule] = useState(DEFAULT_SCHEDULE);
  const [personalizedOverrides, setPersonalizedOverrides] = useState<StudentScheduleOverrides>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
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

  // Load schedule + announcements from Supabase on mount
  useEffect(() => {
    async function loadFromDb() {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase-client");
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const [scheduleRes, announcementsRes] = await Promise.all([
          supabase.from("schedule_slots").select("*").order("sort_order"),
          supabase.from("announcements").select("*").order("created_at", { ascending: false })
        ]);

        if (scheduleRes.data && scheduleRes.data.length > 0) {
          setGeneralSchedule(scheduleRes.data.map(mapDbSlot));
        }

        if (announcementsRes.data && announcementsRes.data.length > 0) {
          setAnnouncements(announcementsRes.data.map(mapDbAnnouncement));
        }
      } catch {
        // Supabase unavailable — keep defaults
      }
    }

    loadFromDb();
  }, []);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const { getSupabaseClient } = await import("@/lib/supabase-client");
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
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

    // Persist to Supabase
    import("@/lib/supabase-server").then(({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) return;
      supabase.from("schedule_slots").insert({
        slug: newSlot.slug,
        starts_at: new Date().toISOString(),
        title: newSlot.title,
        location: newSlot.location,
        description: newSlot.description,
        track: newSlot.track,
        sort_order: nextIndex
      });
    });
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

    import("@/lib/supabase-server").then(({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) return;
      supabase.from("schedule_slots").delete().eq("id", slotId);
    });
  }

  function updateScheduleSlot(slotId: string, patch: Partial<ScheduleSlot>) {
    setGeneralSchedule((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );

    import("@/lib/supabase-server").then(({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) return;
      supabase.from("schedule_slots").update(patch).eq("id", slotId);
    });
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
  const hours = startsAt.getHours();
  const minutes = startsAt.getMinutes();
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
