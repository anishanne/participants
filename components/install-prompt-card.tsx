"use client";

import { Download, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/app-state-provider";

export function InstallPromptCard() {
  const { preferences, updatePreferences } = useAppState();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(preferences.installPromptDismissed);
  const updatePreferencesRef = useRef(updatePreferences);

  useEffect(() => {
    setDismissed(preferences.installPromptDismissed);
  }, [preferences.installPromptDismissed]);

  useEffect(() => {
    updatePreferencesRef.current = updatePreferences;
  }, [updatePreferences]);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const installed =
      window.matchMedia("(display-mode: standalone)").matches || Boolean(window.navigator.standalone);

    if (installed) {
      updatePreferencesRef.current({
        homeScreenPinned: true,
        installPromptDismissed: false
      });
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      updatePreferencesRef.current({
        homeScreenPinned: true,
        installPromptDismissed: false
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        updatePreferences({
          homeScreenPinned: true,
          installPromptDismissed: false
        });
      }

      return;
    }

    if (isIos) {
      updatePreferences({
        installPromptDismissed: false
      });
    }
  }

  function dismiss() {
    setDismissed(true);
    updatePreferences({
      installPromptDismissed: true
    });
  }

  if (preferences.homeScreenPinned || dismissed) {
    return null;
  }

  return (
    <section className="panel fixed left-1/2 top-4 z-40 w-[calc(100%-2rem)] max-w-[25rem] -translate-x-1/2 overflow-hidden border-[rgba(152,28,29,0.28)] bg-[rgba(255,250,244,0.96)]">
      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-[color:var(--line)] p-1 text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(152,28,29,0.14)] p-3 text-[color:var(--crimson)]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="pr-7">
            <p className="eyebrow">Add To Home Screen</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Pin this app before the tournament starts.</h2>
            <p className="body-copy mt-2">
              Keeping SMT 2026 on the home screen makes alerts, schedule checks, and room changes much easier to
              reach under pressure.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[color:var(--crimson)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
          {isIos && !installEvent ? (
            <div className="pill">
              <Share2 className="h-3.5 w-3.5" />
              Safari Share then Add to Home Screen
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
