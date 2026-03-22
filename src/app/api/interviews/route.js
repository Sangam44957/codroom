import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRoomOwner, withAuthz } from "@/lib/authz";

export const POST = withAuthz(async (request, { params: _ }) => {
  const { roomId, language } = await request.json();

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  // Ownership check — only the room creator can start an interview
  await requireRoomOwner(roomId);

  // Idempotent — return existing interview if already started
  let interview = await prisma.interview.findUnique({ where: { roomId } });

  if (interview) {
    return NextResponse.json({ interview }, { status: 200 });
  }

  interview = await prisma.interview.create({
    data: {
      roomId,
      language: language || "javascript",
      status: "in_progress",
    },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: "active" },
  });

  return NextResponse.json({ interview }, { status: 201 });
});
