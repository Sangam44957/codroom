/**
 * Enhanced CSRF protection via Origin/Referer header validation and SameSite cookies.
 * Works for same-site fetch calls (the browser always sends Origin on cross-origin
 * requests, and same-origin requests are safe by definition).
 *
 * Usage in a route handler:
 *   const csrf = checkCsrf(request);
 *   if (csrf) return csrf;
 */

import { NextResponse } from "next/server";

export function checkCsrf(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigin = new URL(appUrl).origin;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!origin && !referer) {
      return NextResponse.json({ error: "Missing Origin/Referer header" }, { status: 403 });
    }

    let refererOrigin = null;
    if (referer) {
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        return NextResponse.json({ error: "Malformed Referer header" }, { status: 403 });
      }
    }

    const source = origin || refererOrigin;
    if (!source || source !== allowedOrigin) {
      return NextResponse.json({ error: "Forbidden - Invalid origin" }, { status: 403 });
    }
  }

  return null;
}

// Enhanced cookie options for CSRF protection
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};
