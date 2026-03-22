import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireRoomOwner, withAuthz } from "@/lib/authz";

export const GET = withAuthz(async (request, { params }) => {
  const { roomId } = await params;
  const { room } = await requireRoomOwner(roomId);

  const note = await prisma.interviewerNote.findFirst({
    where: room.interview?.id ? { interviewId: room.interview.id } : { id: "__none__" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ note: note ?? null }, { status: 200 });
});

export const POST = withAuthz(async (request, { params }) => {
  const { roomId } = await params;
  await requireRoomOwner(roomId);

  const body = await request.json().catch(() => ({}));
  const { content } = body;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  // Find or create interview for this room
  let interview = await prisma.interview.findUnique({ where: { roomId } });
  if (!interview) {
    interview = await prisma.interview.create({
      data: { roomId, language: "javascript" },
    });
  }

  // Upsert: update the existing note if one exists, otherwise create it
  const existing = await prisma.interviewerNote.findFirst({
    where: { interviewId: interview.id },
    orderBy: { createdAt: "desc" },
  });

  const note = existing
    ? await prisma.interviewerNote.update({
        where: { id: existing.id },
        data: { content: content.trim() },
      })
    : content.trim()
      ? await prisma.interviewerNote.create({
          data: { content: content.trim(), interviewId: interview.id },
        })
      : null;

  return NextResponse.json({ note }, { status: 200 });
});
