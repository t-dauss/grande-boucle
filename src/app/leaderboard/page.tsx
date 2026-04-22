import { supabaseAdmin } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────────

type StageScore = {
  stage_number: number;
  start_city: string;
  finish_city: string;
  stage_type: string;
  rider_name: string;
  base_odds: number | null;
  effective_rank: number | null;
  final_points: number | null;
  score_reason: string | null;
  bonuses_used: string[] | null;
};

type PlayerRow = {
  user_id: string;
  display_name: string;
  total_points: number;
  stage_scores: StageScore[];
};

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getLeaderboard(): Promise<PlayerRow[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.rpc("get_full_leaderboard");
  if (error || !data) {
    console.error("leaderboard error", error);
    return [];
  }
  return (data as PlayerRow[]).map((r) => ({
    ...r,
    stage_scores: (r.stage_scores as StageScore[]) ?? [],
  }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function userHue(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const STAGE_TYPE_EMOJI: Record<string, string> = {
  mountain: "⛰️",
  hilly: "🏔️",
  flat: "🏁",
  itt: "⏱️",
  ttt: "👥",
};

const REASON_LABEL: Record<string, string> = {
  top1:         "🥇 Vainqueur",
  top5_shield:  "🛡️ Top 5",
  top5_divided: "Top 5",
  outside_top5: "Hors top 5",
};

const BONUS_LABEL: Record<string, string> = {
  double_multiplier: "×2",
  shield_full_odds:  "🛡️",
  baton_attaque:     "🪄",
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ userId, name }: { userId: string; name: string }) {
  const hue = userHue(userId);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ background: `hsl(${hue},60%,40%)` }}
    >
      {initials(name)}
    </div>
  );
}

function BonusBadge({ type }: { type: string }) {
  const label = BONUS_LABEL[type] ?? type;
  const cls =
    type === "double_multiplier"
      ? "bg-amber-500 text-zinc-900"
      : type === "shield_full_odds"
      ? "bg-blue-600 text-white"
      : "bg-purple-600 text-white";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}

