import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type ValidateClaimPayload = {
  betId: string;
  screenshotUrl: string;
  validated: boolean;
};

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as ValidateClaimPayload;
  if (!body.betId || !body.screenshotUrl) {
    return NextResponse.json({ error: "betId and screenshotUrl are required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("bets")
    .update({
      claim_screenshot_url: body.screenshotUrl,
      validated_by_admin: body.validated,
    })
    .eq("id", body.betId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
