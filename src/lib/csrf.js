/**
 * Lightweight CSRF protection via Origin/Referer header validation.
 * Works for same-site fetch calls (the browser always sends Origin on cross-origin
 * requests, and same-origin requests are safe by definition).
 *
 * Usage in a route handler:
 *   const csrf = checkCsrf(request);
 *   if (csrf) return csrf;
 */

export function checkCsrf(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigin = new URL(appUrl).origin;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const source = origin || (referer ? new URL(referer).origin : null);

  if (!source || source !== allowedOrigin) {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
