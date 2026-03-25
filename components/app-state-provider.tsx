"use client";

import Papa from "papaparse";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_OVERRIDES,
  DEFAULT_PREFERENCES,
  DEFAULT_SCHEDULE,
  MAP_LOCATIONS
} from "@/lib/demo-data";
import type {
  Announcement,
  AnnouncementDraft,
  CsvImportResult,
  MapLocation,
  ParticipantPreferences,
  PersistedAppState,
  ScheduleSlot,
  StudentScheduleOverrides
} from "@/lib/types";
import { parseStudentOverrideCsv } from "@/lib/utils";

const STORAGE_KEY = "smt-participants-state-v1";

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
  publishAnnouncement: (draft: AnnouncementDraft) => void;
  mapLocations: MapLocation[];
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [generalSchedule, setGeneralSchedule] = useState(DEFAULT_SCHEDULE);
  const [personalizedOverrides, setPersonalizedOverrides] = useState(DEFAULT_OVERRIDES);
  const [announcements, setAnnouncements] = useState(DEFAULT_ANNOUNCEMENTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PersistedAppState>;

        if (parsed.preferences) {
          setPreferences((current) => ({ ...current, ...parsed.preferences }));
        }

        if (Array.isArray(parsed.generalSchedule) && parsed.generalSchedule.length > 0) {
          setGeneralSchedule(parsed.generalSchedule);
        }

        if (parsed.personalizedOverrides) {
          setPersonalizedOverrides(parsed.personalizedOverrides);
        }

        if (Array.isArray(parsed.announcements) && parsed.announcements.length > 0) {
          setAnnouncements(parsed.announcements);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const payload: PersistedAppState = {
      preferences,
      generalSchedule,
      personalizedOverrides,
      announcements
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [announcements, generalSchedule, hydrated, personalizedOverrides, preferences]);

  function updatePreferences(patch: Partial<ParticipantPreferences>) {
    setPreferences((current) => ({
      ...current,
      ...patch
    }));
  }

  function addScheduleSlot() {
    const nextIndex = generalSchedule.length + 1;

    setGeneralSchedule((current) => [
      ...current,
      {
        id: `slot_${crypto.randomUUID()}`,
        slug: `CustomSlot${nextIndex}`,
        time: "6:00 PM",
        title: "New Schedule Item",
        location: "TBD",
        description: "Describe the activity, who needs to attend, and where to go.",
        track: "Custom"
      }
    ]);
  }

  function removeScheduleSlot(slotId: string) {
    setGeneralSchedule((current) => current.filter((slot) => slot.id !== slotId));
    setPersonalizedOverrides((current) => {
      const nextEntries = Object.entries(current).map(([studentId, slots]) => {
        const { [slotId]: removedSlot, ...rest } = slots;
        void removedSlot;

        return [studentId, rest] as const;
      });

      return Object.fromEntries(nextEntries);
    });
  }

  function updateScheduleSlot(slotId: string, patch: Partial<ScheduleSlot>) {
    setGeneralSchedule((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );
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

  function publishAnnouncement(draft: AnnouncementDraft) {
    startTransition(() => {
      setAnnouncements((current) => [
        {
          id: crypto.randomUUID(),
          title: draft.title.trim(),
          body: draft.body.trim(),
          createdAt: new Date().toISOString(),
          author: "Admin Console",
          smsEnabled: draft.smsEnabled,
          pushEnabled: draft.pushEnabled
        },
        ...current
      ]);
    });
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
        publishAnnouncement,
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
