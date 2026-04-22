"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client Component — reads access_token + refresh_token from the URL fragment
 * (window.location.hash), sends them to /api/auth/session so the server can
 * set httpOnly cookies, then redirects to the home page.
 */
export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading "#"
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=missing_tokens");
      return;
    }

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("session_error");
        router.replace("/");
      })
      .catch(() => {
        router.replace("/login?error=session_error");
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-400">Connexion en cours…</p>
    </div>
  );
}
