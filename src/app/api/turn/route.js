import { NextResponse } from "next/server";

/**
 * GET /api/turn
 * Returns ICE server config to the authenticated client.
 * Credentials are read server-side — never exposed in the JS bundle.
 *
 * Supports two providers via env vars:
 *
 * Static (self-hosted coturn / any TURN):
 *   TURN_URL=turn:your-server.com:3478
 *   TURN_USERNAME=user
 *   TURN_CREDENTIAL=secret
 *
 * Metered.ca (auto-rotating short-lived credentials):
 *   METERED_API_KEY=<key>
 *   METERED_APP_NAME=<app-name>   (subdomain, e.g. "codroom")
 */
export async function GET() {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // ── Metered.ca short-lived credentials ──────────────────────────────────
  if (process.env.METERED_API_KEY && process.env.METERED_APP_NAME) {
    try {
      const res = await fetch(
        `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`,
        { next: { revalidate: 3600 } }, // cache for 1 h
      );
      if (res.ok) {
        const servers = await res.json();
        iceServers.push(...servers);
        return NextResponse.json({ iceServers }, { status: 200 });
      }
    } catch {
      // fall through to static config
    }
  }

  // ── Static TURN (coturn / Twilio / any provider) ─────────────────────────
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME ?? "",
      credential: process.env.TURN_CREDENTIAL ?? "",
    });
  }

  return NextResponse.json({ iceServers }, { status: 200 });
}
