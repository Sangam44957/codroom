import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireInterviewOwner, requireSnapshotWriteAccess, withAuthz } from "@/lib/authz";

// Save a code snapshot — called by socket server (internal) or room owner
export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { interview } = await requireSnapshotWriteAccess(request, interviewId);

  if (interview.status !== "in_progress") {
    return NextResponse.json({ error: "Interview is not in progress" }, { status: 400 });
  }

  const { code } = await request.json();

  if (code && Buffer.byteLength(code, "utf8") > 64 * 1024) {
    return NextResponse.json({ error: "Snapshot exceeds maximum size (64 KB)" }, { status: 413 });
  }

  const snapshot = await prisma.codeSnapshot.create({
    data: { interviewId, code: code || "" },
  });

  return NextResponse.json({ snapshot }, { status: 201 });
});

// Get snapshots with cursor-based pagination — room owner only
export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

  const snapshots = await prisma.codeSnapshot.findMany({
    where: { interviewId },
    orderBy: { timestamp: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = snapshots.length > limit;
  if (hasMore) snapshots.pop();
  const nextCursor = hasMore ? snapshots[snapshots.length - 1].id : null;

  return NextResponse.json({ snapshots, nextCursor }, { status: 200 });
});
