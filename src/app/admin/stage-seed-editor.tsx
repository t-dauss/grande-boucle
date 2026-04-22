"use client";

import { useMemo, useState } from "react";

type StageType = "flat" | "hilly" | "mountain" | "itt" | "ttt";

type StageRecord = {
  stage_number: number;
  date: string;
  start_city: string;
  finish_city: string;
  stage_type: StageType;
  start_time_utc: string;
  distance_km?: number | null;
  profile_label?: string | null;
  status: "scheduled" | "in_progress" | "finished" | "results_published";
};

export function StageSeedEditor({ initialStages }: { initialStages: StageRecord[] }) {
  const initialJson = useMemo(() => JSON.stringify(initialStages, null, 2), [initialStages]);
  const [jsonText, setJsonText] = useState(initialJson);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function saveStages() {
    try {
      setLoading(true);
      setStatus("");
      const stages = JSON.parse(jsonText) as StageRecord[];

      const response = await fetch("/api/admin/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });

      const payload = (await response.json()) as { error?: string; updated?: number };
      if (!response.ok) {
        setStatus(`Erreur: ${payload.error ?? "échec de sauvegarde"}`);
        return;
      }

      setStatus(`OK: ${payload.updated ?? stages.length} étapes mises à jour.`);
    } catch {
      setStatus("Erreur: JSON invalide. Vérifie le format.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-2 text-lg font-semibold">Seed Officielle 2026 (JSON)</h2>
      <p className="mb-3 text-sm text-zinc-400">
        Colle ici tes 21 étapes officielles puis sauvegarde.
      </p>
      <textarea
        className="min-h-[320px] w-full rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none ring-1 ring-zinc-800 focus:ring-tdfYellow"
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded bg-tdfYellow px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          onClick={saveStages}
          disabled={loading}
        >
          {loading ? "Sauvegarde..." : "Sauvegarder les étapes"}
        </button>
        <span className="text-sm text-zinc-300">{status}</span>
      </div>
    </section>
  );
}
