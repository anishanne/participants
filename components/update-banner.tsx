"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CHECK_INTERVAL = 30_000; // 30 seconds

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const doRefresh = useCallback(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.reload();
  }, []);

  useEffect(() => {
    let initialBuildId: string | null = null;

    async function checkForUpdate() {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;
        const { buildId } = await response.json();

        if (!initialBuildId) {
          initialBuildId = buildId;
          return;
        }

        if (buildId !== initialBuildId) {
          // If page is hidden/not focused, auto-refresh silently
          if (document.hidden) {
            doRefresh();
            return;
          }
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or error — skip
      }
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    // Also auto-refresh when user returns to a stale tab
    function handleVisibilityChange() {
      if (!document.hidden && updateAvailable) {
        doRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [doRefresh, updateAvailable]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-in rounded-2xl border border-[color:var(--line)] bg-[rgba(255,251,240,0.97)] px-5 py-4 shadow-lift backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Update available</p>
          <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">A new version has been deployed.</p>
        </div>
        <button
          type="button"
          onClick={doRefresh}
          className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--crimson)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    </div>
  );
}
