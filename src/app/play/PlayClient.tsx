"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { computeScore } from "@/lib/scoring";

// ── Exported types (consumed by page.tsx) ─────────────────────────────────────

export type StageType = {
  id: string;
  stage_number: number;
  date: string;
  start_city: string;
  finish_city: string;
  stage_type: string;
  start_time_utc: string;
  status: string;
  distance_km: number | null;
  profile_label: string | null;
};

export type RestDayType = {
  rest_day_number: number;
  date: string;
  city: string;
  label: string;
};

export type RiderWithOddsType = {
  rider_id: string;
  full_name: string;
  uci_code: string | null;
  team_name: string;
  team_short_code: string;
  odds: number;
  picks_count: number;
};

export type ExistingBetType = {
  bet_id: string;
  picked_rider_id: string;
  bonuses: string[];
};

export type BonusStockType = {
  bonus_type: string;
  stock_total: number;
  stock_used: number;
};

// ── Constants ──────────────────────────────────────────────────────────────────

/** Team colour bar — keyed by UCI team short_code (uppercase) */
const TEAM_COLORS: Record<string, string> = {
  UAD: "#EF3340", // UAE Team Emirates
  TJV: "#FFD600", // Visma | Lease a Bike
  SOQ: "#004C97", // Soudal Quick-Step
  BOH: "#CC0000", // Red Bull-Bora-Hansgrohe
  IGD: "#1A56DB", // Ineos Grenadiers
  MOV: "#009FE3", // Movistar
  ADC: "#5B8A00", // Alpecin-Deceuninck
  TUD: "#9B1C1C", // Tudor Pro Cycling
  IWG: "#F97316", // Intermarché-Wanty
  LTK: "#DC2626", // Lidl-Trek
  EFE: "#FB7185", // EF Education-EasyPost
  LTS: "#FF2D55", // Lotto-Dstny
  GFC: "#0066B3", // Groupama-FDJ
  TEN: "#F59E0B", // TotalEnergies
  AST: "#4B9EDB", // Astana Qazaqstan
  JAY: "#2563EB", // Jayco AlUla
  DSM: "#F28B00", // dsm-firmenich PostNL
  COF: "#E50019", // Cofidis
  ARK: "#1A7F3C", // AG2R Citroën
  IPT: "#003580", // Israel-Premier Tech
};

/** Country flag emoji — keyed by UCI 3-letter national code */
const UCI_FLAGS: Record<string, string> = {
  SLO: "🇸🇮", DEN: "🇩🇰", BEL: "🇧🇪", ESP: "🇪🇸", GBR: "🇬🇧",
  NED: "🇳🇱", ERI: "🇪🇷", ITA: "🇮🇹", SUI: "🇨🇭", USA: "🇺🇸",
  IRL: "🇮🇪", FRA: "🇫🇷", AUS: "🇦🇺", COL: "🇨🇴", NOR: "🇳🇴",
  GER: "🇩🇪", POR: "🇵🇹", AUT: "🇦🇹", POL: "🇵🇱", SVK: "🇸🇰",
  CZE: "🇨🇿", RSA: "🇿🇦", KAZ: "🇰🇿", ECU: "🇪🇨", CAN: "🇨🇦",
  SWE: "🇸🇪", NZL: "🇳🇿", LUX: "🇱🇺", LTU: "🇱🇹", RUS: "🇷🇺",
};

/** Hardcoded jersey badges — will be replaced by DB data later */
const JERSEY_OVERRIDES: Record<string, string[]> = {
  "Tadej Pogačar": ["🟡"],
};

const STAGE_EMOJI: Record<string, string> = {
  mountain: "⛰️",
  hilly:    "🏔️",
  flat:     "🏃",
  itt:      "⏱️",
  ttt:      "👥",
};

const STAGE_LABEL: Record<string, string> = {
  mountain: "Montagne",
  hilly:    "Vallonné",
  flat:     "Plat",
  itt:      "CLM individuel",
  ttt:      "CLM par équipes",
};

