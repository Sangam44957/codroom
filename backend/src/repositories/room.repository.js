/**
 * src/repositories/room.repository.js
 *
 * Room persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma room queries
 * - Centralize reusable room projections
 * - Handle transactional room deletion
 * - Aggregate room statistics
 * - Persist room chat data
 *
 * NOT responsible for:
 * - Validation
 * - Authorization
 * - Business logic
 * - HTTP formatting
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - DIP
 * - DRY
 */

import prisma from "@/lib/db";

import {
  RoomStatus,
  InterviewStatus,
} from "@/lib/enums";

/* -------------------------------------------------------------------------- */
/*                              SHARED SELECTS                                */
/* -------------------------------------------------------------------------- */

const USER_SELECT =
  Object.freeze({
    id: true,
    name: true,
    email: true,
  });

const PROBLEM_MINIMAL_SELECT =
  Object.freeze({
    id: true,
    title: true,
    difficulty: true,
  });

const ROOM_PROBLEMS_INCLUDE =
  Object.freeze({
    include: {
      problem: true,
    },

    orderBy: {
      order: "asc",
    },
  });

const ROOM_PROBLEMS_MINIMAL_SELECT =
  Object.freeze({
    orderBy: {
      order: "asc",
    },

    select: {
      order: true,

      problem: {
        select:
          PROBLEM_MINIMAL_SELECT,
      },
    },
  });

const ROOM_FULL_INCLUDE =
  Object.freeze({
    createdBy: {
      select:
        USER_SELECT,
    },

    problem: true,

    problems:
      ROOM_PROBLEMS_INCLUDE,

    interview: {
      include: {
        report: true,
      },
    },

    template: {
      select: {
        id: true,
        name: true,
        durationMinutes:
          true,
      },
    },
  });

const ROOM_LIST_SELECT =
  Object.freeze({
    id: true,

    title: true,

    status: true,

    language: true,

    candidateName: true,

    joinToken: true,

    createdAt: true,

    problem: {
      select:
        PROBLEM_MINIMAL_SELECT,
    },

    problems:
      ROOM_PROBLEMS_MINIMAL_SELECT,

    interview: {
      select: {
        id: true,

        status: true,

        duration: true,

        report: {
          select: {
            id: true,
          },
        },
      },
    },
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const buildRoomOwnerWhere =
  (
    userId
  ) => ({
    createdById:
      userId,
  });

/* -------------------------------------------------------------------------- */
/*                              FIND ROOM BY ID                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetch room with full relations.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findRoomById =
  async (
    id
  ) => {
    return prisma.room.findUnique(
      {
        where: { id },

        include:
          ROOM_FULL_INCLUDE,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           FIND ROOM BY SELECT                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch room using custom select.
 *
 * @param {string} id
 * @param {Object} select
 *
 * @returns {Promise<Object|null>}
 */
export const findRoomByIdSelect =
  async (
    id,
    select
  ) => {
    return prisma.room.findUnique(
      {
        where: { id },

        select,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             FIND USER ROOMS                                */
/* -------------------------------------------------------------------------- */

/**
 * Fetch paginated rooms for user.
 *
 * Returns:
 * [rooms, total]
 *
 * @param {string} userId
 * @param {Object} pagination
 *
 * @returns {Promise<[Array, number]>}
 */
export const findRoomsByUser =
  async (
    userId,
    {
      skip = 0,
      take = 20,
    } = {}
  ) => {
    return Promise.all([
      prisma.room.findMany(
        {
          where:
            buildRoomOwnerWhere(
              userId
            ),

          orderBy: {
            createdAt:
              "desc",
          },

          take,

          skip,

          select:
            ROOM_LIST_SELECT,
        }
      ),

      prisma.room.count({
        where:
          buildRoomOwnerWhere(
            userId
          ),
      }),
    ]);
  };

/* -------------------------------------------------------------------------- */
/*                              ROOM STATS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Batch-aggregate room stats.
 *
 * Repository owns aggregation queries.
 *
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const findRoomStats =
  async (
    userId
  ) => {
    const [
      statRows,
      evaluated,
    ] =
      await Promise.all([
        prisma.room.groupBy(
          {
            by: [
              "status",
            ],

            where:
              buildRoomOwnerWhere(
                userId
              ),

            _count: true,
          }
        ),

        prisma.room.count({
          where: {
            createdById:
              userId,

            interview: {
              report: {
                isNot:
                  null,
              },
            },
          },
        }),
      ]);

    const total =
      statRows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          row._count,
        0
      );

    const statusCounts =
      Object.fromEntries(
        statRows.map(
          (row) => [
            row.status,
            row._count,
          ]
        )
      );

    return {
      total,

      waiting:
        statusCounts[
          RoomStatus.WAITING
        ] || 0,

      active:
        statusCounts[
          RoomStatus.ACTIVE
        ] || 0,

      completed:
        (statusCounts[
          RoomStatus.COMPLETED
        ] || 0) +
        (statusCounts[
          InterviewStatus.EVALUATED
        ] || 0),

      evaluated,
    };
  };

/* -------------------------------------------------------------------------- */
/*                               CREATE ROOM                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates room.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createRoom =
  async (
    data
  ) => {
    return prisma.room.create(
      {
        data,

        include: {
          problem: true,

          problems:
            ROOM_PROBLEMS_INCLUDE,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                               UPDATE ROOM                                  */
/* -------------------------------------------------------------------------- */

/**
 * Updates room.
 *
 * @param {string} id
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updateRoom =
  async (
    id,
    data
  ) => {
    return prisma.room.update(
      {
        where: { id },

        data,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           DELETE ROOM CASCADE                              */
/* -------------------------------------------------------------------------- */

/**
 * Deletes room and dependent entities.
 *
 * Uses transaction for consistency.
 *
 * @param {string} roomId
 * @param {string|null} interviewId
 */
export const deleteRoomCascade =
  async (
    roomId,
    interviewId
  ) => {
    return prisma.$transaction(
      async (tx) => {
        if (interviewId) {
          await tx.codeSnapshot.deleteMany(
            {
              where: {
                interviewId,
              },
            }
          );

          await tx.interviewEvent.deleteMany(
            {
              where: {
                interviewId,
              },
            }
          );

          await tx.interviewerNote.deleteMany(
            {
              where: {
                interviewId,
              },
            }
          );

          await tx.aIReport.deleteMany(
            {
              where: {
                interviewId,
              },
            }
          );

          await tx.interview.delete(
            {
              where: {
                id: interviewId,
              },
            }
          );
        }

        await tx.chatMessage.deleteMany(
          {
            where: {
              roomId,
            },
          }
        );

        await tx.roomProblem.deleteMany(
          {
            where: {
              roomId,
            },
          }
        );

        await tx.room.delete(
          {
            where: {
              id: roomId,
            },
          }
        );
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                              ROOM MESSAGES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch room messages.
 *
 * @param {string} roomId
 * @param {number} limit
 *
 * @returns {Promise<Array>}
 */
export const findMessagesByRoom =
  async (
    roomId,
    limit
  ) => {
    return prisma.chatMessage.findMany(
      {
        where: {
          roomId,
        },

        orderBy: {
          timestamp:
            "asc",
        },

        take: limit,
      }
    );
  };

/**
 * Creates chat message.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createMessage =
  async (
    data
  ) => {
    return prisma.chatMessage.create(
      {
        data,
      }
    );
  };