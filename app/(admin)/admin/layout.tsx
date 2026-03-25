import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();
  const user = session.user;
  const isApproved = user?.status === "approved";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight text-[color:var(--ink)]">
              SMT 2026 Admin
            </h1>
            {isApproved ? (
              <nav className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-[color:var(--ink-soft)] transition hover:bg-white/80 hover:text-[color:var(--ink)]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/access"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[color:var(--ink-soft)] transition hover:bg-white/80 hover:text-[color:var(--ink)]"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Access
                </Link>
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-[color:var(--ink-soft)] sm:inline">
                  {user.displayName}
                </span>
                <a
                  href="/api/auth/logout"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white/85 px-3 py-1.5 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </a>
              </>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Participant App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}
