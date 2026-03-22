import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request, { params }) {
  const { token } = await params;

  const report = await prisma.aIReport.findUnique({
    where: { shareToken: token },
    include: {
      interview: {
        include: {
          room: { include: { problem: true } },
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found or link expired" }, { status: 404 });
  }

  if (report.shareTokenRevokedAt) {
    return NextResponse.json({ error: "This link has been revoked" }, { status: 410 });
  }

  if (report.shareTokenExpiresAt && report.shareTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const { interview, ...reportData } = report;
  return NextResponse.json({
    report: reportData,
    meta: {
      roomTitle: interview.room.title,
      language: interview.language,
      duration: interview.duration,
      problemTitle: interview.room.problem?.title || null,
      candidateName: interview.room.candidateName || null,
    },
  });
}
