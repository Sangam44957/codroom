import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, withAuthz } from "@/lib/authz";

export const POST = withAuthz(async (request) => {
  const user = await requireAuth();
  const { title, candidateName, language, problemId } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Room title is required" }, { status: 400 });
  }

  const room = await prisma.room.create({
    data: {
      title: title.trim(),
      candidateName: candidateName?.trim() || null,
      language: language || "javascript",
      createdById: user.userId,
      problemId: problemId || null,
    },
    include: { problem: true },
  });

  return NextResponse.json({ message: "Room created", room }, { status: 201 });
});

export const GET = withAuthz(async () => {
  const user = await requireAuth();

  const rooms = await prisma.room.findMany({
    where: { createdById: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      language: true,
      candidateName: true,
      joinToken: true,
      createdAt: true,
      problem: {
        select: { id: true, title: true, difficulty: true },
      },
      // Only expose whether an interview + report exists — not the content
      interview: {
        select: {
          id: true,
          status: true,
          duration: true,
          report: { select: { id: true } },
        },
      },
    },
  });

  return NextResponse.json({ rooms }, { status: 200 });
});
