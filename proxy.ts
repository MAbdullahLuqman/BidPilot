import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
  ROUTES,
  SESSION_COOKIE_NAME,
} from "@/lib/constants";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(
    pathname as (typeof AUTH_ROUTES)[number],
  );

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.dashboard;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
