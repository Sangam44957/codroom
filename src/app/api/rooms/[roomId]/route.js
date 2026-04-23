import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { requireAuth, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { getCurrentUser } from "@/lib/auth";
import { getRoomById, updateRoomStatus } from "@/services/room.service";
import { endInterview } from "@/services/interview.service";
import prisma from "@/lib/db";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export const GET = withAuthz(async (request, { params }) => {
  const { roomId } = await params;
  const room = await getRoomById(roomId);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const user = await getCurrentUser();
  const isOwner = user && room.createdById === user.userId;

  if (isOwner) return NextResponse.json({ room }, { status: 200 });

  const ticketCookie = request.cookies.get(`room-ticket-${roomId}`)?.value;
  if (!ticketCookie) {
    return NextResponse.json(
      { error: "No room access ticket — use your invite link" },
      { status: 403 }
    );
  }

  try {
    const { payload } = await jwtVerify(ticketCookie, SECRET);
    if (payload.roomId !== roomId || payload.type !== "room-session") throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid or expired room ticket" }, { status: 403 });
  }

  const sanitizeProblem = (p) =>
    p ? { ...p, testCases: (p.testCases || []).map(({ input }) => ({ input })) } : null;

  return NextResponse.json(
    {
      room: {
        id: room.id,
        title: room.title,
        status: room.status,
        language: room.language,
        problem: sanitizeProblem(room.problem),
        problems: (room.problems || []).map((rp) => ({
          ...rp,
          problem: sanitizeProblem(rp.problem),
        })),
        interview: room.interview
          ? { id: room.interview.id, status: room.interview.status, language: room.interview.language }
          : null,
      },
    },
    { status: 200 }
  );
});

// PATCH /api/rooms/[roomId] — mark a room as no-show (no interview started)
export const PATCH = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { roomId } = await params;
  const user = await requireAuth();

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { createdById: true, status: true, interview: { select: { id: true, status: true } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.createdById !== user.userId) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (room.status === "completed" || room.status === "evaluated") {
    return NextResponse.json({ error: "Room already closed" }, { status: 400 });
  }

  // If an interview was started, end it properly (captures duration etc.)
  if (room.interview && room.interview.status === "in_progress") {
    await endInterview(room.interview.id, { finalCode: "", language: null });
  } else {
    // No interview — just close the room
    await updateRoomStatus(roomId, "completed");
  }

  return NextResponse.json({ success: true });
});
