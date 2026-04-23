import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import prisma from "@/lib/db";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";

export async function POST(request) {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { confirmation, password } = await request.json();

  if (confirmation !== "DELETE MY ACCOUNT") {
    return NextResponse.json(
      { error: 'Type "DELETE MY ACCOUNT" to confirm' },
      { status: 400 }
    );
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { password: true, email: true },
  });

  if (!userRecord || !await verifyPassword(password, userRecord.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }

  const log = logger.child({ userId: user.userId });
  log.warn("Account deletion initiated");

  try {
    await prisma.$transaction(async (tx) => {
      // 1. AI reports
      await tx.aIReport.deleteMany({
        where: { interview: { room: { createdById: user.userId } } },
      });

      // 2. Interviewer notes
      await tx.interviewerNote.deleteMany({
        where: { interview: { room: { createdById: user.userId } } },
      });

      // 3. Code snapshots + interview events
      await tx.codeSnapshot.deleteMany({
        where: { interview: { room: { createdById: user.userId } } },
      });
      await tx.interviewEvent.deleteMany({
        where: { interview: { room: { createdById: user.userId } } },
      });

      // 4. Interviews
      await tx.interview.deleteMany({
        where: { room: { createdById: user.userId } },
      });

      // 5. Chat messages
      await tx.chatMessage.deleteMany({
        where: { room: { createdById: user.userId } },
      });

      // 6. Room problems + legacy direct problem FK (null it out)
      await tx.roomProblem.deleteMany({
        where: { room: { createdById: user.userId } },
      });
      await tx.room.updateMany({
        where: { createdById: user.userId },
        data: { problemId: null },
      });

      // 7. Rooms
      await tx.room.deleteMany({ where: { createdById: user.userId } });

      // 8. Pipelines
      await tx.hiringPipeline.deleteMany({ where: { createdById: user.userId } });

      // 9. Templates
      await tx.interviewTemplate.deleteMany({ where: { ownerId: user.userId } });

      // 10. Problems
      await tx.problem.deleteMany({ where: { createdById: user.userId } });

      // 11. Anonymize audit logs — keep for compliance, strip PII
      await tx.auditLog.updateMany({
        where: { actorId: user.userId },
        data: { actorEmail: "[deleted]", ipAddress: null, userAgent: null },
      });

      // 12. Delete user
      await tx.user.delete({ where: { id: user.userId } });
    });

    audit({
      actorId: null,
      actorEmail: null,
      actorRole: "system",
      action: "user.deleted",
      resource: "user",
      resourceId: user.userId,
      metadata: {
        reason: "user_requested",
        emailHash: createHash("sha256").update(userRecord.email).digest("hex").slice(0, 16),
      },
      request,
    });

    log.warn("Account deletion completed");

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated data have been deleted.",
    });

    response.cookies.set("codroom-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    log.error({ err }, "Account deletion failed");
    return NextResponse.json({ error: "Deletion failed. Please contact support." }, { status: 500 });
  }
}
