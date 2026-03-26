import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminDeniedPage() {
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(152,28,29,0.1)]">
          <XCircle className="h-7 w-7 text-[color:var(--crimson)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            Access Denied
          </h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Your admin access request was denied.
          </p>
        </div>
        <a
          href="mailto:info@stanfordmathtournament.org"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--crimson)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Contact Us
        </a>
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