const SIM_RANKS: Array<{ rank: number | null; label: string }> = [
  { rank: 1,    label: "1ᵉʳ"        },
  { rank: 2,    label: "2ᵉ"         },
  { rank: 3,    label: "3ᵉ"         },
  { rank: 4,    label: "4ᵉ"         },
  { rank: 5,    label: "5ᵉ"         },
  { rank: null, label: "Hors top 5" },
];

const CLOSE_BEFORE_MS = 15 * 60 * 1000; // bets close 15 min before stage start

// ── Pure helpers ───────────────────────────────────────────────────────────────

function teamColor(code: string): string {
  return TEAM_COLORS[code.toUpperCase()] ?? "#6B7280";
}

function countryFlag(uciCode: string | null): string {
  if (!uciCode) return "";
  return UCI_FLAGS[uciCode.slice(0, 3).toUpperCase()] ?? "";
}

function fmtCountdown(ms: number): { text: string; urgent: boolean; closed: boolean } {
  if (ms <= 0) return { text: "🔒 Paris fermés", urgent: false, closed: true };
  const sec    = Math.floor(ms / 1000);
  const h      = Math.floor(sec / 3600);
  const m      = Math.floor((sec % 3600) / 60);
  const s      = sec % 60;
  const urgent = sec < 300;
  if (h > 0) return { text: `${h}h ${String(m).padStart(2, "0")}min`, urgent, closed: false };
  return { text: `${m}min ${String(s).padStart(2, "0")}s`, urgent, closed: false };
}

// ── Component ──────────────────────────────────────────────────────────────────

