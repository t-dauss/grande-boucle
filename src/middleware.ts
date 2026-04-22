import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/play", "/leaderboard", "/admin", "/outright"];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const accessToken = request.cookies.get("sb-access-token")?.value;
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/play/:path*", "/leaderboard/:path*", "/admin/:path*", "/outright/:path*"],
};
