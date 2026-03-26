import type {
  Announcement,
  MapLocation,
  ScheduleSlot
} from "@/lib/types";

export const TOURNAMENT_DATE = "2026-04-18T07:00:00-07:00";

export const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  {
    id: "checkin",
    slug: "CheckIn",
    time: "7:00 AM",
    title: "Check-In",
    location: "Main Entrance",
    description: "Badge pickup and team registration.",
    track: "All"
  },
  {
    id: "opening",
    slug: "Opening",
    time: "8:00 AM",
    title: "Opening Ceremony",
    location: "Hewlett 200",
    description: "Welcome remarks and contest overview.",
    track: "All"
  },
  {
    id: "power",
    slug: "Power",
    time: "8:50 AM",
    title: "Power Round",
    location: "Assigned Room",
    description: "Proof-based team round.",
    track: "Competition"
  },
  {
    id: "team",
    slug: "Team",
    time: "10:10 AM",
    title: "Team Round",
    location: "Assigned Room",
    description: "Collaborative team problem set.",
    track: "Competition"
  },
  {
    id: "lunch",
    slug: "Lunch",
    time: "11:20 AM",
    title: "Lunch Break",
    location: "Tresidder Courtyard",
    description: "Catered lunch and free time.",
    track: "All"
  },
  {
    id: "subject1",
    slug: "Subject1",
    time: "12:30 PM",
    title: "Subject Test #1",
    location: "Assigned Room",
    description: "Individual subject exam. Choose from Algebra, Calculus, Discrete, or Geometry.",
    track: "Competition"
  },
  {
    id: "subject2",
    slug: "Subject2",
    time: "1:40 PM",
    title: "Subject Test #2",
    location: "Assigned Room",
    description: "Second individual subject exam, or General Test.",
    track: "Competition"
  },
  {
    id: "guts",
    slug: "Guts",
    time: "3:20 PM",
    title: "Guts Round",
    location: "Hewlett 200",
    description: "Live-scored team sprint. 8 sets of 4 questions.",
    track: "Competition"
  },
  {
    id: "activity",
    slug: "Activity",
    time: "4:40 PM",
    title: "Afternoon Activities",
    location: "TBD",
    description: "Guest Speaker, Integration Bee Finals, and more.",
    track: "All"
  },
  {
    id: "awards",
    slug: "Awards",
    time: "6:00 PM",
    title: "Awards Ceremony",
    location: "Hewlett 200",
    description: "Results, prizes, and closing remarks.",
    track: "All"
  }
];

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Check-In Opens at 7:00 AM",
    body: "Arrive through the **main entrance** on Serra Mall and keep your badge visible.\n\nVolunteers will direct teams to their assigned rooms.",
    createdAt: "2026-04-18T06:30:00.000Z",
    author: "SMT Ops",
    smsEnabled: true,
    pushEnabled: true
  },
  {
    id: "ann-2",
    title: "Guts Round Moved to Hewlett 200 Section B",
    body: "The Guts Round location has changed. All teams should head to **Hewlett 200, Section B** at 3:20 PM.",
    createdAt: "2026-04-18T13:30:00.000Z",
    author: "SMT Ops",
    smsEnabled: true,
    pushEnabled: true
  }
];

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: "hewlett",
    name: "Hewlett Teaching Center",
    shortLabel: "HW",
    description: "Opening ceremony, Guts Round, and Awards Ceremony in Hewlett 200.",
    area: "Main Quad",
    x: 18,
    y: 26
  },
  {
    id: "gates",
    name: "Gates Computer Science",
    shortLabel: "GA",
    description: "Subject test rooms on the basement level.",
    area: "Engineering Quad",
    x: 78,
    y: 28
  },
  {
    id: "tresidder",
    name: "Tresidder Union",
    shortLabel: "TR",
    description: "Lunch break and team meetup area in the courtyard.",
    area: "Central Campus",
    x: 58,
    y: 58
  },
  {
    id: "building380",
    name: "Building 380 (Math)",
    shortLabel: "380",
    description: "Power and Team round rooms for assigned groups.",
    area: "Science Quad",
    x: 30,
    y: 72
  },
  {
    id: "huang",
    name: "Huang Engineering Center",
    shortLabel: "HU",
    description: "Additional Power and Team round rooms. Help desk on ground floor.",
    area: "Engineering Quad",
    x: 10,
    y: 56
  }
];
