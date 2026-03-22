import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireInterviewOwner, requireSnapshotWriteAccess, withAuthz } from "@/lib/authz";

// POST — save a timeline event (called by socket server via internal secret)
export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireSnapshotWriteAccess(request, interviewId);

  const { type, label } = await request.json();
  if (!type || !label) {
    return NextResponse.json({ error: "type and label required" }, { status: 400 });
  }

  const event = await prisma.interviewEvent.create({
    data: { interviewId, type, label },
  });

  return NextResponse.json({ event }, { status: 201 });
});

// GET — fetch events with cursor-based pagination (room owner only)
export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000);

  const events = await prisma.interviewEvent.findMany({
    where: { interviewId },
    orderBy: { timestamp: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = events.length > limit;
  if (hasMore) events.pop();
  const nextCursor = hasMore ? events[events.length - 1].id : null;

  return NextResponse.json({ events, nextCursor }, { status: 200 });
});
