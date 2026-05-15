/**
 * src/services/room.service.js
 *
 * Room domain service.
 *
 * Responsibilities:
 * - Room CRUD orchestration
 * - Room membership logic
 * - Room messaging
 * - Room/interview coordination
 * - Room analytics retrieval
 *
 * NOT responsible for:
 * - Direct database access
 * - HTTP formatting
 * - Socket transport
 * - Validation schemas
 *
 * LLD Principles:
 * - DIP
 * - SRP
 * - Performance Optimization
 * - Explicit Contracts
 * - Structured Logging
 */

import {
  findRoomById,
  findRoomByIdSelect,
  findRoomsByUser,
  findRoomStats,
  createRoom,
  updateRoom,
  deleteRoomCascade,
  findMessagesByRoom,
  createMessage,
} from "@/repositories/room.repository";

import {
  findInterviewByRoomId,
  createInterview,
} from "@/repositories/interview.repository";

import {
  incrementUsageCountBatch,
} from "@/repositories/problem.repository";

import {
  logger,
} from "@/lib/logger";

import {
  RoomStatus,
  assertEnum,
} from "@/lib/enums";

import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";

import {
  PAGE_LIMITS,
  CODE_LIMITS,
  DEFAULT_LANGUAGE,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const ROOM_PAGE_LIMIT =
  PAGE_LIMITS.ROOMS;

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const normalizeString = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
};

const resolveProblemIds = ({
  problemId,
  problemIds,
}) => {
  if (
    Array.isArray(
      problemIds
    ) &&
    problemIds.length
  ) {
    return [
      ...new Set(
        problemIds
      ),
    ];
  }

  if (problemId) {
    return [problemId];
  }

  return [];
};

const assertRoomExists = (
  room,
  roomId
) => {
  if (!room) {
    throw new NotFoundError(
      "Room",
      roomId
    );
  }
};

const assertRoomOwnership = (
  room,
  userId
) => {
  if (
    room.createdById !==
    userId
  ) {
    throw new ForbiddenError(
      "You do not own this room"
    );
  }
};

const normalizeMessage = (
  message = {}
) => {
  return {
    id: message.id,

    sender:
      normalizeString(
        message.sender
      ),

    role:
      message.role ||
      "candidate",

    text:
      normalizeString(
        message.text
      ).slice(
        0,
        CODE_LIMITS.MAX_CHAT_TEXT_CHARS
      ),

    timestamp:
      message.timestamp
        ? new Date(
            message.timestamp
          )
        : new Date(),
  };
};

/* -------------------------------------------------------------------------- */
/*                                GET ROOM                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch room by id.
 *
 * @param {string} roomId
 *
 * @returns {Promise<Object|null>}
 */
export const getRoomById =
  async (
    roomId
  ) => {
    return findRoomById(
      roomId
    );
  };

/* -------------------------------------------------------------------------- */
/*                           ROOM OWNER PAYLOAD                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetches room owner data.
 *
 * Optimized lightweight projection
 * for owner dashboards/playback.
 *
 * @param {string} roomId
 *
 * @returns {Promise<Object|null>}
 */
