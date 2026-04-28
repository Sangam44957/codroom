import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * GET /api/turn
 * Returns ICE server config to authenticated users or valid room participants.
 * Requires either auth cookie or room-ticket cookie.
 */
export async function GET(request) {
  // Check for authenticated user first
  const user = await getCurrentUser();
  
  // If no user auth, check for room ticket cookie
  if (!user) {
    const cookies = request.headers.get('cookie') || '';
    const roomTicketMatch = cookies.match(/room-ticket-([^=;]+)=([^;]+)/);
    
    if (!roomTicketMatch) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }
    
    // Verify room ticket JWT is valid
    const [, roomId, ticketValue] = roomTicketMatch;
    try {
      const { payload } = await jwtVerify(ticketValue, SECRET);
      if (payload.roomId !== roomId || payload.type !== "room-session") {
        throw new Error('Invalid ticket');
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid room session" }, 
        { status: 401 }
      );
    }
  }
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
