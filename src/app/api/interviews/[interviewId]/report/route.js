import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { generateReport, getReport } from "@/services/interview.service";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const result = await generateReport(interviewId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ report: result.report }, { status: result.created ? 201 : 200 });
});

export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);
  const report = await getReport(interviewId);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report }, { status: 200 });
});
