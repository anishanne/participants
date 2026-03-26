import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

async function requireApprovedAdmin() {
  const session = await getAdminSession();
  if (!session.user || session.user.status !== "approved") return null;
  return session.user;
}

export async function GET() {
  const admin = await requireApprovedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const admin = await requireApprovedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { stanford_uid, status: newStatus } = await request.json();

  if (!stanford_uid || !["approved", "denied"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("admin_users")
    .update({ status: newStatus, approved_by: admin.uid })
    .eq("stanford_uid", stanford_uid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
