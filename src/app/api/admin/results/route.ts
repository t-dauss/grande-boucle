import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type ResultEntry = { rank: number; riderId: string; officialTime?: string };
type ResultsPayload = { stageId: string; results: ResultEntry[]; publishedBy?: string };

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as ResultsPayload;
  if (!body.stageId || !Array.isArray(body.results) || body.results.length !== 5) {
    return NextResponse.json({ error: "Expected exactly 5 ranked riders." }, { status: 400 });
  }

  const mapped = body.results.map((item) => ({
    stage_id: body.stageId,
    rank: item.rank,
    rider_id: item.riderId,
    official_time: item.officialTime ?? null,
    published_by: body.publishedBy ?? null,
  }));

  const { error } = await supabaseAdmin.from("results").upsert(mapped, {
    onConflict: "stage_id,rank",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.rpc("compute_stage_scores", { p_stage_id: body.stageId });
  await supabaseAdmin.from("stages").update({ status: "results_published" }).eq("id", body.stageId);

  return NextResponse.json({ ok: true });
}
