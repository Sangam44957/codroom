import { NextResponse } from "next/server";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";
import { generateInterviewPDF } from "@/lib/pdfReport";

export const GET = withAuthz(async (_req, { params }) => {
  const { interviewId } = await params;
  const { interview } = await requireInterviewOwner(interviewId);

  if (!interview.report) {
    return NextResponse.json({ error: "Report not yet generated" }, { status: 400 });
  }

  const r = interview.report;
  const room = interview.room;

  const doc = generateInterviewPDF({
    candidateName:    room.candidateName,
    roomTitle:        room.title,
    startedAt:        interview.startedAt,
    duration:         interview.duration,
    language:         interview.language,
    recommendation:   r.recommendation,
    correctness:      r.correctness,
    codeQuality:      r.codeQuality,
    edgeCaseHandling: r.edgeCaseHandling,
    overallScore:     r.overallScore,
    timeComplexity:   r.timeComplexity,
    spaceComplexity:  r.spaceComplexity,
    summary:          r.summary,
    improvements:     r.improvements,
    problems: room.problems.map((rp) => ({
      title:      rp.problem.title,
      difficulty: rp.problem.difficulty,
    })),
    finalCode: interview.finalCode,
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const slug = room.candidateName?.replace(/\s+/g, "-").toLowerCase() || "candidate";
  const date = new Date().toISOString().split("T")[0];
  const filename = `codroom-report-${slug}-${date}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      String(pdfBuffer.length),
      "Cache-Control":       "private, no-cache",
    },
  });
});
