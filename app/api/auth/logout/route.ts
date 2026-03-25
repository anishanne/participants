import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET() {
  const session = await getAdminSession();
  session.destroy();
  return NextResponse.redirect(`${BASE_URL}/`, 303);
}
