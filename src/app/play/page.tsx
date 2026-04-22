import { getSessionUser, supabaseAdmin } from "@/lib/supabase/server";
import { PlayClient } from "./PlayClient";
import type {
  StageType,
  RestDayType,
  RiderWithOddsType,
  ExistingBetType,
  BonusStockType,
} from "./PlayClient";

// ── Raw Supabase shapes (no generated DB types) ────────────────────────────────

type RawOddRow = {
  odds: string;
  rider_id: string;
  riders: {
    full_name: string;
    uci_code: string | null;
    is_active: boolean;
    teams: { name: string; short_code: string } | null;
  } | null;
};

type RawBetRow = {
  id: string;
  picked_rider_id: string;
  bet_bonus_usage: Array<{ bonus_type: string }>;
};

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function getTodayStage(): Promise<StageType | null> {
  if (!supabaseAdmin) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("stages")
    .select(
      "id, stage_number, date, start_city, finish_city, stage_type, " +
      "start_time_utc, status, distance_km, profile_label",
    )
    .eq("date", today)
    .maybeSingle();
  return (data as StageType | null) ?? null;
}

async function getTodayRestDay(): Promise<RestDayType | null> {
  if (!supabaseAdmin) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("rest_days")
    .select("rest_day_number, date, city, label")
    .eq("date", today)
    .maybeSingle();
  return (data as RestDayType | null) ?? null;
}

async function getRidersWithOdds(stageId: string): Promise<RiderWithOddsType[]> {
  if (!supabaseAdmin) return [];

  const [oddsRes, picksRes] = await Promise.all([
    supabaseAdmin
      .from("stage_odds")
      .select(
        "odds, rider_id, " +
        "riders(full_name, uci_code, is_active, teams(name, short_code))",
      )
      .eq("stage_id", stageId)
      .order("odds", { ascending: true }),
    supabaseAdmin
      .from("bets")
      .select("picked_rider_id")
      .eq("stage_id", stageId)
      .eq("is_active_pick", true),
  ]);

  // Build pick-count map
  const pickCounts: Record<string, number> = {};
  for (const row of picksRes.data ?? []) {
    const id = row.picked_rider_id as string;
    pickCounts[id] = (pickCounts[id] ?? 0) + 1;
  }

  const rows = (oddsRes.data ?? []) as unknown as RawOddRow[];

  return rows
    .filter((r) => r.riders?.is_active && r.riders.teams)
    .map((r) => ({
      rider_id:        r.rider_id,
      full_name:       r.riders!.full_name,
      uci_code:        r.riders!.uci_code ?? null,
      team_name:       r.riders!.teams!.name,
      team_short_code: r.riders!.teams!.short_code,
      odds:            Number(r.odds),
      picks_count:     pickCounts[r.rider_id] ?? 0,
    }));
}

async function getExistingBet(
  userId: string,
  stageId: string,
): Promise<ExistingBetType | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("bets")
    .select("id, picked_rider_id, bet_bonus_usage(bonus_type)")
    .eq("user_id", userId)
    .eq("stage_id", stageId)
    .eq("is_active_pick", true)
    .maybeSingle();
  if (!data) return null;
  const raw = data as unknown as RawBetRow;
  return {
    bet_id:           raw.id,
    picked_rider_id:  raw.picked_rider_id,
    bonuses:          (raw.bet_bonus_usage ?? []).map((b) => b.bonus_type),
  };
}

async function getBonusStock(userId: string): Promise<BonusStockType[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("user_bonuses")
    .select("bonus_type, stock_total, stock_used")
    .eq("user_id", userId);
  return (data ?? []) as BonusStockType[];
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PlayPage() {
  const user = await getSessionUser();
  // Auth is enforced by middleware; user may be null only if token is stale.

  const [stage, restDay] = await Promise.all([getTodayStage(), getTodayRestDay()]);

  let riders:      RiderWithOddsType[] = [];
  let existingBet: ExistingBetType | null = null;
  let bonusStock:  BonusStockType[] = [];

  if (user) {
    bonusStock = await getBonusStock(user.id);
    if (stage) {
      [riders, existingBet] = await Promise.all([
        getRidersWithOdds(stage.id),
        getExistingBet(user.id, stage.id),
      ]);
    }
  }

  return (
    <PlayClient
      stage={stage}
      restDay={restDay}
      riders={riders}
      existingBet={existingBet}
      bonusStock={bonusStock}
      userId={user?.id ?? ""}
    />
  );
}
