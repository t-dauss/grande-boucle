"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState<"magic" | "password">("magic");
  const [status, setStatus]     = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage]   = useState("");

  const searchParams = useSearchParams();
  const next   = searchParams.get("next") ?? "/daily";
  const router = useRouter();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, next }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error ?? "Une erreur est survenue.");
    } else {
      setStatus("sent");
      setMessage("Vérifie ta boîte mail — le lien est valable 1 heure.");
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("SUPABASE ERROR:", error);
    console.log("REDIRECT TO:", next);

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
        }),
      });
      router.push(next);
      router.refresh();
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-tdfRed">Grande Boucle</h1>

      {status === "sent" ? (
        <p className="text-center text-zinc-300">{message}</p>
      ) : (
        <>
          {/* Toggle */}
          <div className="flex w-full rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => { setMode("magic"); setStatus("idle"); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "magic"
                  ? "bg-zinc-700 text-white"
                  : "bg-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Lien magique
            </button>
            <button
              onClick={() => { setMode("password"); setStatus("idle"); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "password"
                  ? "bg-zinc-700 text-white"
                  : "bg-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Mot de passe
            </button>
          </div>

          <form
            onSubmit={mode === "magic" ? handleMagicLink : handlePassword}
            className="flex w-full flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-tdfRed focus:outline-none"
              />
            </div>

            {mode === "password" && (
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-tdfRed focus:outline-none"
                />
              </div>
            )}

            {status === "error" && (
              <p className="text-sm text-red-400">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-tdfRed px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {status === "loading"
                ? "…"
                : mode === "magic"
                ? "Recevoir le lien de connexion"
                : "Se connecter"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}