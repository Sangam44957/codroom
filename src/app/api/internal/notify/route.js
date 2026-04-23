import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notifyCandidateJoined } from "@/lib/email";

export async function POST(request) {
  const secret = request.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
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
      status: true,
      createdBy: { select: { email: true } },
    },
  });

  // Only notify if room was waiting (first join, not a rejoin)
  if (!room || room.status !== "waiting") {
    return NextResponse.json({ skipped: true });
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
