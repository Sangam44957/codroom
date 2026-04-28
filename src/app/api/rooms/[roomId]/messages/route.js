import { NextResponse } from "next/server";
import { getMessages, persistMessage } from "@/services/room.service";
import { timingSafeEqual } from "crypto";

const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

function isInternal(request) {
  const secret = request.headers.get("x-internal-secret");
  return secret && INTERNAL_SECRET && timingSafeEqual(Buffer.from(secret), Buffer.from(INTERNAL_SECRET));
}

// Internal-only route - no withAuthz wrapper needed
export async function POST(request, { params }) {
  if (!isInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const { roomId } = await params;
    const body = await request.json();
    if (!body.sender || !body.text?.trim()) {
      return NextResponse.json({ error: "sender and text required" }, { status: 400 });
    }
    const message = await persistMessage(roomId, body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[messages] POST error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  if (!isInternal(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const { roomId } = await params;
    const limit = parseInt(new URL(request.url).searchParams.get("limit") || "200", 10);
    const messages = await getMessages(roomId, limit);
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("[messages] GET error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
