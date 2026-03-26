import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SMT 2026",
    short_name: "SMT 2026",
    description: "Stanford Math Tournament — schedules, announcements, and live updates.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbf0",
    theme_color: "#fffbf0",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
