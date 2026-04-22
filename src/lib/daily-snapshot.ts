/**
 * Shared data-fetching logic for the /daily page.
 * Used by both the Server Component (page.tsx) and the GET /api/daily route.
 */
import { supabaseAdmin } from "./supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────────

export type StageInfo = {
  id: string;
  stage_number: number;
  start_city: string;
  finish_city: string;
  stage_type: string;
  start_time_utc: string;
  distance_km: number | null;
};

export type BetInfo = {
  riderId: string;
  riderName: string;
  odds: number;
  bonuses: string[];
};

export type BatonReceived = {
  attackerName: string;
  stageNumber: number;
};

export type BatonEvent = {
  attackerId: string;    // needed client-side to detect "did I already attack?"
  attackerName: string;
  targetName: string;
  appliedAt: string;
};

export type PlayerInfo = {
  userId: string;
  displayName: string;   // email before @
  initials: string;      // first 2 letters, uppercased
  bet: BetInfo | null;
  batonReceived: BatonReceived | null;   // first baton received this Tour
  batonReceivedToday: boolean;
};

export type DailySnapshot = {
  stage: StageInfo | null;
  players: PlayerInfo[];
  batonEvents: BatonEvent[];
  myBatonStock: number;
  myUserId: string;
};

// ── Raw Supabase shapes ────────────────────────────────────────────────────────

type RawBet = {
  user_id: string;
  picked_rider_id: string;
  riders: { full_name: string } | null;
  bet_bonus_usage: Array<{ bonus_type: string }>;
};

type RawBatonAll = {
  target_id: string;
  attacker_id: string;
  stages: { stage_number: number } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function displayName(email: string): string {
  return email.split("@")[0];
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ── Main builder ───────────────────────────────────────────────────────────────

export async function buildDailySnapshot(myUserId: string): Promise<DailySnapshot> {
  const empty: DailySnapshot = {
    stage: null, players: [], batonEvents: [], myBatonStock: 0, myUserId,
  };

  if (!supabaseAdmin) return empty;

  const today = new Date().toISOString().slice(0, 10);

  // ── Parallel: stage + all auth users ──────────────────────────────────────
  const [stageRes, usersRes] = await Promise.all([
    supabaseAdmin
      .from("stages")
      .select(
        "id, stage_number, start_city, finish_city, stage_type, start_time_utc, distance_km",
      )
      .eq("date", today)
      .maybeSingle(),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const stage = stageRes.data ?? null;
  const users = usersRes.data?.users ?? [];
  const userMap = new Map(users.map((u) => [u.id, u.email ?? ""]));

  // ── My baton stock ─────────────────────────────────────────────────────────
  const { data: myBatonRow } = await supabaseAdmin
    .from("user_bonuses")
    .select("stock_total, stock_used")
    .eq("user_id", myUserId)
    .eq("bonus_type", "baton_attaque")
    .maybeSingle();
  const myBatonStock = myBatonRow
    ? myBatonRow.stock_total - myBatonRow.stock_used
    : 0;

  // ── No stage today ─────────────────────────────────────────────────────────
  if (!stage) {
    const players: PlayerInfo[] = users
      .filter((u) => u.email)
      .map((u) => {
        const dn = displayName(u.email!);
        return {
          userId: u.id,
          displayName: dn,
          initials: initials(dn),
          bet: null,
          batonReceived: null,
          batonReceivedToday: false,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return { stage: null, players, batonEvents: [], myBatonStock, myUserId };
  }

  // ── Parallel: stage-specific queries ──────────────────────────────────────
  const [betsRes, oddsRes, todayBatonsRes, allBatonsRes] = await Promise.all([
    supabaseAdmin
      .from("bets")
      .select("user_id, picked_rider_id, riders(full_name), bet_bonus_usage(bonus_type)")
      .eq("stage_id", stage.id)
      .eq("is_active_pick", true),
    supabaseAdmin
      .from("stage_odds")
      .select("rider_id, odds")
      .eq("stage_id", stage.id),
    supabaseAdmin
      .from("baton_actions")
      .select("attacker_id, target_id, applied_at")
      .eq("stage_id", stage.id)
      .order("applied_at", { ascending: true }),
    supabaseAdmin
      .from("baton_actions")
      .select("target_id, attacker_id, stages(stage_number)")
      .order("applied_at", { ascending: true }),
  ]);

  // ── Odds map ───────────────────────────────────────────────────────────────
  const oddsMap = new Map<string, number>(
    (oddsRes.data ?? []).map((o) => [o.rider_id, Number(o.odds)]),
  );

  // ── Bets map ───────────────────────────────────────────────────────────────
  const betsMap = new Map<string, BetInfo>();
  for (const b of (betsRes.data ?? []) as unknown as RawBet[]) {
    if (!b.riders) continue;
    betsMap.set(b.user_id, {
      riderId:    b.picked_rider_id,
      riderName:  b.riders.full_name,
      odds:       oddsMap.get(b.picked_rider_id) ?? 0,
      bonuses:    (b.bet_bonus_usage ?? []).map((bu) => bu.bonus_type),
    });
  }

  // ── Today's baton events ───────────────────────────────────────────────────
  const todayBatons   = todayBatonsRes.data ?? [];
  const batonTargets  = new Set(todayBatons.map((b) => b.target_id));

  const batonEvents: BatonEvent[] = todayBatons.map((b) => ({
    attackerId:   b.attacker_id,
    attackerName: displayName(userMap.get(b.attacker_id) ?? ""),
    targetName:   displayName(userMap.get(b.target_id) ?? ""),
    appliedAt:    b.applied_at as string,
  }));

  // ── First baton received per user this Tour ────────────────────────────────
  const firstBatonMap = new Map<string, BatonReceived>();
  for (const b of (allBatonsRes.data ?? []) as unknown as RawBatonAll[]) {
    if (!firstBatonMap.has(b.target_id) && b.stages) {
      firstBatonMap.set(b.target_id, {
        attackerName: displayName(userMap.get(b.attacker_id) ?? ""),
        stageNumber:  b.stages.stage_number,
      });
    }
  }

  // ── Players ────────────────────────────────────────────────────────────────
  const players: PlayerInfo[] = users
    .filter((u) => u.email)
    .map((u) => {
      const dn = displayName(u.email!);
      return {
        userId:             u.id,
        displayName:        dn,
        initials:           initials(dn),
        bet:                betsMap.get(u.id) ?? null,
        batonReceived:      firstBatonMap.get(u.id) ?? null,
        batonReceivedToday: batonTargets.has(u.id),
      };
    })
    // players with a bet first, then alphabetical
    .sort((a, b) => {
      if (a.bet && !b.bet) return -1;
      if (!a.bet && b.bet) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  return {
    stage: {
      id:             stage.id,
      stage_number:   stage.stage_number,
      start_city:     stage.start_city,
      finish_city:    stage.finish_city,
      stage_type:     stage.stage_type,
      start_time_utc: stage.start_time_utc,
      distance_km:    (stage as { distance_km?: number }).distance_km ?? null,
    },
    players,
    batonEvents,
    myBatonStock,
    myUserId,
  };
}
