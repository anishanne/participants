"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { TOURNAMENT_DATE } from "@/lib/config";
import { MAP_LOCATIONS } from "@/lib/demo-data";
import { mapScheduleRow } from "@/lib/schedule";
import type {
  Announcement,
  MapLocation,
  ParticipantPreferences,
  ScheduleSlot
} from "@/lib/types";

const PREFS_KEY = "smt-user-prefs";

interface ParticipantPreferencesContextValue {
  preferences: ParticipantPreferences;
  updatePreferences: (patch: Partial<ParticipantPreferences>) => void;
}

interface ParticipantDataContextValue {
  generalSchedule: ScheduleSlot[];
  announcements: Announcement[];
  tournamentDate: string;
  loading: boolean;
  mapLocations: MapLocation[];
}

const ParticipantPreferencesContext = createContext<ParticipantPreferencesContextValue | null>(null);
const ParticipantDataContext = createContext<ParticipantDataContextValue | null>(null);

const DEFAULT_PREFERENCES: ParticipantPreferences = {
  studentId: "",
  phoneNumber: "",
  phoneVerified: false,
  notificationsEnabled: false,
  homeScreenPinned: false
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [generalSchedule, setGeneralSchedule] = useState<ScheduleSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const refreshSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) return;
      const data = await res.json();
      setGeneralSchedule(Array.isArray(data) ? data.map(mapScheduleRow) : []);
    } catch {}
  }, []);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data.map(mapDbAnnouncement) : []);
    } catch {}
  }, []);

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

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({
      studentId: preferences.studentId,
      phoneNumber: preferences.phoneNumber,
      phoneVerified: preferences.phoneVerified
    }));
  }, [hydrated, preferences]);

  useEffect(() => {
    async function loadFromApi() {
      try {
        await Promise.all([refreshSchedule(), refreshAnnouncements()]);
      } finally {
        setDataLoading(false);
      }
    }

    loadFromApi();
  }, [refreshAnnouncements, refreshSchedule]);

  function updatePreferences(patch: Partial<ParticipantPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  return (
    <ParticipantPreferencesContext.Provider value={{ preferences, updatePreferences }}>
      <ParticipantDataContext.Provider
        value={{
          generalSchedule,
          announcements,
          tournamentDate: TOURNAMENT_DATE,
          loading: dataLoading,
          mapLocations: MAP_LOCATIONS
        }}
      >
        {children}
      </ParticipantDataContext.Provider>
    </ParticipantPreferencesContext.Provider>
  );
}

export function useParticipantPreferences() {
  const context = useContext(ParticipantPreferencesContext);

  if (!context) {
    throw new Error("useParticipantPreferences must be used within AppStateProvider");
  }

  return context;
}

export function useParticipantData() {
  const context = useContext(ParticipantDataContext);

  if (!context) {
    throw new Error("useParticipantData must be used within AppStateProvider");
  }

  return context;
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
