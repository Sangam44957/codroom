import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { listRooms, createNewRoom, deleteRoom } from "@/services/room.service";

export const GET = withAuthz(async (request) => {
  const user = await requireAuth();
  const page = parseInt(new URL(request.url).searchParams.get("page") || "1", 10);
  const result = await listRooms(user.userId, page);
  return NextResponse.json(result, { status: 200 });
});

export const POST = withAuthz(async (request) => {
  const user = await requireAuth();
  const body = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Room title is required" }, { status: 400 });
  }
  const room = await createNewRoom(body, user.userId);
  return NextResponse.json({ message: "Room created", room }, { status: 201 });
});

export const DELETE = withAuthz(async (request) => {
  const user = await requireAuth();
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });
  const result = await deleteRoom(roomId, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true }, { status: 200 });
});
