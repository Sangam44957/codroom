import { NextResponse } from "next/server";
import { requireRoomOwner, withAuthz } from "@/lib/authz";
import { getNote, saveNote } from "@/services/interview.service";
import { getOrCreateInterviewForNotes } from "@/services/room.service";

export const GET = withAuthz(async (request, { params }) => {
  const { roomId } = await params;
  const { room } = await requireRoomOwner(roomId);
  const note = room.interview?.id ? await getNote(room.interview.id) : null;
  return NextResponse.json({ note: note ?? null }, { status: 200 });
});

export const POST = withAuthz(async (request, { params }) => {
  const { roomId } = await params;
  await requireRoomOwner(roomId);

  const body = await request.json().catch(() => ({}));
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  const interview = await getOrCreateInterviewForNotes(roomId);
  const note = await saveNote(interview.id, body.content);
  return NextResponse.json({ note }, { status: 200 });
});
