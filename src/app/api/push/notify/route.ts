import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { webpush } from "@/lib/pwa/web-push";

type Campaign = {
  id: string;
  idempotency_key: string;
  payload: { title: string; body: string; url: string };
};

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data: pendingCampaigns } = await supabaseAdmin
    .from("notification_campaigns")
    .select("id, idempotency_key, payload")
    .is("sent_at", null)
    .limit(10);

  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("is_active", true);

  for (const campaign of (pendingCampaigns ?? []) as Campaign[]) {
    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(campaign.payload),
        );
      } catch {
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
  }

  return NextResponse.json({ sent: pendingCampaigns?.length ?? 0 });
}
