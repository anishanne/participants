import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session.user?.status === "approved") {
    redirect("/admin");
  }

  if (session.user?.status === "pending") {
    redirect("/admin/pending");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-sm space-y-6 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(152,28,29,0.1)]">
          <ShieldCheck className="h-7 w-7 text-[color:var(--crimson)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            SMT 2026 Admin
          </h1>
          <p className="text-sm text-[color:var(--ink-soft)]">
            Sign in with your Stanford account to request admin access.
          </p>
        </div>
        <a
          href="/api/auth/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--crimson)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
        >
          Sign in with Stanford
        </a>
        <Link
          href="/"
          className="block text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
        >
          &larr; Back to participant app
        </Link>
      </div>
    </div>
  );
}
