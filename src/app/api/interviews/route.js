import { NextResponse } from "next/server";
import { requireRoomOwner, withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { startInterview } from "@/services/interview.service";
import { audit, AuditActions } from "@/lib/audit";

export const POST = withAuthz(async (request) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { roomId, language } = await request.json();
  if (!roomId) return NextResponse.json({ error: "roomId is required" }, { status: 400 });

  const { user } = await requireRoomOwner(roomId);
  const { interview } = await startInterview(roomId, language);
  audit({
    actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
    action: AuditActions.INTERVIEW_STARTED, resource: "interview", resourceId: interview.id,
    metadata: { roomId, language },
    request,
  });
  return NextResponse.json({ interview }, { status: 201 });
});
