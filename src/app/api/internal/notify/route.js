import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notifyCandidateJoined } from "@/lib/email";
import { timingSafeEqual } from "crypto";

export async function POST(request) {
  const secret = request.headers.get("x-internal-secret");
  const internalSecret = process.env.INTERNAL_SECRET;
  
  if (!internalSecret || !secret || !timingSafeEqual(Buffer.from(secret), Buffer.from(internalSecret))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { type, roomId, candidateName } = await request.json();
  if (type !== "candidate-joined" || !roomId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      title: true,
      createdBy: { select: { email: true } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await notifyCandidateJoined({
    interviewerEmail: room.createdBy.email,
    candidateName,
    roomName: room.title,
    roomUrl: `${appUrl}/room/${roomId}`,
  }).catch(() => {}); // fire-and-forget, never block the join flow

  return NextResponse.json({ sent: true });
}
