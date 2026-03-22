import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Internal endpoint — only callable with shared INTERNAL_SECRET header
export async function GET(request, { params }) {
  const secret = request.headers.get("x-internal-secret");
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!internalSecret || secret !== internalSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      createdById: true,
      language: true,
      interview: {
        select: {
          id: true,
          status: true,
          snapshots: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: { code: true },
          },
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lastCode = room.interview?.snapshots?.[0]?.code || "";
  const interviewId = room.interview?.status === "in_progress" ? room.interview.id : null;

  return NextResponse.json({
    createdById: room.createdById,
    language: room.language,
    lastCode,
    interviewId,
  }, { status: 200 });
}
