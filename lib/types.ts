export interface ParticipantPreferences {
  studentId: string;
  phoneNumber: string;
  phoneVerified: boolean;
  notificationsEnabled: boolean;
  homeScreenPinned: boolean;
}

export interface ScheduleSlot {
  id: string;
  sortOrder: number;
  slug: string;
  startsAt: string;
  time: string;
  title: string;
  location: string;
  description: string;
  track: string;
}

export type ScheduleSlotPatch = Partial<
  Pick<ScheduleSlot, "sortOrder" | "slug" | "startsAt" | "title" | "location" | "description" | "track">
>;

export interface ResolvedScheduleSlot extends ScheduleSlot {
  personalizedTitle?: string;
  personalizedLocation?: string;
  isPersonalized: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: string;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export interface MapLocation {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  area: string;
  x: number;
  y: number;
}
