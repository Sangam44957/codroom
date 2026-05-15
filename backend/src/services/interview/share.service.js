/**
 * src/services/interview/share.service.js
 *
 * Interview report share-token service.
 *
 * Responsibilities:
 * - Generate secure share tokens
 * - Revoke share access
 * - Share expiry management
 * - Share notification orchestration
 *
 * NOT responsible for:
 * - Report generation
 * - Interview lifecycle
 * - HTTP formatting
 * - Email implementation details
 *
 * LLD Principles:
 * - SRP
 * - Fail Fast
 * - Explicit Contracts
 * - Secure Defaults
 */

import { randomBytes } from "crypto";

import {
  findInterviewById,
  findReport,
  updateReport,
} from "@/repositories/interview.repository";

import {
  notifyReportShared,
} from "@/lib/email";

import {
  logger,
} from "@/lib/logger";

import {
  config,
} from "@/lib/config";

import {
  SHARE,
} from "@/lib/constants";

import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const generateToken = (
  size = 20
) => {
  return randomBytes(size)
    .toString("hex");
};

const createExpiryDate = (
  days
) => {
  return new Date(
    Date.now() +
      days *
        86_400_000
  );
};

const assertReportExists = (
  report,
  interviewId
) => {
  if (!report) {
    throw new NotFoundError(
      "Report",
      interviewId
    );
  }
};

const normalizeRubric = (
  rubric = {},
  report
) => {
  return {
    rubricProblemSolving:
      rubric.problemSolving ??
      report.rubricProblemSolving,

    rubricCommunication:
      rubric.communication ??
      report.rubricCommunication,

    rubricCodeQuality:
      rubric.codeQuality ??
      report.rubricCodeQuality,

    rubricEdgeCases:
      rubric.edgeCases ??
      report.rubricEdgeCases,

    rubricSpeed:
      rubric.speed ??
      report.rubricSpeed,
  };
};

const queueShareNotification =
  async ({
    interview,
    interviewId,
    recipientEmail,
    shareToken,
    expiresAt,
  }) => {
    notifyReportShared({
      recipientEmail,

      sharedByName:
        interview?.room
          ?.createdBy?.name ??
        "Your interviewer",

      candidateName:
        interview?.room
          ?.candidateName,

      shareUrl:
        `${config.appUrl}/share/${shareToken}`,

      expiresAt,
    }).catch((error) => {
      logger.warn(
        {
          err: error,
          interviewId,
          recipientEmail,
        },
        "Report-share notification failed"
      );
    });
  };

/* -------------------------------------------------------------------------- */
/*                         GENERATE SHARE TOKEN                               */
/* -------------------------------------------------------------------------- */

/**
 * Generates secure report share token.
 *
 * Optionally:
 * - updates rubric scores
 * - emails recipient
 *
 * @param {string} interviewId
 * @param {Object} rubric
 * @param {string|null} recipientEmail
 *
 * @returns {{
 *   shareToken: string,
 *   expiresAt: Date
 * }}
 */
export const generateShareToken =
  async (
    interviewId,
    rubric = {},
    recipientEmail = null
  ) => {
    const report =
      await findReport(
        interviewId
      );

    assertReportExists(
      report,
      interviewId
    );

    const shareToken =
      generateToken();

    const expiresAt =
      createExpiryDate(
        SHARE.TTL_DAYS
      );

    const updatedReport =
      await updateReport(
        interviewId,
        {
          shareToken,

          shareTokenExpiresAt:
            expiresAt,

          shareTokenRevokedAt:
            null,

          ...normalizeRubric(
            rubric,
            report
          ),
        }
      );

    if (recipientEmail) {
      const interview =
        await findInterviewById(
          interviewId
        );

      queueShareNotification(
        {
          interview,
          interviewId,
          recipientEmail,
          shareToken,
          expiresAt,
        }
      );
    }

    logger.info(
      {
        interviewId,
        expiresAt,
        recipientEmail,
      },
      "Report share token generated"
    );

    return Object.freeze({
      shareToken:
        updatedReport.shareToken,

      expiresAt:
        updatedReport.shareTokenExpiresAt,
    });
  };

/* -------------------------------------------------------------------------- */
/*                          REVOKE SHARE TOKEN                                */
/* -------------------------------------------------------------------------- */

/**
 * Revokes active share token.
 *
 * @param {string} interviewId
 */
export const revokeShareToken =
  async (
    interviewId
  ) => {
    const report =
      await findReport(
        interviewId
      );

    assertReportExists(
      report,
      interviewId
    );

    if (
      !report.shareToken
    ) {
      throw new ValidationError(
        "No active share token exists"
      );
    }

    await updateReport(
      interviewId,
      {
        shareTokenRevokedAt:
          new Date(),
      }
    );

    logger.info(
      {
        interviewId,
      },
      "Report share token revoked"
    );
  };

/* -------------------------------------------------------------------------- */
/*                           VALIDATE SHARE TOKEN                             */
/* -------------------------------------------------------------------------- */

/**
 * Validates whether share token
 * is currently usable.
 *
 * @param {Object} report
 *
 * @returns {boolean}
 */
export const isShareTokenValid =
  (report) => {
    if (!report) {
      return false;
    }

    if (
      !report.shareToken
    ) {
      return false;
    }

    if (
      report.shareTokenRevokedAt
    ) {
      return false;
    }

    if (
      !report.shareTokenExpiresAt
    ) {
      return false;
    }

    return (
      new Date(
        report.shareTokenExpiresAt
      ) > new Date()
    );
  };