import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { AdminSessionData } from "@/lib/admin-session";
import { SESSION_OPTIONS } from "@/lib/admin-session";

export const config = {
  matcher: ["/admin", "/admin/access"],
};

export async function middleware(request: NextRequest) {
  // Skip auth in development
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<AdminSessionData>(request, response, SESSION_OPTIONS);
  const user = session.user;

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (user.status !== "approved") {
    const dest = user.status === "denied" ? "/admin/denied" : "/admin/pending";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}
