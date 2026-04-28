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
      // 1. Clear legacy problemId FK (not cascaded) before deleting rooms
      await tx.room.updateMany({
        where: { createdById: user.userId },
        data: { problemId: null },
      });

      // 2. Delete rooms (cascades to Interview → {CodeSnapshot, InterviewEvent, InterviewerNote, AIReport})
      //    Also cascades to ChatMessage and RoomProblem
      await tx.room.deleteMany({ where: { createdById: user.userId } });

      // 3. Delete user-owned entities (no cascades from User, so manual deletion needed)
      await tx.hiringPipeline.deleteMany({ where: { createdById: user.userId } });
      await tx.interviewTemplate.deleteMany({ where: { ownerId: user.userId } });
      await tx.problem.deleteMany({ where: { createdById: user.userId } });

      // 4. Anonymize audit logs — keep for compliance, strip PII
      await tx.auditLog.updateMany({
        where: { actorId: user.userId },
        data: { actorEmail: "[deleted]", ipAddress: null, userAgent: null },
      });

      // 5. Delete user (User → Room is RESTRICT, but rooms are already deleted)
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
