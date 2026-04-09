import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { withAuthz } from "@/lib/authz";
import { getCurrentUser } from "@/lib/auth";
import { getRoomById } from "@/services/room.service";

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