export const getRoomOwnerData =
  async (
    roomId
  ) => {
    return findRoomByIdSelect(
      roomId,
      {
        createdById: true,

        language: true,

        interview: {
          select: {
            id: true,

            status: true,

            snapshots: {
              orderBy: {
                timestamp:
                  "desc",
              },

              take: 1,

              select: {
                code: true,
              },
            },
          },
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                               LIST ROOMS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Lists paginated rooms for user.
 *
 * @param {string} userId
 * @param {number} page
 *
 * @returns {Promise<Object>}
 */
export const listRooms =
  async (
    userId,
    page = 1
  ) => {
    const normalizedPage =
      Math.max(
        1,
        Number(page) || 1
      );

    const skip =
      (normalizedPage - 1) *
      ROOM_PAGE_LIMIT;

    const [
      rooms,
      total,
    ] =
      await findRoomsByUser(
        userId,
        {
          skip,
          take:
            ROOM_PAGE_LIMIT,
        }
      );

    const stats =
      await findRoomStats(
        userId
      );

    return Object.freeze({
      rooms,

      total,

      page:
        normalizedPage,

      totalPages:
        Math.ceil(
          total /
            ROOM_PAGE_LIMIT
        ),

      stats,
    });
  };

/* -------------------------------------------------------------------------- */
/*                              CREATE ROOM                                   */
/* -------------------------------------------------------------------------- */

/**
 * Creates new interview room.
 *
 * @param {Object} payload
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const createNewRoom =
  async (
    payload = {},
    userId
  ) => {
    const {
      title,
      candidateName,
      language,
      problemId,
      problemIds,
      pipelineId,
    } = payload;

    const resolvedProblemIds =
      resolveProblemIds({
        problemId,
        problemIds,
      });

    const room =
      await createRoom({
        title:
          normalizeString(
            title
          ),

        candidateName:
          normalizeString(
            candidateName
          ) || null,

        language:
          language ||
          DEFAULT_LANGUAGE,

        createdById:
          userId,

        problemId:
          resolvedProblemIds[0] ||
          null,

        pipelineId:
          pipelineId ||
          null,

        problems:
          resolvedProblemIds.length
            ? {
                create:
                  resolvedProblemIds.map(
                    (
                      id,
                      index
                    ) => ({
                      problemId:
                        id,

                      order:
                        index,
                    })
                  ),
              }
            : undefined,
      });

    /**
     * Performance optimization:
     * single batch update
     * instead of N sequential DB calls.
     */
    if (
      resolvedProblemIds.length
    ) {
      incrementUsageCountBatch(
        resolvedProblemIds
      ).catch((error) => {
        logger.warn(
          {
            err: error,
            problemIds:
              resolvedProblemIds,
          },
          "Failed to increment problem usage counts"
        );
      });
    }

    logger.info(
      {
        roomId: room.id,
        userId,
      },
      "Room created"
    );

    return room;
  };

/* -------------------------------------------------------------------------- */
/*                               DELETE ROOM                                  */
/* -------------------------------------------------------------------------- */

/**
 * Deletes room and associated entities.
 *
 * @param {string} roomId
 * @param {string} userId
 */
export const deleteRoom =
  async (
    roomId,
    userId
  ) => {
    const room =
      await findRoomByIdSelect(
        roomId,
        {
          createdById:
            true,

          interview: {
            select: {
              id: true,
            },
          },
        }
      );

    assertRoomExists(
      room,
      roomId
    );

    assertRoomOwnership(
      room,
      userId
    );

    await deleteRoomCascade(
      roomId,
      room.interview?.id ??
        null
    );

    logger.info(
      {
        roomId,
        userId,
      },
      "Room deleted"
    );
  };

/* -------------------------------------------------------------------------- */
/*                           VALIDATE JOIN TOKEN                              */
/* -------------------------------------------------------------------------- */

/**
 * Validates room join token.
 *
 * @param {string} roomId
 * @param {string} joinToken
 *
 * @returns {Promise<Object|null>}
 */
export const validateJoinToken =
  async (
    roomId,
    joinToken
  ) => {
    const room =
      await findRoomByIdSelect(
        roomId,
        {
          id: true,

          joinToken: true,

          candidateName:
            true,
        }
      );

    if (
      !room ||
      room.joinToken !==
        joinToken
    ) {
      return null;
    }

    return room;
  };

/* -------------------------------------------------------------------------- */
/*                              GET MESSAGES                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetch room chat messages.
 *
 * @param {string} roomId
 * @param {number} limit
 *
 * @returns {Promise<Array>}
 */
export const getMessages =
  async (
    roomId,
    limit = 50
  ) => {
    return findMessagesByRoom(
      roomId,
      Math.min(
        limit,
        CODE_LIMITS.MAX_MESSAGES_FETCH
      )
    );
  };

/* -------------------------------------------------------------------------- */
/*                            PERSIST MESSAGE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Persists room message.
 *
 * @param {string} roomId
 * @param {Object} payload
 *
 * @returns {Promise<Object>}
 */
export const persistMessage =
  async (
    roomId,
    payload = {}
  ) => {
    const message =
      normalizeMessage(
        payload
      );

    return createMessage({
      ...message,
      roomId,
    });
  };

/* -------------------------------------------------------------------------- */
/*                       GET OR CREATE INTERVIEW                              */
/* -------------------------------------------------------------------------- */

/**
 * Lazily creates interview
 * for collaborative notes.
 *
 * @param {string} roomId
 *
 * @returns {Promise<Object>}
 */
export const getOrCreateInterviewForNotes =
  async (
    roomId
  ) => {
    let interview =
      await findInterviewByRoomId(
        roomId
      );

    if (!interview) {
      interview =
        await createInterview(
          {
            roomId,

            language:
              DEFAULT_LANGUAGE,
          }
        );

      logger.info(
        {
          roomId,
          interviewId:
            interview.id,
        },
        "Interview auto-created for notes"
      );
    }

    return interview;
  };

/* -------------------------------------------------------------------------- */
/*                           UPDATE ROOM STATUS                               */
/* -------------------------------------------------------------------------- */

/**
 * Updates room status.
 *
 * @param {string} roomId
 * @param {string} status
 *
 * @returns {Promise<Object>}
 */
export const updateRoomStatus =
  async (
    roomId,
    status
  ) => {
    assertEnum(
      status,
      RoomStatus,
      "room status"
    );

    return updateRoom(
      roomId,
      {
        status,
      }
    );
  };