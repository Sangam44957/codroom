import { NextResponse } from "next/server";
import { requireInterviewOwner, requireSnapshotWriteAccess, withAuthz } from "@/lib/authz";
import { saveSnapshot, getSnapshots } from "@/services/interview.service";

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

  const result = await saveSnapshot(interviewId, code);
  return NextResponse.json(result, { status: 201 });
});

export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

  const result = await getSnapshots(interviewId, { cursor, limit });
  return NextResponse.json(result, { status: 200 });
});
