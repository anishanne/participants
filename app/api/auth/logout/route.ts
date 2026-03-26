import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  session.destroy();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, 303);
}
