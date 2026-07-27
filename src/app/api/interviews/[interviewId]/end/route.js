import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { endInterview } from "@/services/interview.service";
import { audit, AuditActions } from "@/lib/audit";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { user } = await requireInterviewOwner(interviewId);
  const body = await request.json();
  const result = await endInterview(interviewId, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  audit({
    actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
    action: AuditActions.INTERVIEW_ENDED, resource: "interview", resourceId: interviewId,
    metadata: { language: body.language },
    request,
  });
  return NextResponse.json({ interview: result.interview }, { status: 200 });
});
