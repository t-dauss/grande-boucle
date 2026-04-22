"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailySnapshot, PlayerInfo, BatonEvent } from "@/lib/daily-snapshot";

// ── Constants ──────────────────────────────────────────────────────────────────

const BONUS_LABEL: Record<string, string> = {
  double_multiplier: "×2",
  shield_full_odds:  "🛡️",
  baton_attaque:     "🪄",
};

const STAGE_TYPE_LABEL: Record<string, string> = {
  mountain: "Montagne",
  hilly:    "Vallonnée",
  flat:     "Plate",
  itt:      "CLM individuel",
  ttt:      "CLM par équipes",
};

// Deterministic hue from userId (for avatar background)
function userHue(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ userId, initials }: { userId: string; initials: string }) {
  const hue = userHue(userId);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ background: `hsl(${hue},60%,40%)` }}
    >
      {initials}
    </div>
  );
}

function BonusBadge({ type }: { type: string }) {
  const label = BONUS_LABEL[type] ?? type;
  const bg =
    type === "double_multiplier"
      ? "bg-amber-500 text-zinc-900"
      : type === "shield_full_odds"
      ? "bg-sky-500 text-white"
      : "bg-purple-500 text-white";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${bg}`}>
      {label}
    </span>
  );
}

// ── Confirmation modal ─────────────────────────────────────────────────────────

function BatonModal({
  target,
  onConfirm,
  onCancel,
  loading,
}: {
  target: PlayerInfo;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-lg font-bold text-white">Confirmer le bâton 🪄</h2>
        <p className="text-zinc-300 text-sm">
          Tu vas bâtonner{" "}
          <span className="text-white font-semibold">{target.displayName}</span>
          {target.bet?.bonuses.length ? (
            <>
              {" "}et annuler son/ses bonus :{" "}
              <span className="text-amber-400 font-semibold">
                {target.bet.bonuses.map((b) => BONUS_LABEL[b] ?? b).join(", ")}
              </span>
            </>
          ) : (
            <>, l&apos;empêchant d&apos;utiliser des bonus aujourd&apos;hui</>
          )}
          .
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? "En cours…" : "Bâtonner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Player card ────────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  isSelf,
  stageStarted,
  iDidBatonToday,
  onBaton,
}: {
  player: PlayerInfo;
  isSelf: boolean;
  stageStarted: boolean;
  iDidBatonToday: boolean;
  onBaton: (p: PlayerInfo) => void;
}) {
  const canBaton =
    !isSelf &&
    !stageStarted &&
    !iDidBatonToday &&
    !player.batonReceivedToday;

  return (
    <div
      className={`relative bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition
        ${player.batonReceivedToday ? "border-red-600/60" : "border-zinc-700/50"}
        ${isSelf ? "ring-2 ring-tdfYellow/60" : ""}
      `}
    >
      {/* Top row: avatar + name + bâtonné badge */}
      <div className="flex items-center gap-3">
        <Avatar userId={player.userId} initials={player.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">
              {player.displayName}
            </span>
            {isSelf && (
              <span className="text-xs text-zinc-500 italic">(moi)</span>
            )}
          </div>
          {player.batonReceived && !player.batonReceivedToday && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Bâtonné étape {player.batonReceived.stageNumber} par{" "}
              {player.batonReceived.attackerName}
            </p>
          )}
          {player.batonReceivedToday && (
            <p className="text-xs text-red-400 font-medium mt-0.5">
              🪄 Bâtonné aujourd&apos;hui
            </p>
          )}
        </div>
      </div>

      {/* Bet info */}
      {player.bet ? (
        <div className="bg-zinc-800 rounded-xl px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-white font-medium">{player.bet.riderName}</span>
            <span className="text-zinc-400 text-xs">×{player.bet.odds}</span>
          </div>
          {player.bet.bonuses.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {player.bet.bonuses.map((b) => (
                <BonusBadge key={b} type={b} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm italic">Pas encore de pari</p>
      )}

      {/* Bâtonner button */}
      {!isSelf && (
        <button
          onClick={() => canBaton && onBaton(player)}
          disabled={!canBaton}
          className={`mt-auto w-full py-1.5 rounded-xl text-sm font-semibold transition
            ${
              canBaton
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          {player.batonReceivedToday
            ? "Déjà bâtonné"
            : iDidBatonToday
            ? "Bâton utilisé"
            : stageStarted
            ? "Étape démarrée"
            : "🪄 Bâtonner"}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DailyClient({
  snapshot: initialSnapshot,
}: {
  snapshot: DailySnapshot;
}) {
  const [snapshot, setSnapshot] = useState<DailySnapshot>(initialSnapshot);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [secAgo, setSecAgo] = useState(0);
  const [targetPlayer, setTargetPlayer] = useState<PlayerInfo | null>(null);
  const [batonLoading, setBatonLoading] = useState(false);
  const [batonError, setBatonError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { stage, players, batonEvents, myBatonStock, myUserId } = snapshot;

  // ── Polling ────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/daily");
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
        setLastUpdated(Date.now());
        setSecAgo(0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(refresh, 30_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refresh]);

  // ── "X sec ago" counter ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSecAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const now = Date.now();
  const stageStarted = stage ? new Date(stage.start_time_utc).getTime() <= now : false;
  const iDidBatonToday = batonEvents.some((e) => e.attackerId === myUserId);

  // My display name (used to detect baton events that target me)
  const myName = players.find((p) => p.userId === myUserId)?.displayName ?? "";

  // ── Baton submit ───────────────────────────────────────────────────────────
  async function handleBatonConfirm() {
    if (!targetPlayer) return;
    setBatonLoading(true);
    setBatonError(null);
    try {
      const res = await fetch("/api/baton", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetPlayer.userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatonError(data.error ?? "Erreur inconnue");
      } else {
        setTargetPlayer(null);
        await refresh();
      }
    } catch {
      setBatonError("Erreur réseau");
    } finally {
      setBatonLoading(false);
    }
  }

  // ── Stage header info ──────────────────────────────────────────────────────
  function formatTime(utc: string) {
    return new Date(utc).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const myBet = players.find((p) => p.userId === myUserId)?.bet ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              🚴 Tableau du jour
            </h1>
            {stage && (
              <span className="text-xs text-zinc-400">
                Étape {stage.stage_number}
              </span>
            )}
          </div>

          {stage ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
              <span className="font-medium text-white">
                {stage.start_city} → {stage.finish_city}
              </span>
              <span className="text-zinc-500">·</span>
              <span>{STAGE_TYPE_LABEL[stage.stage_type] ?? stage.stage_type}</span>
              {stage.distance_km && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span>{stage.distance_km} km</span>
                </>
              )}
              <span className="text-zinc-500">·</span>
              <span
                className={
                  stageStarted ? "text-red-400 font-medium" : "text-tdfGreen font-medium"
                }
              >
                {stageStarted
                  ? "Démarrée"
                  : `Départ à ${formatTime(stage.start_time_utc)}`}
              </span>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Aucune étape aujourd&apos;hui.</p>
          )}

          {/* My bet status */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {myBet ? (
              <span className="inline-flex items-center gap-1.5 bg-tdfGreen/20 text-tdfGreen border border-tdfGreen/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                ✅ Pari posé — {myBet.riderName}
                {myBet.bonuses.length > 0 &&
                  myBet.bonuses.map((b) => (
                    <BonusBadge key={b} type={b} />
                  ))}
              </span>
            ) : (
              <span className="inline-flex items-center bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                ⚠️ Pas encore de pari
              </span>
            )}
            {myBatonStock > 0 && (
              <span className="inline-flex items-center bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">
                🪄 {myBatonStock} bâton{myBatonStock > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Bâton announcements ──────────────────────────────────────────── */}
        {batonEvents.length > 0 && (
          <div className="space-y-2">
            {batonEvents.map((ev, i) => {
              const isAboutMe =
                ev.attackerId === myUserId || ev.targetName === myName;
              return (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 text-sm border ${
                    isAboutMe
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300"
                  }`}
                >
                  🪄{" "}
                  <span className="font-semibold text-white">
                    {ev.attackerName}
                  </span>{" "}
                  a bâtonné{" "}
                  <span className="font-semibold text-white">
                    {ev.targetName}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Baton error ───────────────────────────────────────────────────── */}
        {batonError && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
            ❌ {batonError}
          </div>
        )}

        {/* ── Player grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((player) => (
            <PlayerCard
              key={player.userId}
              player={player}
              isSelf={player.userId === myUserId}
              stageStarted={stageStarted}
              iDidBatonToday={iDidBatonToday}
              onBaton={setTargetPlayer}
            />
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <p className="text-center text-zinc-600 text-xs pt-2">
          Mis à jour il y a {secAgo}s · actualisation auto toutes les 30s
        </p>
      </div>

      {/* ── Confirmation modal ────────────────────────────────────────────── */}
      {targetPlayer && (
        <BatonModal
          target={targetPlayer}
          onConfirm={handleBatonConfirm}
          onCancel={() => {
            setTargetPlayer(null);
            setBatonError(null);
          }}
          loading={batonLoading}
        />
      )}
    </div>
  );
}
