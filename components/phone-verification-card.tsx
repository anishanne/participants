"use client";

import { CheckCircle2, MessageSquareText, SmartphoneCharging } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/components/app-state-provider";
import { formatDisplayPhone, formatPhone } from "@/lib/utils";

export function PhoneVerificationCard() {
  const { preferences, updatePreferences } = useAppState();
  const [phoneNumber, setPhoneNumber] = useState(preferences.phoneNumber);
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function startVerification() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "start",
          phoneNumber
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start verification.");
      }

      setVerificationId(data.verificationId);
      setPreviewCode(data.previewCode ?? "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start verification.");
    } finally {
      setPending(false);
    }
  }

  async function confirmVerification() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "confirm",
          verificationId,
          code
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not confirm verification.");
      }

      updatePreferences({
        phoneNumber: data.phoneNumber,
        phoneVerified: true
      });
      setVerificationId("");
      setPreviewCode("");
      setCode("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not confirm verification.");
    } finally {
      setPending(false);
    }
  }

  function resetPhone() {
    updatePreferences({
      phoneNumber: "",
      phoneVerified: false
    });
    setPhoneNumber("");
    setVerificationId("");
    setCode("");
    setPreviewCode("");
    setError("");
  }

  if (preferences.phoneVerified) {
    return (
      <section className="panel overflow-hidden border-[rgba(220,114,145,0.22)] bg-[rgba(244,255,251,0.92)] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(220,114,145,0.12)] p-3 text-[color:var(--rose)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="eyebrow">SMS Ready</p>
            <h2 className="text-lg font-semibold tracking-tight">Announcement texts will reach {formatDisplayPhone(preferences.phoneNumber)}.</h2>
            <p className="body-copy">
              Your number is verified and can be included when admins choose to send SMS updates.
            </p>
            <button
              type="button"
              onClick={resetPhone}
              className="inline-flex rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/90"
            >
              Use A Different Number
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel p-5">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(152,28,29,0.12)] p-3 text-[color:var(--crimson)]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow">Optional SMS Backup</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Add a phone number for announcement texts.</h2>
            <p className="body-copy mt-2">
              This is optional, but it gives admins another way to reach you when a critical update is posted.
            </p>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[color:var(--ink)]">Mobile Number</span>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(formatPhone(event.target.value))}
            placeholder="(555) 555-5555"
            className="w-full rounded-2xl border border-[color:var(--line)] bg-white/85 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--crimson)]"
            inputMode="numeric"
          />
        </label>
        {verificationId ? (
          <div className="space-y-3 rounded-[1.4rem] border border-[rgba(220,114,145,0.18)] bg-[rgba(244,255,251,0.84)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--rose)]">
              <SmartphoneCharging className="h-4 w-4" />
              Enter the verification code
            </div>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[color:var(--rose)]"
              inputMode="numeric"
            />
            {previewCode ? (
              <p className="rounded-2xl border border-dashed border-[rgba(220,114,145,0.25)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                Demo mode code: <strong>{previewCode}</strong>
              </p>
            ) : null}
            <button
              type="button"
              onClick={confirmVerification}
              disabled={pending || code.length < 6}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--rose)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-70"
            >
              {pending ? "Verifying..." : "Confirm Number"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startVerification}
            disabled={pending || phoneNumber.replace(/\D/g, "").length < 10}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          >
            {pending ? "Sending Code..." : "Verify Phone Number"}
          </button>
        )}
        {error ? <p className="text-sm text-[color:var(--crimson)]">{error}</p> : null}
      </div>
    </section>
  );
}
