import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!supabaseUrl || !anonKey || !appUrl) {
    return NextResponse.json({ error: "Auth non configuré." }, { status: 500 });
  }

  const { email, next } = await request.json() as { email?: string; next?: string };
  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  const redirectTo = `${appUrl}/api/auth/callback?next=${encodeURIComponent(next ?? "/play")}`;

  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Lien envoyé !" });
}
