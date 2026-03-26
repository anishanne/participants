import { NextResponse } from "next/server";
import webpush from "web-push";
import { getAdminSession, isApprovedAdmin } from "@/lib/admin-session";
import { getSupabase } from "@/lib/supabase-server";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:smt@stanford.edu";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function GET() {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, title, body } = await request.json();
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (body !== undefined) updates.body_markdown = body;

  const { error } = await supabase.from("announcements").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  if (!await isApprovedAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, body, pushEnabled, smsEnabled } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Save to database
  let dbId: string | null = null;
  if (supabase) {
    const { data, error } = await supabase.from("announcements").insert({
      title,
      body_markdown: body || "",
      sms_enabled: smsEnabled ?? false,
      push_enabled: pushEnabled ?? true,
      audience_mode: "all",
      author_name: (await getAdminSession()).user?.displayName || "Admin"
    }).select("id").single();

    if (error) {
      console.error("Failed to save announcement:", error);
      return NextResponse.json({ error: "Failed to save announcement" }, { status: 500 });
    }
    dbId = data?.id;
  }

  // Send push notifications
  const pushResult = { sent: 0, failed: 0 };
  if (pushEnabled && vapidPublicKey && vapidPrivateKey && supabase) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title,
        body: (body || "").replace(/[*#`_~\[\]]/g, "").slice(0, 200),
        tag: `smt-${Date.now()}`,
        url: "/announcements"
      });

      const staleEndpoints: string[] = [];

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            pushResult.sent++;
          } catch (err: unknown) {
            pushResult.failed++;
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
          }
        })
      );

      if (staleEndpoints.length > 0) {
        await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
      }
    }
  }

  return NextResponse.json({
    id: dbId,
    push: pushResult
  });
}
