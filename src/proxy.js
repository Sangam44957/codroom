import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "codroom-token";

// Routes that require a logged-in account (owner/admin paths)
const OWNER_ROUTES = ["/dashboard", "/problems"];
const AUTH_ROUTES = ["/login", "/register"];

export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // /room routes: candidates arrive via invite link (?joinToken=...) or with a
  // room-ticket cookie — they must NOT be redirected to login.
  // Only owner-only routes require a full account.
  const isOwnerRoute = OWNER_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isOwnerRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/problems/:path*",
    "/room/:path*",
    "/login",
    "/register",
  ],
};