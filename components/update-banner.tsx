"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CHECK_INTERVAL = 30_000;

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
          if (document.hidden) {
            doRefresh();
            return;
          }
          setUpdateAvailable(true);
        }
      } catch {}
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(59,28,28,0.6)] backdrop-blur-sm">
      <div className="mx-6 w-full max-w-sm animate-fade-in space-y-6 rounded-[2rem] border border-white/70 bg-[rgba(255,251,240,0.98)] px-8 py-10 text-center shadow-lift">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(152,28,29,0.1)]">
          <RefreshCw className="h-8 w-8 text-[color:var(--crimson)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            Update Available
          </h2>
          <p className="text-sm text-[color:var(--ink-soft)]">
            A new version of SMT 2026 has been deployed. Refresh to get the latest.
          </p>
        </div>
        <button
          type="button"
          onClick={doRefresh}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--crimson)] px-6 py-4 text-sm font-semibold text-white transition hover:brightness-105"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Now
        </button>
      </div>
    </div>
  );
}
