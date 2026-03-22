import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { evaluateCode } from "@/lib/groq";
import { runTestsForReport } from "@/lib/testRunner";

// Generate AI report — room owner only
export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { interview } = await requireInterviewOwner(interviewId);

  // Return existing report instead of regenerating
  if (interview.report) {
    return NextResponse.json({ report: interview.report }, { status: 200 });
  }

  if (!interview.finalCode?.trim()) {
    return NextResponse.json(
      { error: "No code was submitted. The candidate must write code before a report can be generated." },
      { status: 400 }
    );
  }

  // Run test cases server-side to give AI ground-truth results
  let testResults = null;
  if (interview.room.problem?.testCases?.length) {
    try {
      testResults = await runTestsForReport(
        interview.finalCode,
        interview.language,
        interview.room.problem.testCases
      );
    } catch (e) {
      console.warn("[report] Test runner failed, proceeding without results:", e.message);
    }
  }

  const evaluation = await evaluateCode({
    code: interview.finalCode,
    language: interview.language,
    problemTitle: interview.room.problem?.title,
    problemDescription: interview.room.problem?.description,
    duration: interview.duration,
    testResults,
  });

  const report = await prisma.aIReport.create({
    data: {
      interviewId,
      correctness: evaluation.correctness,
      codeQuality: evaluation.codeQuality,
      timeComplexity: evaluation.timeComplexity,
      spaceComplexity: evaluation.spaceComplexity,
      edgeCaseHandling: evaluation.edgeCaseHandling,
      overallScore: evaluation.overallScore,
      recommendation: evaluation.recommendation,
      summary: `${evaluation.summary}\n\n**Strengths:**\n${evaluation.strengths}\n\n**Weaknesses:**\n${evaluation.weaknesses}`,
      improvements: evaluation.improvements,
    },
  });

  await prisma.interview.update({
    where: { id: interviewId },
    data: { status: "evaluated" },
  });

  return NextResponse.json({ report }, { status: 201 });
});

// Get existing report — room owner only
export const GET = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const report = await prisma.aIReport.findUnique({ where: { interviewId } });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report }, { status: 200 });
});
