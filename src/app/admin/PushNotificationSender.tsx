"use client";

import { useState } from "react";

export function PushNotificationSender() {
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [url, setUrl]       = useState("/daily");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setResult("");

    const res = await fetch("/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setResult(data.error ?? "Erreur inconnue");
    } else {
      setStatus("success");
      setResult(`✓ Envoyé à ${data.sent} abonné${data.sent !== 1 ? "s" : ""}${data.failed ? ` · ${data.failed} échoué${data.failed !== 1 ? "s" : ""}` : ""}`);
      setTitle("");
      setBody("");
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">Envoyer une notification push</h2>
      <form onSubmit={handleSend} className="flex flex-col gap-3 max-w-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Titre</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Résultats étape 3 disponibles"
            className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-tdfYellow focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Message</label>
          <textarea
            required
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ex : Pogacar remporte l'étape, fais ton pronostic !"
            className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-tdfYellow focus:outline-none resize-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">URL de destination</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/daily"
            className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-tdfYellow focus:outline-none"
          />
        </div>
        {result && (
          <p className={`text-sm ${status === "success" ? "text-tdfGreen" : "text-tdfRed"}`}>
            {result}
          </p>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="self-start rounded bg-tdfYellow px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50"
        >
          {status === "loading" ? "Envoi…" : "Envoyer à tous les abonnés"}
        </button>
      </form>
    </section>
  );
}
