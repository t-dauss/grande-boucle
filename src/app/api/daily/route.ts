import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { buildDailySnapshot } from "@/lib/daily-snapshot";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const snapshot = await buildDailySnapshot(user.id);
  return NextResponse.json(snapshot);
}
