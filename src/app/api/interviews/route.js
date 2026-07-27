import { NextResponse } from "next/server";
import { requireRoomOwner, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { startInterview } from "@/services/interview.service";
import { audit, AuditActions } from "@/lib/audit";

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  try {
    const body = await request.json();
    const { roomId, language } = body;
    if (!roomId || typeof roomId !== "string" || roomId.trim().length === 0) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    const { user } = await requireRoomOwner(roomId);
    const { interview } = await startInterview(roomId, language);
    audit({
      actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
      action: AuditActions.INTERVIEW_STARTED, resource: "interview", resourceId: interview.id,
      metadata: { roomId, language },
      request,
    });
    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("[interviews] POST error:", error.message);
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
});
