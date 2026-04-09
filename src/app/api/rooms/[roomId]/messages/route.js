import { NextResponse } from "next/server";
import { withAuthz } from "@/lib/authz";
import { getMessages, persistMessage } from "@/services/room.service";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

function isInternal(request) {
  return request.headers.get("x-internal-secret") === INTERNAL_SECRET && !!INTERNAL_SECRET;
}

export const POST = withAuthz(async (request, { params }) => {
  if (!isInternal(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { roomId } = await params;
  const body = await request.json();
  if (!body.sender || !body.text?.trim()) {
    return NextResponse.json({ error: "sender and text required" }, { status: 400 });
  }
  const message = await persistMessage(roomId, body);
  return NextResponse.json({ message }, { status: 201 });
});

export async function GET(request, { params }) {
  const secret = request.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { roomId } = await params;
  const limit = parseInt(new URL(request.url).searchParams.get("limit") || "200", 10);
  const messages = await getMessages(roomId, limit);
  return NextResponse.json({ messages }, { status: 200 });
}
