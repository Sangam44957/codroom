import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { endInterview } from "@/services/interview.service";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const body = await request.json();
  const result = await endInterview(interviewId, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ interview: result.interview }, { status: 200 });
});
