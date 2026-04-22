import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type StageType = "flat" | "hilly" | "mountain" | "itt" | "ttt";

type StagePayload = {
  stage_number: number;
  date: string;
  start_city: string;
  finish_city: string;
  stage_type: StageType;
  start_time_utc: string;
  distance_km?: number | null;
  profile_label?: string | null;
  status?: "scheduled" | "in_progress" | "finished" | "results_published";
};

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as { stages?: StagePayload[] };
  if (!Array.isArray(body.stages) || body.stages.length === 0) {
    return NextResponse.json({ error: "Payload must contain a non-empty stages array." }, { status: 400 });
  }

  const records = body.stages.map((s) => ({
    stage_number: s.stage_number,
    date: s.date,
    start_city: s.start_city,
    finish_city: s.finish_city,
    stage_type: s.stage_type,
    start_time_utc: s.start_time_utc,
    distance_km: s.distance_km ?? null,
    profile_label: s.profile_label ?? null,
    status: s.status ?? "scheduled",
  }));

  const { error } = await supabaseAdmin.from("stages").upsert(records, {
    onConflict: "stage_number",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, updated: records.length });
}
