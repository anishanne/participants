import { NextResponse } from "next/server";
import { saml } from "@/lib/saml";

export async function GET() {
  try {
    const url = await saml.getAuthorizeUrlAsync("", undefined, {});
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("SAML login error:", error);
    return NextResponse.json({ error: "Failed to initiate SAML login" }, { status: 500 });
  }
}
