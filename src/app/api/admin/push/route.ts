import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdminEmail, supabaseAdmin } from "@/lib/supabase/server";
import { webpush } from "@/lib/pwa/web-push";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { title, body, url } = await request.json() as {
    title?: string;
    body?: string;
    url?: string;
  };

  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const { data: campaign, error: insertError } = await supabaseAdmin
    .from("notification_campaigns")
    .insert({
      idempotency_key: crypto.randomUUID(),
      payload: { title, body, url: url || "/" },
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("is_active", true);

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: url || "/" }),
      );
      sent++;
    } catch {
      failed++;
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("endpoint", sub.endpoint);
    }
  }

  await supabaseAdmin
    .from("notification_campaigns")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", campaign.id);

  return NextResponse.json({ ok: true, sent, failed });
}
