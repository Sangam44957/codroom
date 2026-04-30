import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

export const AuditActions = {
  ROOM_CREATED:                "room.created",
  ROOM_DELETED:                "room.deleted",
  ROOM_JOINED:                 "room.joined",
  INTERVIEW_STARTED:           "interview.started",
  INTERVIEW_ENDED:             "interview.ended",
  REPORT_GENERATED:            "report.generated",
  REPORT_SHARED:               "report.shared",
  REPORT_SHARE_REVOKED:        "report.share_revoked",
  PROBLEM_CREATED:             "problem.created",
  PROBLEM_DELETED:             "problem.deleted",
  USER_REGISTERED:             "user.registered",
  USER_LOGGED_IN:              "user.logged_in",
  USER_PASSWORD_RESET:         "user.password_reset",
  SECURITY_VIOLATION_DETECTED: "security.violation_detected",
  DATA_EXPORTED:               "data.exported",
  USER_DELETED:                "user.deleted",
};

export async function audit({ actorId = null, actorEmail = null, actorRole = null, action, resource, resourceId, metadata = null, request = null }) {
  const entry = {
    actorId,
    actorEmail,
    actorRole,
    action,
    resource,
    resourceId,
    metadata,
    ipAddress: request?.headers?.get("x-forwarded-for")?.split(",")[0].trim()
      || request?.headers?.get("x-real-ip")
      || null,
    userAgent: request?.headers?.get("user-agent") || null,
  };

  try {
    await prisma.auditLog.create({ data: entry });
    logger.info({ audit: { actorId, actorEmail, action, resource, resourceId } }, `audit: ${action}`);
  } catch (err) {
    logger.error({ err, action, entry }, "CRITICAL: audit write failed - security event not recorded");
    // Re-throw to ensure calling code knows audit failed
    throw new Error(`Audit logging failed for ${action}: ${err.message}`);
  }
}
