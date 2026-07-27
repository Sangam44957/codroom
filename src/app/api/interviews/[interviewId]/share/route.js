import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { generateShareToken, revokeShareToken, saveRubric } from "@/services/interview.service";
import { audit, AuditActions } from "@/lib/audit";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { user } = await requireInterviewOwner(interviewId);
  const body = await request.json().catch(() => ({}));
  const result = await generateShareToken(interviewId, body.rubric || {}, body.recipientEmail || null);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  audit({
    actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
    action: AuditActions.REPORT_SHARED, resource: "report", resourceId: interviewId,
    metadata: { recipientEmail: body.recipientEmail || null, expiresAt: result.expiresAt },
    request,
  });
  return NextResponse.json(result, { status: 200 });
});

export const DELETE = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { user } = await requireInterviewOwner(interviewId);
  const result = await revokeShareToken(interviewId);
  audit({
    actorId: user.userId, actorEmail: user.email, actorRole: "interviewer",
    action: AuditActions.REPORT_SHARE_REVOKED, resource: "report", resourceId: interviewId,
    request,
  });
  return NextResponse.json(result, { status: 200 });
});

export const PATCH = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const { rubric } = await request.json();
  if (!rubric) return NextResponse.json({ error: "rubric required" }, { status: 400 });
  const result = await saveRubric(interviewId, rubric);
  return NextResponse.json(result, { status: 200 });
});
