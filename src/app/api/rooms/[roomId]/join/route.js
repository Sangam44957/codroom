import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { validateJoinToken } from "@/services/room.service";
import { sanitizeName } from "@/lib/sanitize";
import { ROOM_TICKET_OPTIONS } from "@/lib/secureCookies";
import { checkCsrf } from "@/lib/csrf";
import { randomBytes } from "crypto";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const TICKET_TTL_SECONDS = 14400; // 4 hours

export async function POST(request, { params }) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;
  
  const { roomId } = await params;
  const body = await request.json().catch(() => ({}));
  const { joinToken, candidateName } = body;

  if (!joinToken) return NextResponse.json({ error: "joinToken required" }, { status: 400 });

  const room = await validateJoinToken(roomId, joinToken);
  if (!room) return NextResponse.json({ error: "Invalid invite link" }, { status: 403 });

  const resolvedName = sanitizeName(room.candidateName || candidateName) || null;
  const sessionId = randomBytes(16).toString('hex'); // Unique session ID

  const ticket = await new SignJWT({ 
    roomId, 
    type: "room-session", 
    candidateName: resolvedName,
    sessionId // Scope to single session
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TICKET_TTL_SECONDS}s`)
    .setIssuedAt()
    .sign(SECRET);

  const response = NextResponse.json({ 
    ok: true, 
    candidateName: resolvedName,
    roomTicket: ticket
  }, { status: 200 });
  
  // Set session-scoped cookie
  response.cookies.set(`room-ticket-${roomId}`, ticket, {
    ...ROOM_TICKET_OPTIONS,
    sameSite: 'strict' // Prevent cross-site usage
  });
  
  return response;
}
