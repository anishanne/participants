export interface ParticipantPreferences {
  studentId: string;
  phoneNumber: string;
  phoneVerified: boolean;
  notificationsEnabled: boolean;
  homeScreenPinned: boolean;
  installPromptDismissed: boolean;
}

export interface ScheduleSlot {
  id: string;
  slug: string;
  time: string;
  title: string;
  location: string;
  description: string;
  track: string;
}

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

export interface AnnouncementDraft {
  title: string;
  body: string;
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
