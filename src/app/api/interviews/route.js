import { NextResponse } from "next/server";
import { requireRoomOwner, withAuthz } from "@/lib/authz";
import { startInterview } from "@/services/interview.service";

export const POST = withAuthz(async (request) => {
  const { roomId, language } = await request.json();
  if (!roomId) return NextResponse.json({ error: "roomId is required" }, { status: 400 });

  await requireRoomOwner(roomId);
  const { interview } = await startInterview(roomId, language);
  return NextResponse.json({ interview }, { status: 201 });
});
