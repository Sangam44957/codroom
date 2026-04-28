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
  const contentType = request.headers.get("content-type");

  // Require explicit Origin header for state-changing requests with JSON content
  if (request.method !== 'GET' && contentType?.includes('application/json')) {
    if (!origin) {
      return NextResponse.json({ error: "Missing Origin header" }, { status: 403 });
    }
  }

  const source = origin || (referer ? new URL(referer).origin : null);

  // Reject requests with mismatched origins
  if (source && source !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden - Invalid origin" }, { status: 403 });
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
