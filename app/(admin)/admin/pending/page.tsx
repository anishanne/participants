import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminPendingPage() {
  const session = await getAdminSession();

  if (!session.user) {
    redirect("/admin/login");
  }

  if (session.user.status === "approved") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-sm space-y-6 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(244,185,66,0.15)]">
          <Clock className="h-7 w-7 text-[color:var(--gold)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            Access Pending
          </h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Hi <strong>{session.user.displayName}</strong>, your access request has been submitted.
            An existing admin needs to approve it.
          </p>
          <p className="text-xs text-[color:var(--ink-soft)]">
            {session.user.email}
          </p>
        </div>
        <a
          href="/api/auth/logout"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/90"
        >
          Sign Out
        </a>
      </div>
    </div>
  );
}
