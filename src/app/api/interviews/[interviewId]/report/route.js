import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { evaluateCode } from "@/lib/groq";

// Generate AI report
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { interviewId } = await params;

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        room: {
          include: { problem: true },
        },
        report: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Return existing report instead of regenerating
    if (interview.report) {
      return NextResponse.json({ report: interview.report }, { status: 200 });
    }

    if (!interview.finalCode || !interview.finalCode.trim()) {
      return NextResponse.json(
        { error: "No code was submitted for this interview. The candidate must write code before a report can be generated." },
        { status: 400 }
      );
    }

    // Call Groq AI
    const evaluation = await evaluateCode({
      code: interview.finalCode,
      language: interview.language,
      problemTitle: interview.room.problem?.title,
      problemDescription: interview.room.problem?.description,
      duration: interview.duration,
    });

    // Save report
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
        // Store strengths + weaknesses inside summary for clean display
        summary: `${evaluation.summary}\n\n**Strengths:**\n${evaluation.strengths}\n\n**Weaknesses:**\n${evaluation.weaknesses}`,
        improvements: evaluation.improvements,
      },
    });

    // Mark interview as evaluated
    await prisma.interview.update({
      where: { id: interviewId },
      data: { status: "evaluated" },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI report: " + error.message },
      { status: 500 }
    );
  }
}

// Get existing report
export async function GET(request, { params }) {
  try {
    const { interviewId } = await params;

    const report = await prisma.aIReport.findUnique({
      where: { interviewId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
