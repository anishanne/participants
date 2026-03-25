import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { AppStateProvider } from "@/components/app-state-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "SMT 2026",
    template: "%s | SMT 2026"
  },
  description: "Stanford Math Tournament 2026 — schedules, announcements, and live updates for participants.",
  applicationName: "SMT 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SMT 2026"
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
        <AppStateProvider>
          <PwaRegister />
          {children}
        </AppStateProvider>
      </body>
    </html>
  );
}
