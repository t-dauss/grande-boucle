import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase magic-link callbacks embed access_token + refresh_token in the
 * URL *fragment* (#). Fragments are never sent to the server, so we cannot
 * read them here. We simply redirect the browser to the client-side
 * /auth/confirm page; the browser preserves the fragment automatically when
 * following an HTTP redirect whose target has no fragment of its own.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  return NextResponse.redirect(new URL("/auth/confirm", origin));
}
