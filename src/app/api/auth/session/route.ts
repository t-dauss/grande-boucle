import { NextRequest, NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * POST /api/auth/session
 * Body: { access_token: string; refresh_token: string }
 *
 * Validates the payload, decodes the JWT expiry, and sets two httpOnly
 * cookies: sb-access-token and sb-refresh-token.
 */
export async function POST(request: NextRequest) {
  let body: { access_token?: unknown; refresh_token?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { access_token, refresh_token } = body;

  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "missing_tokens" }, { status: 400 });
  }

  // Derive maxAge from the JWT exp claim so the cookie expires with the token.
  let accessMaxAge = 3600; // fallback: 1 hour
  try {
    const payload = JSON.parse(atob(access_token.split(".")[1]));
    if (typeof payload.exp === "number") {
      accessMaxAge = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
    }
  } catch {
    // malformed JWT — use fallback; the middleware will catch an expired token
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("sb-access-token", access_token, {
    ...COOKIE_OPTS,
    maxAge: accessMaxAge,
  });

  response.cookies.set("sb-refresh-token", refresh_token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return response;
}
