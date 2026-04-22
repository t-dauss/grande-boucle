"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { supabaseClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type OddsEntry = {
  rider_id: string;
  rider_name: string;
  odds: number;
};

type MyBet = {
  bet_id: string;
  rider_id: string;
  rider_name: string;
  locked_odds: number;
  placed_at: string;
  won: boolean | null;
  points: number | null;
};

type Market = {
  market_id: string;
  slug: string;
  label: string;
  emoji: string;
  description: string;
  deadline: string;
  is_open: boolean;
  my_bet: MyBet | null;
  odds: OddsEntry[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Countdown({ deadline }: { deadline: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setLabel("Fermé"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(d > 0 ? `${d}j ${h}h` : `${h}h ${m}min`);
    }
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [deadline]);

  return <span>{label}</span>;
}

// ── Market Card ────────────────────────────────────────────────────────────────

function MarketCard({
  market,
  selectedRiderId,
  isLocked,
  onSelect,
  onBetPlaced,
  onBetCancelled,
}: {
  market: Market;
  selectedRiderId: string | null;
  isLocked: boolean;
  onSelect: (marketId: string, riderId: string) => void;
  onBetPlaced: (marketId: string, riderId: string) => void;
  onBetCancelled: (marketId: string) => void;
}) {
  const supabase = supabaseClient;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentBetRiderId = market.my_bet?.rider_id ?? null;
  const isOpen = market.is_open;
  const canInteract = isOpen && !isLocked;

  // Rider confirmé sélectionné dans le footer = la sélection en cours, ou le pari actuel
  const activeSelection = selectedRiderId ?? currentBetRiderId;
  const selectedEntry = market.odds?.find((o) => o.rider_id === activeSelection);
  const hasChanged = selectedRiderId !== null && selectedRiderId !== currentBetRiderId;

  const handleConfirm = useCallback(async () => {
    if (!selectedRiderId || !hasChanged || !canInteract) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: rpcError } = await supabase.rpc("place_outright_bet", {
        p_user_id:   user.id,
        p_market_id: market.market_id,
        p_rider_id:  selectedRiderId,
      });

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setSuccess(true);
        onBetPlaced(market.market_id, selectedRiderId);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }, [selectedRiderId, hasChanged, canInteract, market.market_id, onBetPlaced]);

  const handleCancel = useCallback(async () => {
    if (!canInteract) return;
    startTransition(async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc("cancel_outright_bet", { p_user_id: user.id });
      onBetCancelled(market.market_id);
    });
  }, [canInteract, market.market_id, onBetCancelled]);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-opacity ${isLocked ? "border-zinc-800/50 bg-zinc-900/50 opacity-50" : "border-zinc-800 bg-zinc-900"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{market.emoji}</span>
          <div>
            <h2 className="font-bold text-zinc-100 text-base">{market.label}</h2>
            <p className="text-xs text-zinc-500">{market.description}</p>
          </div>
        </div>
        <div className={`text-right text-xs shrink-0 ${isOpen ? "text-tdfGreen" : "text-zinc-500"}`}>
          {isOpen ? (
            <>
              <div className="font-semibold">Ouvert</div>
              <div className="text-zinc-500">
                Ferme dans <Countdown deadline={market.deadline} />
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-zinc-500">Fermé</div>
              <div>{formatDeadline(market.deadline)}</div>
            </>
          )}
        </div>
      </div>

      {/* Résultat si scoré */}
      {market.my_bet?.won !== null && market.my_bet?.won !== undefined && (
        <div className={`px-5 py-3 text-sm font-semibold border-b border-zinc-800 ${market.my_bet.won ? "bg-tdfGreen/10 text-tdfGreen" : "bg-zinc-800/50 text-zinc-400"}`}>
          {market.my_bet.won
            ? `🎉 Gagné ! +${market.my_bet.points?.toFixed(2)} pts`
            : `❌ Raté — ${market.my_bet.rider_name} n'a pas gagné`}
        </div>
      )}

      {/* Liste des cotes */}
      <div className="divide-y divide-zinc-800/60">
        {(market.odds ?? []).map((entry) => {
          const isCurrentBet = entry.rider_id === currentBetRiderId;
          const isSelected   = entry.rider_id === selectedRiderId;

          return (
            <button
              key={entry.rider_id}
              disabled={!canInteract}
              onClick={() => canInteract && onSelect(market.market_id, entry.rider_id)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors
                ${isSelected
                  ? "bg-tdfYellow/10 border-l-2 border-tdfYellow"
                  : isCurrentBet
                  ? "bg-zinc-800/40"
                  : "hover:bg-zinc-800/30"}
                ${!canInteract ? "cursor-default" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                  ${isSelected ? "border-tdfYellow bg-tdfYellow" : isCurrentBet ? "border-zinc-400 bg-zinc-400" : "border-zinc-600"}`}>
                  {(isSelected || isCurrentBet) && (
                    <div className="w-2 h-2 rounded-full bg-zinc-900" />
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {entry.rider_name}
                </span>
                {isCurrentBet && !isSelected && (
                  <span className="text-xs text-zinc-500 shrink-0">pari en cours</span>
                )}
              </div>
              <span className={`font-mono font-bold text-sm shrink-0 ${isSelected ? "text-tdfYellow" : "text-zinc-400"}`}>
                ×{entry.odds.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {canInteract && (
        <div className="px-5 py-4 border-t border-zinc-800 space-y-3">
          {error && <p className="text-tdfRed text-xs">{error}</p>}
          {success && <p className="text-tdfGreen text-xs">✓ Pari enregistré !</p>}

          {hasChanged ? (
            // Nouvelle sélection en attente de confirmation
            <div className="flex items-center gap-3">
              <div className="flex-1 text-sm text-zinc-500">
                {currentBetRiderId ? "Remplacer par" : "Miser sur"}{" "}
                <span className="text-zinc-200 font-medium">{selectedEntry?.rider_name}</span>{" "}
                à <span className="text-tdfYellow font-mono">×{selectedEntry?.odds.toFixed(2)}</span>
              </div>
              <button
                disabled={pending}
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-tdfYellow text-zinc-900 hover:bg-yellow-300 disabled:opacity-50"
              >
                {pending ? "…" : currentBetRiderId ? "Modifier" : "Confirmer"}
              </button>
            </div>
          ) : currentBetRiderId ? (
            // Pari placé, aucun changement en cours
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                Sélectionne un autre coureur pour modifier, ou annule ton pari pour changer de marché.
              </p>
              <button
                disabled={pending}
                onClick={handleCancel}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:border-tdfRed hover:text-tdfRed transition-colors disabled:opacity-50"
              >
                {pending ? "…" : "Annuler le pari"}
              </button>
            </div>
          ) : (
            // Aucun pari, aucune sélection
            <p className="text-sm text-zinc-600">Sélectionne un coureur</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OutrightClient({
  initialMarkets,
}: {
  initialMarkets: Market[];
}) {
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [selection, setSelection] = useState<{ marketId: string; riderId: string } | null>(null);

  const placedMarketId = markets.find((m) => m.my_bet)?.market_id ?? null;

  const handleSelect = useCallback((marketId: string, riderId: string) => {
    setSelection({ marketId, riderId });
  }, []);

  const handleBetPlaced = useCallback((marketId: string, riderId: string) => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.market_id !== marketId) return m;
        const entry = m.odds.find((o) => o.rider_id === riderId);
        return {
          ...m,
          my_bet: {
            bet_id:      "",
            rider_id:    riderId,
            rider_name:  entry?.rider_name ?? "",
            locked_odds: entry?.odds ?? 0,
            placed_at:   new Date().toISOString(),
            won:         null,
            points:      null,
          },
        };
      })
    );
    setSelection(null);
  }, []);

  const handleBetCancelled = useCallback((marketId: string) => {
    setMarkets((prev) =>
      prev.map((m) => m.market_id === marketId ? { ...m, my_bet: null } : m)
    );
    setSelection(null);
  }, []);

  const totalPotential = markets.reduce((acc, m) => {
    if (m.my_bet?.locked_odds) return acc + m.my_bet.locked_odds;
    return acc;
  }, 0);

  const scoredMarkets = markets.filter((m) => m.my_bet?.won !== null && m.my_bet?.won !== undefined);
  const earnedPoints  = scoredMarkets.reduce((acc, m) => acc + (m.my_bet?.points ?? 0), 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎯</span>
          <h1 className="text-2xl font-bold text-tdfYellow">Paris long terme</h1>
        </div>
        <p className="text-zinc-500 text-sm">
          Un seul pari au total · Modifiable jusqu'à la deadline · Cote verrouillée à la confirmation
        </p>
      </div>

      {/* Stats recap */}
      {markets.some((m) => m.my_bet) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="text-xs text-zinc-500 mb-1">Pari placé</div>
            <div className="text-xl font-mono font-bold text-zinc-100">
              {markets.find((m) => m.my_bet)?.my_bet?.rider_name}
            </div>
          </div>
          {scoredMarkets.length > 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="text-xs text-zinc-500 mb-1">Points gagnés</div>
              <div className="text-xl font-mono font-bold text-tdfYellow">
                +{earnedPoints.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="text-xs text-zinc-500 mb-1">Cote verrouillée</div>
              <div className="text-xl font-mono font-bold text-zinc-400">
                ×{totalPotential.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market cards */}
      <div className="flex flex-col gap-4">
        {markets.map((market) => {
          const isLocked = placedMarketId !== null && placedMarketId !== market.market_id;
          const selectedRiderId = selection?.marketId === market.market_id
            ? selection.riderId
            : null;

          return (
            <MarketCard
              key={market.market_id}
              market={market}
              selectedRiderId={selectedRiderId}
              isLocked={isLocked}
              onSelect={handleSelect}
              onBetPlaced={handleBetPlaced}
              onBetCancelled={handleBetCancelled}
            />
          );
        })}
      </div>

      {/* Règles */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-400 mb-2">Règles outright</p>
        <p>• Un seul pari autorisé sur l'ensemble des marchés.</p>
        <p>• Tu peux annuler et replacer ton pari jusqu'à la fermeture du marché.</p>
        <p>• La cote est verrouillée au moment de la confirmation.</p>
        <p>• Si ton coureur gagne, tu marques sa cote en points. Sinon, 0.</p>
      </div>
    </main>
  );
}
