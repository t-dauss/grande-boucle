import { redirect } from "next/navigation";
import { getSessionUser, supabaseAdmin } from "@/lib/supabase/server";
import OutrightClient from "./OutrightClient";

export const revalidate = 0; // toujours frais (cotes et paris en temps réel)

export default async function OutrightPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { data } = await supabaseAdmin!.rpc("get_outright_snapshot", {
    p_user_id: user.id,
  });

  const markets = data ?? [];

  return <OutrightClient initialMarkets={markets} />;
}
