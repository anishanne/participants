import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface AdminSessionUser {
  uid: string;
  displayName: string;
  email: string;
  status: "pending" | "approved" | "denied";
}

export interface AdminSessionData {
  user?: AdminSessionUser;
}

export const SESSION_OPTIONS = {
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

export async function getAdminSession(): Promise<IronSession<AdminSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, SESSION_OPTIONS);
}
