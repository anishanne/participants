import type { MapLocation } from "@/lib/types";

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
