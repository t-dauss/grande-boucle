import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, supabaseAdmin } from "@/lib/supabase/server";

type BetPayload = {
  stageId: string;
  riderId: string;
  jokerRepick?: boolean;
};

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: restDay } = await supabaseAdmin
    .from("rest_days")
    .select("id, label, city")
    .eq("date", today)
    .maybeSingle();

  if (restDay) {
    return NextResponse.json(
      { error: `Betting is disabled on ${restDay.label} (${restDay.city}).` },
      { status: 409 },
    );
  }

  const body = (await request.json()) as BetPayload;
  const { stageId, riderId, jokerRepick = false } = body;

  if (!stageId || !riderId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("place_or_replace_bet", {
    p_user_id: user.id,
    p_stage_id: stageId,
    p_rider_id: riderId,
    p_is_joker_repick: jokerRepick,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ betId: data });
}
