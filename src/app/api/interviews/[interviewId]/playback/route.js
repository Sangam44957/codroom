import { NextResponse } from "next/server";
import { requireAuth, withAuthz } from "@/lib/authz";
import { getPlaybackData } from "@/services/interview.service";

export const GET = withAuthz(async (request, { params }) => {
  const user = await requireAuth();
  const { interviewId } = await params;
  const result = await getPlaybackData(interviewId, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: 200 });
});
