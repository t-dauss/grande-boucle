import Link from "next/link";
import { ServiceWorkerRegister } from "@/lib/pwa/register-sw";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-8">
      <ServiceWorkerRegister />
      <header className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-3xl font-black text-tdfYellow">Maillot Jaune Predictor</h1>
        <p className="mt-2 text-zinc-300">
          Tour de France 2026 office game with stage picks, bonuses, and live scoring.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Link className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-tdfYellow" href="/play">
          <h2 className="font-semibold text-tdfYellow">Play</h2>
          <p className="text-sm text-zinc-300">Place a rider pick and activate bonuses before lock.</p>
        </Link>
        <Link className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-tdfGreen" href="/leaderboard">
          <h2 className="font-semibold text-tdfGreen">Leaderboard</h2>
          <p className="text-sm text-zinc-300">Track stage points and total standings.</p>
        </Link>
        <Link className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-tdfRed" href="/admin">
          <h2 className="font-semibold text-tdfRed">Admin</h2>
          <p className="text-sm text-zinc-300">Manage odds, results, and screenshot validations.</p>
        </Link>
      </section>
    </main>
  );
}
