import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type OddsEntry = { riderId: string; odds: number };
type OddsPayload = { stageId: string; entries: OddsEntry[]; enteredBy?: string };

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as OddsPayload;
  if (!body.stageId || !Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const records = body.entries.map((entry) => ({
    stage_id: body.stageId,
    rider_id: entry.riderId,
    odds: entry.odds,
    entered_by: body.enteredBy ?? null,
  }));

  const { error } = await supabaseAdmin.from("stage_odds").upsert(records, {
    onConflict: "stage_id,rider_id",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
