import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { validateJoinToken } from "@/services/room.service";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const TICKET_TTL_SECONDS = 14400;

export async function POST(request, { params }) {
  const { roomId } = await params;
  const body = await request.json().catch(() => ({}));
  const { joinToken, candidateName } = body;

  if (!joinToken) return NextResponse.json({ error: "joinToken required" }, { status: 400 });

  const room = await validateJoinToken(roomId, joinToken);
  if (!room) return NextResponse.json({ error: "Invalid invite link" }, { status: 403 });

  const resolvedName = room.candidateName?.trim() || candidateName?.trim() || null;

  const ticket = await new SignJWT({ roomId, type: "room-session", candidateName: resolvedName })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TICKET_TTL_SECONDS}s`)
    .setIssuedAt()
    .sign(SECRET);

  const response = NextResponse.json({ ok: true, candidateName: resolvedName }, { status: 200 });
  response.cookies.set(`room-ticket-${roomId}`, ticket, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TICKET_TTL_SECONDS,
    path: "/",
  });
  return response;
}
