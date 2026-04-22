import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { buildDailySnapshot } from "@/lib/daily-snapshot";
import DailyClient from "./DailyClient";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const snapshot = await buildDailySnapshot(user.id);

  return <DailyClient snapshot={snapshot} />;
}
