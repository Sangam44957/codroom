import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { generateShareToken, revokeShareToken, saveRubric } from "@/services/interview.service";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const body = await request.json().catch(() => ({}));
  const result = await generateShareToken(interviewId, body.rubric || {});
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: 200 });
});

export const DELETE = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const result = await revokeShareToken(interviewId);
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
