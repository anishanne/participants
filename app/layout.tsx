import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";
import { UpdateBanner } from "@/components/update-banner";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap"
});

const APP_URL = "https://app.comp.mt";

export const metadata: Metadata = {
  title: {
    default: "SMT 2026",
    template: "%s | SMT 2026"
  },
  description: "Stanford Math Tournament 2026 — schedule, room assignments, and live announcements.",
  applicationName: "SMT 2026",
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: "SMT 2026",
    description: "Stanford Math Tournament 2026 — schedule, room assignments, and live announcements.",
    url: APP_URL,
    siteName: "Stanford Math Tournament",
    images: [{ url: "/smt-logo.png", width: 612, height: 612, alt: "SMT Logo" }],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "SMT 2026",
    description: "Stanford Math Tournament 2026 — schedule, room assignments, and live announcements.",
    images: ["/smt-logo.png"]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SMT 2026"
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#fffbf0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <PwaRegister />
        <OfflineBanner />
        <UpdateBanner />
        {children}
      </body>
    </html>
  );
}
