import { redirect } from "next/navigation";
import { getSessionUser, isAdminEmail, supabaseAdmin } from "@/lib/supabase/server";
import { StageSeedEditor } from "./stage-seed-editor";

async function getStages() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("stages")
    .select("id, stage_number, date, start_city, finish_city, stage_type, start_time_utc, status, distance_km, profile_label")
    .order("stage_number", { ascending: true });
  return data ?? [];
}

async function getRestDays() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("rest_days")
    .select("rest_day_number, date, city, label")
    .order("rest_day_number", { ascending: true });
  return data ?? [];
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email ?? "")) {
    redirect("/");
  }

  const stages = await getStages();
  const restDays = await getRestDays();

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <h1 className="text-2xl font-bold text-tdfRed">Admin Console</h1>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Publish Top 5 Results</h2>
        <p className="mb-3 text-sm text-zinc-400">Use API route: <code>/api/admin/results</code></p>
        <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-300">
{`POST /api/admin/results
{
  "stageId": "<uuid>",
  "results": [{ "rank": 1, "riderId": "<uuid>" }, ...]
}`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Set Stage Odds</h2>
        <p className="mb-3 text-sm text-zinc-400">Use API route: <code>/api/admin/odds</code></p>
        <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-300">
{`POST /api/admin/odds
{
  "stageId": "<uuid>",
  "entries": [{ "riderId": "<uuid>", "odds": 5.5 }, ...]
}`}
        </pre>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Validate Bet Screenshot</h2>
        <p className="mb-3 text-sm text-zinc-400">Use API route: <code>/api/admin/validate-claim</code></p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Mark Rider DNS/DNF</h2>
        <p className="mb-3 text-sm text-zinc-400">Use API route: <code>/api/admin/rider-status</code></p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Configured Stages</h2>
        <div className="grid gap-2">
          {stages.map((stage) => (
            <p key={stage.id} className="text-sm text-zinc-300">
              #{stage.stage_number} - {stage.start_city} → {stage.finish_city} ({stage.stage_type}
              {stage.distance_km ? `, ${stage.distance_km} km` : ""})
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-2 text-lg font-semibold">Rest Days</h2>
        <div className="grid gap-2">
          {restDays.map((day) => (
            <p key={day.rest_day_number} className="text-sm text-zinc-300">
              {day.label} - {day.date} ({day.city})
            </p>
          ))}
        </div>
      </section>

      <StageSeedEditor
        initialStages={stages.map((stage) => ({
          stage_number: stage.stage_number,
          date: stage.date,
          start_city: stage.start_city,
          finish_city: stage.finish_city,
          stage_type: stage.stage_type,
          start_time_utc: stage.start_time_utc,
          distance_km: stage.distance_km,
          profile_label: stage.profile_label,
          status: stage.status,
        }))}
      />
    </main>
  );
}
