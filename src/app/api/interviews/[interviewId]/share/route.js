import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";

const SHARE_TTL_DAYS = 30;

// POST — generate share link + save rubric
export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const body = await request.json().catch(() => ({}));
  const rubric = body.rubric || {};

  const report = await prisma.aIReport.findUnique({ where: { interviewId } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const shareToken = randomBytes(20).toString("hex"); // always rotate on re-share
  const shareTokenExpiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000);

  const updated = await prisma.aIReport.update({
    where: { interviewId },
    data: {
      shareToken,
      shareTokenExpiresAt,
      shareTokenRevokedAt: null, // clear any prior revocation
      rubricProblemSolving: rubric.problemSolving ?? report.rubricProblemSolving,
      rubricCommunication:  rubric.communication  ?? report.rubricCommunication,
      rubricCodeQuality:    rubric.codeQuality    ?? report.rubricCodeQuality,
      rubricEdgeCases:      rubric.edgeCases      ?? report.rubricEdgeCases,
      rubricSpeed:          rubric.speed          ?? report.rubricSpeed,
    },
  });

  return NextResponse.json(
    { shareToken: updated.shareToken, expiresAt: updated.shareTokenExpiresAt },
    { status: 200 }
  );
});

// DELETE — revoke share link
export const DELETE = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  await prisma.aIReport.update({
    where: { interviewId },
    data: { shareTokenRevokedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});

// PATCH — save rubric only (no share token generation)
export const PATCH = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  await requireInterviewOwner(interviewId);

  const { rubric } = await request.json();
  if (!rubric) return NextResponse.json({ error: "rubric required" }, { status: 400 });

  await prisma.aIReport.update({
    where: { interviewId },
    data: {
      rubricProblemSolving: rubric.problemSolving ?? 0,
      rubricCommunication:  rubric.communication  ?? 0,
      rubricCodeQuality:    rubric.codeQuality    ?? 0,
      rubricEdgeCases:      rubric.edgeCases      ?? 0,
      rubricSpeed:          rubric.speed          ?? 0,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});
