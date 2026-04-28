import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { validateJoinToken } from "@/services/room.service";
import { sanitizeName } from "@/lib/sanitize";
import { ROOM_TICKET_OPTIONS } from "@/lib/secureCookies";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const TICKET_TTL_SECONDS = 14400; // 4 hours
const SESSION_TTL_SECONDS = 3600; // 1 hour for persistent session

export async function POST(request, { params }) {
  // Skip CSRF check for invite link joins - candidates come from external sources
  // The joinToken itself provides sufficient protection against unauthorized access
  
  const { roomId } = await params;
  const body = await request.json().catch(() => ({}));
  const { joinToken, candidateName } = body;

  if (!joinToken) return NextResponse.json({ error: "joinToken required" }, { status: 400 });

  const room = await validateJoinToken(roomId, joinToken);
  if (!room) return NextResponse.json({ error: "Invalid invite link" }, { status: 403 });

  const resolvedName = sanitizeName(room.candidateName || candidateName) || null;

  const ticket = await new SignJWT({ roomId, type: "room-session", candidateName: resolvedName })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TICKET_TTL_SECONDS}s`)
    .setIssuedAt()
    .sign(SECRET);

  const response = NextResponse.json({ 
    ok: true, 
    candidateName: resolvedName,
    roomTicket: ticket // Return ticket in response instead of cookie
  }, { status: 200 });
  
  // Set persistent session cookie that survives page refresh
  response.cookies.set(`room-ticket-${roomId}`, ticket, ROOM_TICKET_OPTIONS);
  
  return response;
}
