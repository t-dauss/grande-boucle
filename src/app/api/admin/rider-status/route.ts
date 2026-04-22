import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RiderStatusPayload = {
  stageId: string;
  riderId: string;
  status: "started" | "dns" | "dnf";
};

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as RiderStatusPayload;
  if (!body.stageId || !body.riderId || !body.status) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("rider_stage_status").upsert(
    {
      stage_id: body.stageId,
      rider_id: body.riderId,
      status: body.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stage_id,rider_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
