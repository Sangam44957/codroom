import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuthz } from "@/lib/authz";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

function isInternal(request) {
  return request.headers.get("x-internal-secret") === INTERNAL_SECRET && !!INTERNAL_SECRET;
}

// POST — save a message (called by socket server)
export const POST = withAuthz(async (request, { params }) => {
  if (!isInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await params;
  const { id, sender, role, text, timestamp } = await request.json();

  if (!sender || !text?.trim()) {
    return NextResponse.json({ error: "sender and text required" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      id,
      roomId,
      sender,
      role: role || "candidate",
      text: text.trim().slice(0, 2000),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
});

// GET — fetch last N messages (used on room-state seed)
export async function GET(request, { params }) {
  const secret = request.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 200);

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { timestamp: "asc" },
    take: limit,
  });

  return NextResponse.json({ messages }, { status: 200 });
}
