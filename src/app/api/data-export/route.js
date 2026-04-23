import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import prisma from "@/lib/db";
import { audit, AuditActions } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rl = await rateLimit("data-export", ip, { limit: 3, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Export rate limit reached. Try again later." }, { status: 429 });
  }

  const log = logger.child({ userId: user.userId });

  try {
    const [userData, rooms, interviews, templates, problems, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, name: true, createdAt: true, emailVerified: true },
      }),

      prisma.room.findMany({
        where: { createdById: user.userId },
        select: {
          id: true, title: true, language: true, candidateName: true, createdAt: true,
          problems: { select: { problem: { select: { title: true, difficulty: true } }, order: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.interview.findMany({
        where: { room: { createdById: user.userId } },
        select: {
          id: true, status: true, duration: true, startedAt: true, endedAt: true,
          report: {
            select: {
              recommendation: true, correctness: true, codeQuality: true,
              edgeCaseHandling: true, overallScore: true, summary: true, createdAt: true,
            },
          },
          notes: { select: { content: true, createdAt: true } },
        },
        orderBy: { startedAt: "desc" },
      }),

      prisma.interviewTemplate.findMany({
        where: { ownerId: user.userId },
        select: {
          id: true, name: true, description: true, language: true,
          durationMinutes: true, focusModeEnabled: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.problem.findMany({
        where: { createdById: user.userId },
        select: { id: true, title: true, difficulty: true, topic: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
      }),

      prisma.auditLog.findMany({
        where: { actorId: user.userId },
        select: { action: true, resource: true, resourceId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      user: userData,
      rooms: rooms.map((r) => ({
        id: r.id, title: r.title, language: r.language,
        candidateName: r.candidateName, createdAt: r.createdAt,
        problems: r.problems.map((rp) => ({ ...rp.problem, order: rp.order })),
      })),
      interviews,
      templates,
      problems,
      auditLog: auditLogs,
      metadata: {
        totalRooms: rooms.length,
        totalInterviews: interviews.length,
        totalTemplates: templates.length,
        totalProblems: problems.length,
        note: "Code snapshots and raw interview events are excluded due to size.",
      },
    };

    audit({
      actorId: user.userId,
      actorEmail: user.email,
      actorRole: "interviewer",
      action: "data.exported",
      resource: "user",
      resourceId: user.userId,
      request,
    });

    log.info("Data export generated");

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `codroom-export-${user.email.split("@")[0]}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(Buffer.byteLength(jsonString)),
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  } catch (err) {
    log.error({ err }, "Data export failed");
    return NextResponse.json({ error: "Failed to generate data export" }, { status: 500 });
  }
}
