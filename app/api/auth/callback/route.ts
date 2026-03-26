import { NextRequest, NextResponse } from "next/server";
import { saml, mapSamlAttributes } from "@/lib/saml";
import { getAdminSession } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

const INITIAL_ADMIN_UIDS = (process.env.INITIAL_ADMIN_UIDS || "")
  .split(",")
  .map((uid) => uid.trim().toLowerCase())
  .filter(Boolean);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse") as string;

    if (!samlResponse) {
      return NextResponse.json({ error: "Missing SAMLResponse" }, { status: 400 });
    }

    const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });

    if (!profile) {
      return NextResponse.json({ error: "Failed to parse SAML profile" }, { status: 400 });
    }

    const attrs = mapSamlAttributes(profile as Record<string, unknown>);

    if (!attrs.uid) {
      return NextResponse.json({ error: "No uid in SAML response" }, { status: 400 });
    }

    // Determine status: auto-approve if in INITIAL_ADMIN_UIDS
    const isInitialAdmin = INITIAL_ADMIN_UIDS.includes(attrs.uid.toLowerCase());

    // Upsert into admin_users
    const supabase = getSupabase();
    let status: "pending" | "approved" | "denied" = "pending";

    if (supabase) {
      // Check if user already exists
      const { data: existing } = await supabase
        .from("admin_users")
        .select("status")
        .eq("stanford_uid", attrs.uid)
        .single();

      if (existing) {
        status = existing.status as "pending" | "approved" | "denied";
      } else {
        // Insert new user
        const newStatus = isInitialAdmin ? "approved" : "pending";
        const { data: inserted } = await supabase
          .from("admin_users")
          .insert({
            stanford_uid: attrs.uid,
            email: attrs.email,
            display_name: attrs.displayName,
            status: newStatus,
            approved_by: isInitialAdmin ? "auto" : null
          })
          .select("status")
          .single();

        status = (inserted?.status as "pending" | "approved" | "denied") ?? newStatus;
      }
    } else {
      // No Supabase — auto-approve initial admins, deny others
      status = isInitialAdmin ? "approved" : "pending";
    }

    // Save session
    const session = await getAdminSession();
    session.user = {
      uid: attrs.uid,
      displayName: attrs.displayName,
      email: attrs.email,
      status
    };
    await session.save();

    // Redirect based on status (use request origin so it works on any host)
    const origin = new URL(request.url).origin;
    if (status === "approved") {
      return NextResponse.redirect(`${origin}/admin`, 303);
    } else if (status === "denied") {
      return NextResponse.redirect(`${origin}/admin/denied`, 303);
    } else {
      return NextResponse.redirect(`${origin}/admin/pending`, 303);
    }
  } catch (error) {
    console.error("SAML callback error:", error);
    return NextResponse.json({ error: "SAML validation failed" }, { status: 500 });
  }
}