type Props = {
  stage:       StageType | null;
  restDay:     RestDayType | null;
  riders:      RiderWithOddsType[];
  existingBet: ExistingBetType | null;
  bonusStock:  BonusStockType[];
  userId:      string;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function PlayClient({
  stage,
  restDay,
  riders,
  existingBet,
  bonusStock,
  userId: _userId,
}: Props) {
  const [search,       setSearch]       = useState("");
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [hasDouble,    setHasDouble]    = useState(false);
  const [hasShield,    setHasShield]    = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [imgError,     setImgError]     = useState(false);
  const [hlRank,       setHlRank]       = useState<number | null | undefined>(undefined);
  const [now,          setNow]          = useState(() => Date.now());

  // Tick every second for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pre-select existing bet on mount
  useEffect(() => {
    if (!existingBet) return;
    setSelectedId(existingBet.picked_rider_id);
    setHasDouble(existingBet.bonuses.includes("double_multiplier"));
    setHasShield(existingBet.bonuses.includes("shield_full_odds"));
  }, [existingBet]);

  // ── Derived state ────────────────────────────────────────────────────────

  const startMs  = stage ? new Date(stage.start_time_utc).getTime() : Infinity;
  const closeMs  = startMs - CLOSE_BEFORE_MS;
  const isClosed = now >= closeMs;   // show "Paris fermés"
  const isLocked = now >= startMs;   // block CTA submit
  const countdown = fmtCountdown(closeMs - now);

  const doubleBonus    = bonusStock.find((b) => b.bonus_type === "double_multiplier");
  const shieldBonus    = bonusStock.find((b) => b.bonus_type === "shield_full_odds");
  const doubleLeft     = doubleBonus ? doubleBonus.stock_total - doubleBonus.stock_used : 0;
  const shieldLeft     = shieldBonus ? shieldBonus.stock_total - shieldBonus.stock_used : 0;

  const filteredRiders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return riders;
    return riders.filter(
      (r) => r.full_name.toLowerCase().includes(q) || r.team_name.toLowerCase().includes(q),
    );
  }, [search, riders]);

  const selectedRider = riders.find((r) => r.rider_id === selectedId) ?? null;

  const simRows = SIM_RANKS.map(({ rank, label }) => ({
    rank,
    label,
    pts: selectedRider
      ? computeScore({
          odds:                selectedRider.odds,
          rank,
          hasDoubleMultiplier: hasDouble,
          hasShield,
        }).finalPoints
      : null,
  }));

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleBet = useCallback(async () => {
    if (!selectedId || !stage || isLocked || submitStatus !== "idle") return;
    setSubmitStatus("loading");
    setErrorMsg(null);

    const bonuses: string[] = [
      ...(hasDouble ? ["double_multiplier"]  : []),
      ...(hasShield ? ["shield_full_odds"]   : []),
    ];

    try {
      const res  = await fetch("/api/bets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stageId: stage.id, riderId: selectedId, bonuses }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSubmitStatus("success");
      setTimeout(() => setSubmitStatus("idle"), 2000);
    } catch (e) {
      setSubmitStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [selectedId, stage, isLocked, submitStatus, hasDouble, hasShield]);

  // ── Rest day screen ──────────────────────────────────────────────────────

  if (restDay) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-tdfGreen/30 bg-tdfGreen/10 p-8 text-center">
          <p className="text-4xl">🌿</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-tdfGreen">
            Jour de repos nº{restDay.rest_day_number}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">{restDay.city}</h1>
          <p className="mt-2 text-sm text-zinc-400">{restDay.label}</p>
          <p className="mt-4 text-xs text-zinc-600">
            Les paris reprennent à la prochaine étape.
          </p>
        </div>
      </main>
    );
  }

  // ── No stage today ───────────────────────────────────────────────────────

  if (!stage) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-4xl">🗓️</p>
          <h1 className="mt-3 text-xl font-bold text-zinc-300">Aucune étape aujourd'hui</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Reviens demain pour parier sur la prochaine étape.
          </p>
        </div>
      </main>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  const profilePhotos: Record<string, string> = {
    mountain: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=70",
    hilly:    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=70",
    flat:     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=70",
    itt:      "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=70",
    ttt:      "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=70",
  };
  const heroUrl = profilePhotos[stage.stage_type] ?? profilePhotos.flat;
  const startTimeStr = new Date(stage.start_time_utc).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <main className="mx-auto max-w-2xl pb-28">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl">
        {!imgError ? (
          <img
            src={heroUrl}
            alt={stage.finish_city}
            className="h-48 w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-tdfGreen/25 via-zinc-900 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-tdfYellow">
                Étape {stage.stage_number}
              </p>
              <h1 className="mt-0.5 truncate text-xl font-extrabold leading-tight">
                {stage.start_city}{" "}
                <span className="font-light text-zinc-400">→</span>{" "}
                {stage.finish_city}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Stage type badge */}
                <span className="rounded border border-zinc-600/70 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-semibold text-zinc-200 backdrop-blur-sm">
                  {STAGE_EMOJI[stage.stage_type] ?? "🚴"}{" "}
                  {STAGE_LABEL[stage.stage_type] ?? stage.stage_type}
                </span>
                {stage.distance_km != null && (
                  <span className="text-xs text-zinc-400">{stage.distance_km} km</span>
                )}
                <span className="text-xs text-zinc-400">Départ {startTimeStr}</span>
                {/* Bet status badge */}
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                  isClosed
                    ? "bg-tdfRed/20 text-tdfRed"
                    : "bg-tdfGreen/20 text-tdfGreen"
                }`}>
                  {isClosed ? "🔴 Paris fermés" : "🟢 Paris ouverts"}
                </span>
              </div>
            </div>

            {/* Countdown pill */}
            <div className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center backdrop-blur-sm ${
              countdown.closed
                ? "border-zinc-700 bg-zinc-800/80 text-zinc-400"
                : countdown.urgent
                ? "border-tdfRed/40 bg-tdfRed/15 text-red-400"
                : "border-tdfYellow/30 bg-tdfYellow/10 text-tdfYellow"
            }`}>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                Fermeture
              </p>
              <p className="mt-0.5 min-w-[72px] text-sm font-extrabold tabular-nums leading-none">
                {countdown.text}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-8 px-4">

        {/* ── Riders ────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Coureurs
          </h2>

          {/* Search bar */}
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Nom ou équipe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-4 text-sm placeholder-zinc-600 focus:border-tdfYellow/40 focus:outline-none focus:ring-1 focus:ring-tdfYellow/20"
            />
          </div>

          {/* Empty states */}
          {riders.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-12 text-center">
              <p className="text-sm text-zinc-500">
                Aucune cote disponible pour cette étape.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Les cotes seront ajoutées par l'admin avant le départ.
              </p>
            </div>
          )}
          {filteredRiders.length === 0 && riders.length > 0 && (
            <p className="py-6 text-center text-sm text-zinc-600">Aucun résultat</p>
          )}

          {/* Rider cards */}
          <div className="space-y-2">
            {filteredRiders.map((rider) => {
              const sel     = rider.rider_id === selectedId;
              const jerseys = JERSEY_OVERRIDES[rider.full_name] ?? [];
              const flag    = countryFlag(rider.uci_code);
              const color   = teamColor(rider.team_short_code);

              return (
                <button
                  key={rider.rider_id}
                  onClick={() => !isClosed && setSelectedId(sel ? null : rider.rider_id)}
                  disabled={isClosed}
                  className={`relative w-full overflow-hidden rounded-xl border text-left transition-all duration-150 ${
                    sel
                      ? "border-tdfYellow/60 bg-tdfYellow/5 shadow-md shadow-tdfYellow/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60"
                  } ${isClosed ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  {/* Team colour bar */}
                  <span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ backgroundColor: color }}
                  />

                  <div className="py-3 pl-5 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">

                        {/* Name + flag + jerseys */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {flag && <span className="text-base leading-none">{flag}</span>}
                          <span className={`font-bold leading-snug ${sel ? "text-tdfYellow" : "text-zinc-100"}`}>
                            {rider.full_name}
                          </span>
                          {jerseys.map((j, i) => (
                            <span key={i} className="text-sm leading-none">{j}</span>
                          ))}
                        </div>

                        <p className="mt-0.5 truncate text-xs text-zinc-500">{rider.team_name}</p>

                        {/* Stats chips */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                          <span>GC —</span>
                          <span>0V · 0 top5</span>
                          {rider.picks_count > 0 && (
                            <span>
                              👥 {rider.picks_count} joueur{rider.picks_count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Odds badge + radio dot */}
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-lg px-2 py-1 text-sm font-extrabold tabular-nums ${
                          sel ? "bg-tdfYellow text-zinc-900" : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {rider.odds.toFixed(1)}x
                        </span>
                        {sel ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tdfYellow">
                            <svg className="h-3 w-3 text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" clipRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="h-5 w-5 rounded-full border border-zinc-700" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Bonus ─────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Bonus
          </h2>
          <div className="space-y-2">

            {/* Double multiplier */}
            {(() => {
              const disabled = isClosed || doubleLeft <= 0;
              return (
                <label className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                  hasDouble ? "border-tdfYellow/40 bg-tdfYellow/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                  <input
                    type="checkbox" className="sr-only"
                    checked={hasDouble}
                    onChange={(e) => setHasDouble(e.target.checked)}
                    disabled={disabled}
                  />
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${
                    hasDouble ? "bg-tdfYellow text-zinc-900" : "bg-zinc-800 text-zinc-300"
                  }`}>⚡</div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${hasDouble ? "text-tdfYellow" : "text-zinc-100"}`}>
                      Double multiplicateur
                    </p>
                    <p className="text-xs text-zinc-500">×2 sur tous tes points finaux</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span className={`text-xs font-medium ${doubleLeft > 0 ? "text-zinc-400" : "text-tdfRed"}`}>
                      {doubleLeft}&nbsp;restant{doubleLeft !== 1 ? "s" : ""}
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      hasDouble ? "border-tdfYellow bg-tdfYellow" : "border-zinc-600"
                    }`}>
                      {hasDouble && (
                        <svg className="h-3 w-3 text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </span>
                  </div>
                </label>
              );
            })()}

            {/* Shield */}
            {(() => {
              const disabled = isClosed || shieldLeft <= 0;
              return (
                <label className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                  hasShield ? "border-tdfGreen/40 bg-tdfGreen/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}>
                  <input
                    type="checkbox" className="sr-only"
                    checked={hasShield}
                    onChange={(e) => setHasShield(e.target.checked)}
                    disabled={disabled}
                  />
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
                    hasShield ? "bg-tdfGreen/25" : "bg-zinc-800"
                  }`}>🛡️</div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${hasShield ? "text-tdfGreen" : "text-zinc-100"}`}>
                      Bouclier
                    </p>
                    <p className="text-xs text-zinc-500">Top 2–5 = cote pleine (pas de division)</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span className={`text-xs font-medium ${shieldLeft > 0 ? "text-zinc-400" : "text-tdfRed"}`}>
                      {shieldLeft}&nbsp;restant{shieldLeft !== 1 ? "s" : ""}
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      hasShield ? "border-tdfGreen bg-tdfGreen" : "border-zinc-600"
                    }`}>
                      {hasShield && (
                        <svg className="h-3 w-3 text-zinc-900" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" clipRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </span>
                  </div>
                </label>
              );
            })()}

            {/* Locked future slot */}
            <div className="flex cursor-not-allowed items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 opacity-40">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl">
                🔒
              </div>
              <div>
                <p className="font-semibold text-zinc-400">Bonus spécial</p>
                <p className="text-xs text-zinc-600">Disponible étape 15</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Point simulation ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Simulation de points
            </h2>
            {selectedRider && (
              <p className="truncate text-xs text-zinc-500">
                {selectedRider.full_name}{" "}
                <span className="text-zinc-400">· {selectedRider.odds.toFixed(1)}x</span>
                {hasDouble && <span className="ml-1 font-semibold text-tdfYellow">⚡</span>}
                {hasShield && <span className="ml-1">🛡️</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {simRows.map(({ rank, label, pts }) => {
              const isHL = hlRank === rank;
              return (
                <button
                  key={label}
                  onClick={() => setHlRank(isHL ? undefined : rank)}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    isHL
                      ? "border-tdfYellow/50 bg-tdfYellow/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <p className={`text-xs font-semibold ${isHL ? "text-tdfYellow" : "text-zinc-500"}`}>
                    {label}
                  </p>
                  <p className={`mt-1 text-lg font-extrabold tabular-nums leading-none ${
                    pts === null
                      ? "text-zinc-700"
                      : pts === 0
                      ? "text-zinc-600"
                      : isHL
                      ? "text-tdfYellow"
                      : "text-zinc-100"
                  }`}>
                    {pts === null ? "–" : pts === 0 ? "0" : pts.toFixed(1)}
                  </p>
                  {pts !== null && pts > 0 && (
                    <p className={`mt-0.5 text-[10px] ${isHL ? "text-tdfYellow/60" : "text-zinc-600"}`}>
                      pts
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {!selectedRider && (
            <p className="mt-2 text-center text-xs text-zinc-600">
              Sélectionne un coureur pour voir les points possibles
            </p>
          )}
        </section>

      </div>

      {/* ── Sticky CTA ────────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-2xl space-y-2">
          {submitStatus === "error" && errorMsg && (
            <p className="rounded-lg bg-tdfRed/15 px-4 py-2 text-center text-sm text-tdfRed">
              {errorMsg}
            </p>
          )}
          <button
            onClick={handleBet}
            disabled={!selectedId || isLocked || submitStatus !== "idle"}
            className={`w-full rounded-xl py-3.5 text-[15px] font-extrabold tracking-wide transition-all active:scale-[0.98] ${
              isLocked
                ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                : !selectedId
                ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                : submitStatus === "loading"
                ? "cursor-wait bg-tdfYellow/60 text-zinc-900"
                : submitStatus === "success"
                ? "cursor-default bg-tdfGreen text-white"
                : "bg-tdfYellow text-zinc-900 shadow-lg shadow-tdfYellow/20 hover:bg-yellow-300"
            }`}
          >
            {isLocked ? (
              "🔒 Paris fermés"
            ) : submitStatus === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validation…
              </span>
            ) : submitStatus === "success" ? (
              "✅ Pari enregistré !"
            ) : selectedRider ? (
              `🎰 Valider — ${selectedRider.full_name}`
            ) : (
              "Sélectionne un coureur"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
