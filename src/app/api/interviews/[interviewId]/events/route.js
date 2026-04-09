import { NextResponse } from "next/server";
import { requireInterviewOwner, requireSnapshotWriteAccess, withAuthz } from "@/lib/authz";
import { saveEvent, getEvents } from "@/services/interview.service";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireSnapshotWriteAccess(request, interviewId);

  const { type, label } = await request.json();
  if (!type || !label) {
    return NextResponse.json({ error: "type and label required" }, { status: 400 });
  }

  const result = await saveEvent(interviewId, { type, label });
  return NextResponse.json(result, { status: 201 });
});

export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000);

  const result = await getEvents(interviewId, { cursor, limit });
  return NextResponse.json(result, { status: 200 });
});
