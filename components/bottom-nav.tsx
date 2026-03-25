"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, LayoutDashboard, MapPinned, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: LayoutDashboard
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: Sparkles
  },
  {
    href: "/announcements",
    label: "Alerts",
    icon: BellRing
  },
  {
    href: "/map",
    label: "Map",
    icon: MapPinned
  }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 mb-4 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-[1.9rem] border border-white/80 bg-[rgba(74,14,14,0.92)] px-2 py-2 shadow-lift backdrop-blur">
      <ul className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-medium text-white/80 transition hover:text-white",
                  active && "bg-white/12 text-white"
                )}
              >
                <Icon className={cn("mb-1 h-5 w-5", active && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
