import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, withAuthz } from "@/lib/authz";

export const POST = withAuthz(async (request) => {
  const user = await requireAuth();
  const { title, candidateName, language, problemId, problemIds } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Room title is required" }, { status: 400 });
  }

  // Support both single problemId (legacy) and problemIds array
  const ids = problemIds?.length ? problemIds : (problemId ? [problemId] : []);

  const room = await prisma.room.create({
    data: {
      title: title.trim(),
      candidateName: candidateName?.trim() || null,
      language: language || "javascript",
      createdById: user.userId,
      problemId: ids[0] || null, // keep legacy field in sync
      problems: ids.length ? {
        create: ids.map((pid, i) => ({ problemId: pid, order: i })),
      } : undefined,
    },
    include: {
      problem: true,
      problems: { include: { problem: true }, orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ message: "Room created", room }, { status: 201 });
});

export const DELETE = withAuthz(async (request) => {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const user = await requireAuth();
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { interview: { select: { id: true } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.createdById !== user.userId) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const ops = [];
  if (room.interview) {
    const iid = room.interview.id;
    ops.push(
      prisma.codeSnapshot.deleteMany({ where: { interviewId: iid } }),
      prisma.interviewEvent.deleteMany({ where: { interviewId: iid } }),
      prisma.interviewerNote.deleteMany({ where: { interviewId: iid } }),
      prisma.aIReport.deleteMany({ where: { interviewId: iid } }),
      prisma.interview.delete({ where: { id: iid } }),
    );
  }
  ops.push(
    prisma.chatMessage.deleteMany({ where: { roomId } }),
    prisma.roomProblem.deleteMany({ where: { roomId } }),
    prisma.room.delete({ where: { id: roomId } }),
  );

  await prisma.$transaction(ops);
  return NextResponse.json({ success: true }, { status: 200 });
});

export const GET = withAuthz(async (request) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where: { createdById: user.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      select: {
        id: true,
        title: true,
        status: true,
        language: true,
        candidateName: true,
        joinToken: true,
        createdAt: true,
        problem: { select: { id: true, title: true, difficulty: true } },
        problems: {
          orderBy: { order: "asc" },
          select: { order: true, problem: { select: { id: true, title: true, difficulty: true } } },
        },
        interview: {
          select: {
            id: true, status: true, duration: true,
            report: { select: { id: true } },
          },
        },
      },
    }),
    prisma.room.count({ where: { createdById: user.userId } }),
  ]);

  return NextResponse.json({ rooms, total, page, totalPages: Math.ceil(total / limit) }, { status: 200 });
});
