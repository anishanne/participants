import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { AdminSessionData } from "@/lib/admin-session";

const sessionOptions = {
  password:
    process.env.SESSION_SECRET || "dev-secret-change-me-in-production-1234",
  cookieName: "smt-admin-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_BASE_URL?.includes("localhost"),
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8,
  },
};

// Only run on /admin routes (excluding login, pending, denied which need to be accessible)
export const config = {
  matcher: ["/admin", "/admin/access"],
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const session = await getIronSession<AdminSessionData>(
    request,
    response,
    sessionOptions
  );

  const user = session.user;
  const path = request.nextUrl.pathname;

  // No session at all → login
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Has session but not approved → pending page
  if (user.status !== "approved") {
    if (user.status === "denied") {
      return NextResponse.redirect(new URL("/admin/denied", request.url));
    }
    return NextResponse.redirect(new URL("/admin/pending", request.url));
  }

  // Approved → allow through
  return response;
}
