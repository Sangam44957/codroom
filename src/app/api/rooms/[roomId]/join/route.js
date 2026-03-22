import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/db";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const TICKET_TTL_SECONDS = 60 * 60; // 1 hour

export async function POST(request, { params }) {
  const { roomId } = await params;
  const body = await request.json().catch(() => ({}));
  const { joinToken } = body;

  if (!joinToken) {
    return NextResponse.json({ error: "joinToken required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, joinToken: true },
  });

  if (!room || room.joinToken !== joinToken) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 403 });
  }

  // Issue a short-lived signed ticket scoped to this room
  const ticket = await new SignJWT({ roomId, type: "room-session" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TICKET_TTL_SECONDS}s`)
    .setIssuedAt()
    .sign(SECRET);

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(`room-ticket-${roomId}`, ticket, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TICKET_TTL_SECONDS,
    path: `/api/rooms/${roomId}`,
  });

  return response;
}
