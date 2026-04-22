import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin.rpc("queue_notification_campaigns");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ queued: data ?? 0 });
}
