"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setRetryIn(0);
    }

    function handleOffline() {
      setOnline(false);
      setRetryIn(30);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Countdown + auto-retry
  useEffect(() => {
    if (online || retryIn <= 0) return;

    const interval = setInterval(() => {
      setRetryIn((prev) => {
        if (prev <= 1) {
          // Check connection
          fetch("/manifest.webmanifest", { cache: "no-store" })
            .then(() => setOnline(true))
            .catch(() => setRetryIn(30));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [online, retryIn]);

  // Brief "back online" flash
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      return;
    }
    if (wasOffline && online) {
      setShowReconnected(true);
      const timeout = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [online, wasOffline]);

  if (showReconnected) {
    return (
      <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 -translate-x-1/2 animate-fade-in rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 shadow-lift backdrop-blur">
        <p className="text-sm font-medium text-emerald-800">Back online</p>
      </div>
    );
  }

  if (online) return null;

  return (
    <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-[rgba(152,28,29,0.2)] bg-[rgba(255,251,240,0.97)] px-5 py-4 shadow-lift backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(152,28,29,0.1)]">
          <WifiOff className="h-4.5 w-4.5 text-[color:var(--crimson)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--ink)]">No connection</p>
          <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
            Reconnect for live updates.
            {retryIn > 0 ? ` Retrying in ${retryIn}s...` : " Retrying..."}
          </p>
        </div>
      </div>
    </div>
  );
}
