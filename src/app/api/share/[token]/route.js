import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(request, { params }) {
  const { token } = await params;
  
  // Rate limit by IP - prevent enumeration and DoS
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || 
             "unknown";
  
  const rl = await rateLimit("share", ip, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { 
        status: 429,
        headers: {
          "Retry-After": rl.retryAfter?.toString() || "60",
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

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
