import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, supabaseAdmin } from "@/lib/supabase/server";
import { webpush } from "@/lib/pwa/web-push";

const BONUS_LABEL: Record<string, string> = {
  double_multiplier: "Double ×2",
  shield_full_odds:  "Bouclier",
};

export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "DB non configurée" }, { status: 500 });
  }

  let body: { targetUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { targetUserId } = body;
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId requis" }, { status: 400 });
  }

  // ── 6. No self-baton ───────────────────────────────────────────────────────
  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas te bâtonner toi-même" },
      { status: 400 },
    );
  }

  // ── 2. Stage exists and hasn't started ────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: stage } = await supabaseAdmin
    .from("stages")
    .select("id, stage_number, start_time_utc")
    .eq("date", today)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json({ error: "Aucune étape aujourd'hui" }, { status: 409 });
  }
  if (new Date(stage.start_time_utc) <= new Date()) {
    return NextResponse.json(
      { error: "L'étape a déjà commencé — les bâtons sont fermés" },
      { status: 409 },
    );
  }

  // ── 3. Attacker has baton stock ────────────────────────────────────────────
  const { data: attackerBonus } = await supabaseAdmin
    .from("user_bonuses")
    .select("stock_total, stock_used")
    .eq("user_id", user.id)
    .eq("bonus_type", "baton_attaque")
    .maybeSingle();

  const available = attackerBonus
    ? attackerBonus.stock_total - attackerBonus.stock_used
    : 0;
  if (available <= 0) {
    return NextResponse.json(
      { error: "Tu n'as plus de bâtons disponibles" },
      { status: 409 },
    );
  }

  // ── 4. Target not already batoned on this stage ───────────────────────────
  const { data: existingTargetBaton } = await supabaseAdmin
    .from("baton_actions")
    .select("id")
    .eq("stage_id", stage.id)
    .eq("target_id", targetUserId)
    .maybeSingle();

  if (existingTargetBaton) {
    return NextResponse.json(
      { error: "Ce joueur a déjà été bâtonné aujourd'hui" },
      { status: 409 },
    );
  }

  // ── 5. Attacker hasn't already attacked today ─────────────────────────────
  const { data: existingAttack } = await supabaseAdmin
    .from("baton_actions")
    .select("id")
    .eq("stage_id", stage.id)
    .eq("attacker_id", user.id)
    .maybeSingle();

  if (existingAttack) {
    return NextResponse.json(
      { error: "Tu as déjà bâtonné quelqu'un aujourd'hui" },
      { status: 409 },
    );
  }

  // ── Cancel target's active bonus (if any) ─────────────────────────────────
  type RawBet = {
    id: string;
    bet_bonus_usage: Array<{ id: string; bonus_type: string }>;
  };

  const { data: rawTargetBet } = await supabaseAdmin
    .from("bets")
    .select("id, bet_bonus_usage(id, bonus_type)")
    .eq("user_id", targetUserId)
    .eq("stage_id", stage.id)
    .eq("is_active_pick", true)
    .maybeSingle();

  const targetBet       = rawTargetBet as unknown as RawBet | null;
  const bonusesToCancel = targetBet?.bet_bonus_usage ?? [];
  const bonusCancelled  = bonusesToCancel[0]?.bonus_type ?? null;

  for (const bu of bonusesToCancel) {
    // Delete from bet_bonus_usage
    await supabaseAdmin.from("bet_bonus_usage").delete().eq("id", bu.id);

    // Restore target's stock_used for this bonus type
    const { data: targetBonusRow } = await supabaseAdmin
      .from("user_bonuses")
      .select("stock_used")
      .eq("user_id", targetUserId)
      .eq("bonus_type", bu.bonus_type)
      .maybeSingle();

    if (targetBonusRow && targetBonusRow.stock_used > 0) {
      await supabaseAdmin
        .from("user_bonuses")
        .update({ stock_used: targetBonusRow.stock_used - 1 })
        .eq("user_id", targetUserId)
        .eq("bonus_type", bu.bonus_type);
    }
  }

  // ── Insert baton action ────────────────────────────────────────────────────
  const { error: insertError } = await supabaseAdmin.from("baton_actions").insert({
    stage_id:        stage.id,
    attacker_id:     user.id,
    target_id:       targetUserId,
    bonus_cancelled: bonusCancelled,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Increment attacker's stock_used ───────────────────────────────────────
  await supabaseAdmin
    .from("user_bonuses")
    .update({ stock_used: attackerBonus!.stock_used + 1 })
    .eq("user_id", user.id)
    .eq("bonus_type", "baton_attaque");

  // ── Push notification to target ───────────────────────────────────────────
  const attackerName = (user.email ?? "").split("@")[0];
  const cancelledList = bonusesToCancel
    .map((b) => BONUS_LABEL[b.bonus_type] ?? b.bonus_type)
    .join(" et ");

  const notifBody = bonusesToCancel.length > 0
    ? `${attackerName} t'a bâtonné sur l'étape ${stage.stage_number}. Ton bonus ${cancelledList} a été annulé.`
    : `${attackerName} t'a bâtonné sur l'étape ${stage.stage_number}. Tu ne peux plus poser de bonus aujourd'hui.`;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUserId)
    .eq("is_active", true);

  await Promise.allSettled(
    (subs ?? []).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "🪄 Tu as été bâtonné !", body: notifBody }),
      ),
    ),
  );

  return NextResponse.json({ ok: true, bonusCancelled });
}