function StageRow({ s }: { s: StageScore }) {
  const hasScore = s.final_points !== null;
  const isScored = hasScore && s.score_reason !== null;
  const won = s.effective_rank === 1;
  const bonuses = s.bonuses_used ?? [];

  return (
    <div className={`grid grid-cols-[auto_1fr_auto] gap-x-3 items-start py-2 px-3 text-sm border-b border-zinc-800 last:border-0 ${won ? "bg-tdfYellow/5" : ""}`}>
      {/* Stage # + type */}
      <div className="flex flex-col items-center w-8 pt-0.5">
        <span className="font-mono text-xs text-zinc-400">É{s.stage_number}</span>
        <span className="text-base leading-none">{STAGE_TYPE_EMOJI[s.stage_type] ?? "🚴"}</span>
      </div>

      {/* Rider + route */}
      <div className="min-w-0">
        <div className="font-medium text-zinc-100 truncate">{s.rider_name}</div>
        <div className="text-xs text-zinc-500 truncate">
          {s.start_city} → {s.finish_city}
        </div>
        {bonuses.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {bonuses.map((b) => <BonusBadge key={b} type={b} />)}
          </div>
        )}
      </div>

      {/* Points */}
      <div className="text-right shrink-0 pt-0.5">
        {isScored ? (
          <>
            <div className={`font-mono font-bold ${(s.final_points ?? 0) > 0 ? "text-tdfYellow" : "text-zinc-500"}`}>
              {(s.final_points ?? 0) > 0 ? `+${(s.final_points!).toFixed(2)}` : "0"}
            </div>
            <div className="text-xs text-zinc-500">
              {s.effective_rank ? `#${s.effective_rank}` : "—"}
              {" · "}
              {REASON_LABEL[s.score_reason!] ?? s.score_reason}
            </div>
          </>
        ) : (
          <span className="text-xs text-zinc-600 italic">en attente</span>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ player, rank }: { player: PlayerRow; rank: number }) {
  const medal = RANK_MEDAL[rank];
  const hasStages = player.stage_scores.length > 0;

  return (
    <details className="group rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none hover:bg-zinc-800/50 transition-colors">
        {/* Rank */}
        <div className="w-8 text-center shrink-0">
          {medal ? (
            <span className="text-2xl">{medal}</span>
          ) : (
            <span className="text-lg font-mono text-zinc-500">#{rank}</span>
          )}
        </div>

        {/* Avatar */}
        <Avatar userId={player.user_id} name={player.display_name} />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-100 truncate">{player.display_name}</div>
          <div className="text-xs text-zinc-500">
            {hasStages
              ? `${player.stage_scores.length} étape${player.stage_scores.length > 1 ? "s" : ""} jouée${player.stage_scores.length > 1 ? "s" : ""}`
              : "Aucun pari scoré"}
          </div>
        </div>

        {/* Total */}
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-tdfYellow text-lg">
            {player.total_points.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500">pts</div>
        </div>

        {/* Chevron */}
        {hasStages && (
          <svg
            className="w-4 h-4 text-zinc-600 shrink-0 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </summary>

      {hasStages && (
        <div className="border-t border-zinc-800">
          {player.stage_scores.map((s) => (
            <StageRow key={s.stage_number} s={s} />
          ))}
        </div>
      )}
    </details>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export const revalidate = 60; // ISR : revalide toutes les 60s

export default async function LeaderboardPage() {
  const players = await getLeaderboard();

  const withPoints = players.filter((p) => p.total_points > 0);
  const noPoints   = players.filter((p) => p.total_points === 0);
  const allSorted  = [...withPoints, ...noPoints];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🏆</span>
          <h1 className="text-2xl font-bold text-tdfYellow">Classement général</h1>
        </div>
        <p className="text-zinc-500 text-sm">
          {players.length} participant{players.length > 1 ? "s" : ""} · Cliquez sur un joueur pour voir le détail par étape
        </p>
      </div>

      {/* Podium (top 3 uniquement si au moins 3 joueurs avec points) */}
      {withPoints.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-8 text-center">
          {/* 2e */}
          <div className="flex flex-col items-center gap-1 pt-6">
            <Avatar userId={allSorted[1].user_id} name={allSorted[1].display_name} />
            <div className="text-2xl">🥈</div>
            <div className="text-xs text-zinc-300 font-medium truncate w-full px-1">
              {allSorted[1].display_name}
            </div>
            <div className="font-mono text-sm text-zinc-400">
              {allSorted[1].total_points.toFixed(2)} pts
            </div>
          </div>
          {/* 1er */}
          <div className="flex flex-col items-center gap-1 bg-tdfYellow/10 rounded-xl p-3 border border-tdfYellow/30">
            <Avatar userId={allSorted[0].user_id} name={allSorted[0].display_name} />
            <div className="text-3xl">🥇</div>
            <div className="text-xs text-zinc-100 font-bold truncate w-full px-1">
              {allSorted[0].display_name}
            </div>
            <div className="font-mono text-tdfYellow font-bold">
              {allSorted[0].total_points.toFixed(2)} pts
            </div>
          </div>
          {/* 3e */}
          <div className="flex flex-col items-center gap-1 pt-6">
            <Avatar userId={allSorted[2].user_id} name={allSorted[2].display_name} />
            <div className="text-2xl">🥉</div>
            <div className="text-xs text-zinc-300 font-medium truncate w-full px-1">
              {allSorted[2].display_name}
            </div>
            <div className="font-mono text-sm text-zinc-400">
              {allSorted[2].total_points.toFixed(2)} pts
            </div>
          </div>
        </div>
      )}

      {/* Liste complète */}
      {allSorted.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <div className="text-4xl mb-3">🚴</div>
          <p>Le Tour n&apos;a pas encore commencé…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allSorted.map((player, i) => (
            <PlayerCard key={player.user_id} player={player} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Légende */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Légende
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <BonusBadge type="double_multiplier" />
            <span className="text-zinc-400">Double multiplicateur</span>
          </div>
          <div className="flex items-center gap-2">
            <BonusBadge type="shield_full_odds" />
            <span className="text-zinc-400">Bouclier</span>
          </div>
          <div className="flex items-center gap-2">
            <BonusBadge type="baton_attaque" />
            <span className="text-zinc-400">Bâton reçu</span>
          </div>
        </div>
      </div>
    </main>
  );
}