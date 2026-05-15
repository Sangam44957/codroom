/**
 * src/services/interview/interview.service.js
 *
 * Interview lifecycle service.
 *
 * Responsibilities:
 * - Start interview
 * - End interview
 * - Delete interview
 * - Fetch interview
 *
 * NOT responsible for:
 * - Reports
 * - Playback
 * - Share tokens
 * - Analytics
 * - HTTP formatting
 *
 * LLD Principles:
 * - SRP
 * - Fail Fast
 * - Explicit Error Contracts
 * - Idempotent Operations
 */

import prisma from "@/lib/db";

import { logger } from "@/lib/logger";

import {
  ValidationError,
  NotFoundError,
  PayloadTooLargeError,
} from "@/lib/errors";

import {
  RoomStatus,
  InterviewStatus,
} from "@/lib/enums";

import {
  CODE_LIMITS,
} from "@/lib/constants";

import {
  findInterviewById,
  findInterviewByRoomId,
  createInterview,
  deleteInterviewCascade,
} from "@/repositories/interview.repository";

import {
  updateRoom,
} from "@/repositories/room.repository";

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const assertInterviewExists = (
  interview,
  interviewId
) => {
  if (!interview) {
    throw new NotFoundError(
      "Interview",
      interviewId
    );
  }
};

const assertCodeSize = (
  code
) => {
  if (!code) {
    return;
  }

  const codeSize =
    Buffer.byteLength(
      code,
      "utf8"
    );

  if (
    codeSize >
    CODE_LIMITS.MAX_CODE_BYTES
  ) {
    throw new PayloadTooLargeError(
      `Final code exceeds maximum size (${CODE_LIMITS.MAX_CODE_BYTES / 1024} KB)`,
      {
        maxBytes:
          CODE_LIMITS.MAX_CODE_BYTES,
        receivedBytes:
          codeSize,
      }
    );
  }
};

const calculateDuration = (
  startedAt,
  endedAt
) => {
  return Math.floor(
    (endedAt -
      startedAt) /
      1000
  );
};

/* -------------------------------------------------------------------------- */
/*                             FETCH INTERVIEW                                */
/* -------------------------------------------------------------------------- */

/**
 * Fetches interview by id.
 *
 * @param {string} interviewId
 *
 * @returns {Promise<Object>}
 */
export const getInterview =
  async (
    interviewId
  ) => {
    const interview =
      await findInterviewById(
        interviewId
      );

    assertInterviewExists(
      interview,
      interviewId
    );

    return interview;
  };

/* -------------------------------------------------------------------------- */
/*                             START INTERVIEW                                */
/* -------------------------------------------------------------------------- */

/**
 * Starts interview session.
 *
 * Idempotent:
 * - if interview already exists,
 *   returns existing interview.
 *
 * @param {string} roomId
 * @param {string} language
 *
 * @returns {{
 *   interview: Object,
 *   created: boolean
 * }}
 */
export const startInterview =
  async (
    roomId,
    language = "javascript"
  ) => {
    const existingInterview =
      await findInterviewByRoomId(
        roomId
      );

    if (existingInterview) {
      return Object.freeze({
        interview:
          existingInterview,
        created: false,
      });
    }

    const interview =
      await createInterview({
        roomId,

        language,

        status:
          InterviewStatus.IN_PROGRESS,
      });

    await updateRoom(
      roomId,
      {
        status:
          RoomStatus.ACTIVE,
      }
    );

    logger.info(
      {
        roomId,
        interviewId:
          interview.id,
      },
      "Interview started"
    );

    return Object.freeze({
      interview,
      created: true,
    });
  };

/* -------------------------------------------------------------------------- */
/*                              END INTERVIEW                                 */
/* -------------------------------------------------------------------------- */

/**
 * Ends active interview.
 *
 * Uses atomic CAS update:
 * only succeeds if interview
 * is still in progress.
 *
 * @param {string} interviewId
 * @param {Object} payload
 *
 * @returns {Promise<Object>}
 */
export const endInterview =
  async (
    interviewId,
    payload = {}
  ) => {
    const {
      finalCode = "",
      language,
    } = payload;

    assertCodeSize(
      finalCode
    );

    const endedAt =
      new Date();

    const updated =
      await prisma.$queryRaw`
        UPDATE interviews
        SET
          status = ${InterviewStatus.COMPLETED},
          "endedAt" = ${endedAt},
          duration = EXTRACT(
            EPOCH FROM (
              ${endedAt} - "startedAt"
            )
          )::int,
          "finalCode" = ${finalCode},
          language = COALESCE(
            ${language || null},
            language
          )
        WHERE id = ${interviewId}
          AND status = ${InterviewStatus.IN_PROGRESS}
        RETURNING *
      `;

    if (!updated.length) {
      const existingInterview =
        await findInterviewById(
          interviewId
        );

      assertInterviewExists(
        existingInterview,
        interviewId
      );

      throw new ValidationError(
        "Interview already ended"
      );
    }

    const interview =
      updated[0];

    await updateRoom(
      interview.roomId,
      {
        status:
          RoomStatus.COMPLETED,
      }
    );

    logger.info(
      {
        interviewId,
        duration:
          interview.duration,
      },
      "Interview ended"
    );

    return interview;
  };

/* -------------------------------------------------------------------------- */
/*                            DELETE INTERVIEW                                */
/* -------------------------------------------------------------------------- */

/**
 * Deletes interview and related entities.
 *
 * @param {string} interviewId
 */
export const deleteInterview =
  async (
    interviewId
  ) => {
    const interview =
      await findInterviewById(
        interviewId
      );

    assertInterviewExists(
      interview,
      interviewId
    );

    await deleteInterviewCascade(
      interviewId,
      interview.room.id
    );

    logger.info(
      {
        interviewId,
      },
      "Interview deleted"
    );
  };