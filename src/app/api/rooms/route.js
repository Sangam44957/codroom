import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { listRooms, createNewRoom, deleteRoom } from "@/services/room.service";
import { audit, AuditActions } from "@/lib/audit";

export const GET = withAuthz(async (request) => {
  const user = await requireAuth();
  const page = parseInt(new URL(request.url).searchParams.get("page") || "1", 10);
  const result = await listRooms(user.userId, page);
  return NextResponse.json(result, { status: 200 });
});

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  
  try {
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Room title is required" }, { status: 400 });
    }
    const room = await createNewRoom(body, user.userId);
    audit({
      actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
      action: AuditActions.ROOM_CREATED, resource: "room", resourceId: room.id,
      metadata: { title: body.title, language: body.language },
      request,
    });
    return NextResponse.json({ message: "Room created", room }, { status: 201 });
  } catch (error) {
    console.error("[rooms] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
});

export const DELETE = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await requireAuth();
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });
  const result = await deleteRoom(roomId, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  audit({
    actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
    action: AuditActions.ROOM_DELETED, resource: "room", resourceId: roomId,
    request,
  });
  return NextResponse.json({ success: true }, { status: 200 });
});
