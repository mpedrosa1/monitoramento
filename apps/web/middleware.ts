import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, jwtExpiresAtMs } from "@/lib/auth-session-edge";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const token = rawToken ? decodeURIComponent(rawToken) : null;
  const exp = token ? jwtExpiresAtMs(token) : null;
  const sessionValid = Boolean(token && exp && Date.now() < exp);

  if (pathname.startsWith("/dashboard")) {
    if (!sessionValid) {
      const res = NextResponse.redirect(new URL("/", request.url));
      res.cookies.delete(AUTH_COOKIE_NAME);
      return res;
    }
    return NextResponse.next();
  }

  if (pathname === "/" && sessionValid) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
