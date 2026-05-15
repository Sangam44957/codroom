/**
 * src/repositories/interview.repository.js
 *
 * Interview persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma queries
 * - Own interview-related data access
 * - Centralize query shapes/includes
 * - Expose persistence-focused API
 *
 * NOT responsible for:
 * - Business logic
 * - Validation
 * - HTTP formatting
 * - Logging
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - Encapsulation
 * - DRY
 */

import prisma from "@/lib/db";

import {
  RoomStatus,
} from "@/lib/enums";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_PAGINATION_LIMIT =
  20;

/* -------------------------------------------------------------------------- */
/*                             SHARED INCLUDES                                */
/* -------------------------------------------------------------------------- */

const ROOM_PROBLEM_INCLUDE =
  Object.freeze({
    problem: true,

    problems: {
      include: {
        problem: true,
      },

      orderBy: {
        order: "asc",
      },
    },
  });

const ROOM_OWNER_INCLUDE =
  Object.freeze({
    createdBy: {
      select: {
        email: true,
        name: true,
      },
    },
  });

const INTERVIEW_FULL_INCLUDE =
  Object.freeze({
    room: {
      include: {
        ...ROOM_PROBLEM_INCLUDE,
        ...ROOM_OWNER_INCLUDE,
      },
    },

    report: true,
  });

const PLAYBACK_INTERVIEW_INCLUDE =
  Object.freeze({
    room: {
      include: {
        ...ROOM_PROBLEM_INCLUDE,
      },
    },

    report: true,
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const buildCursorPagination =
  (
    cursor,
    limit
  ) => {
    return {
      take:
        (limit ||
          DEFAULT_PAGINATION_LIMIT) +
        1,

      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },

            skip: 1,
          }
        : {}),
    };
  };

/* -------------------------------------------------------------------------- */
/*                             INTERVIEW QUERIES                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch interview by id.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findInterviewById =
  async (id) => {
    return prisma.interview.findUnique(
      {
        where: { id },

        include:
          INTERVIEW_FULL_INCLUDE,
      }
    );
  };

/**
 * Fetch interview by room id.
 *
 * @param {string} roomId
 *
 * @returns {Promise<Object|null>}
 */
export const findInterviewByRoomId =
  async (
    roomId
  ) => {
    return prisma.interview.findUnique(
      {
        where: {
          roomId,
        },
      }
    );
  };

/**
 * Creates interview.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createInterview =
  async (
    data
  ) => {
    return prisma.interview.create(
      {
        data,
      }
    );
  };

/**
 * Updates interview.
 *
 * @param {string} id
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updateInterview =
  async (
    id,
    data
  ) => {
    return prisma.interview.update(
      {
        where: { id },

        data,

        include: {
          room: true,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                         INTERVIEW DELETION                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deletes interview and dependent entities.
 *
 * Uses transaction for consistency.
 *
 * @param {string} interviewId
 * @param {string} roomId
 */
export const deleteInterviewCascade =
  async (
    interviewId,
    roomId
  ) => {
    return prisma.$transaction([
      prisma.codeSnapshot.deleteMany(
        {
          where: {
            interviewId,
          },
        }
      ),

      prisma.interviewEvent.deleteMany(
        {
          where: {
            interviewId,
          },
        }
      ),

      prisma.interviewerNote.deleteMany(
        {
          where: {
            interviewId,
          },
        }
      ),

      prisma.aIReport.deleteMany(
        {
          where: {
            interviewId,
          },
        }
      ),

      prisma.interview.delete(
        {
          where: {
            id: interviewId,
          },
        }
      ),

      prisma.room.update({
        where: {
          id: roomId,
        },

        data: {
          status:
            RoomStatus.WAITING,
        },
      }),
    ]);
  };

/* -------------------------------------------------------------------------- */
/*                              SNAPSHOTS                                     */
/* -------------------------------------------------------------------------- */

/**
 * Creates code snapshot.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createSnapshot =
  async (
    data
  ) => {
    return prisma.codeSnapshot.create(
      {
        data,
      }
    );
  };

/**
 * Fetch paginated snapshots.
 *
 * @param {string} interviewId
 * @param {Object} pagination
 *
 * @returns {Promise<Array>}
 */
export const findSnapshotsPaginated =
  async (
    interviewId,
    {
      cursor,
      limit,
    } = {}
  ) => {
    return prisma.codeSnapshot.findMany(
      {
        where: {
          interviewId,
        },

        orderBy: {
          timestamp:
            "asc",
        },

        ...buildCursorPagination(
          cursor,
          limit
        ),
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                                EVENTS                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates interview event.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createEvent =
  async (
    data
  ) => {
    return prisma.interviewEvent.create(
      {
        data,
      }
    );
  };

/**
 * Fetch paginated events.
 *
 * @param {string} interviewId
 * @param {Object} pagination
 *
 * @returns {Promise<Array>}
 */
export const findEventsPaginated =
  async (
    interviewId,
    {
      cursor,
      limit,
    } = {}
  ) => {
    return prisma.interviewEvent.findMany(
      {
        where: {
          interviewId,
        },

        orderBy: {
          timestamp:
            "asc",
        },

        ...buildCursorPagination(
          cursor,
          limit
        ),
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                                 NOTES                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fetch latest interviewer note.
 *
 * @param {string} interviewId
 *
 * @returns {Promise<Object|null>}
 */
export const findNoteByInterview =
  async (
    interviewId
  ) => {
    return prisma.interviewerNote.findFirst(
      {
        where: {
          interviewId,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      }
    );
  };

/**
 * Upserts interviewer note.
 *
 * @param {string} interviewId
 * @param {string} content
 *
 * @returns {Promise<Object|null>}
 */
export const upsertNote =
  async (
    interviewId,
    content
  ) => {
    const existing =
      await prisma.interviewerNote.findFirst(
        {
          where: {
            interviewId,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        }
      );

    if (existing) {
      return prisma.interviewerNote.update(
        {
          where: {
            id: existing.id,
          },

          data: {
            content,
          },
        }
      );
    }

    if (!content) {
      return null;
    }

    return prisma.interviewerNote.create(
      {
        data: {
          content,
          interviewId,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                                 REPORTS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch report by interview id.
 *
 * @param {string} interviewId
 *
 * @returns {Promise<Object|null>}
 */
export const findReport =
  async (
    interviewId
  ) => {
    return prisma.aIReport.findUnique(
      {
        where: {
          interviewId,
        },
      }
    );
  };

/**
 * Creates report.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createReport =
  async (
    data
  ) => {
    return prisma.aIReport.create(
      {
        data,
      }
    );
  };

/**
 * Updates report.
 *
 * @param {string} interviewId
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updateReport =
  async (
    interviewId,
    data
  ) => {
    return prisma.aIReport.update(
      {
        where: {
          interviewId,
        },

        data,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                            PLAYBACK DATA                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetches playback aggregate payload.
 *
 * Optimized parallel fetch.
 *
 * @param {string} interviewId
 *
 * @returns {Promise<Object>}
 */
export const findPlaybackData =
  async (
    interviewId
  ) => {
    const [
      interview,
      snapshots,
      events,
      notes,
    ] =
      await Promise.all([
        prisma.interview.findUnique(
          {
            where: {
              id: interviewId,
            },

            include:
              PLAYBACK_INTERVIEW_INCLUDE,
          }
        ),

        prisma.codeSnapshot.findMany(
          {
            where: {
              interviewId,
            },

            orderBy: {
              timestamp:
                "asc",
            },
          }
        ),

        prisma.interviewEvent.findMany(
          {
            where: {
              interviewId,
            },

            orderBy: {
              timestamp:
                "asc",
            },
          }
        ),

        prisma.interviewerNote.findMany(
          {
            where: {
              interviewId,
            },

            orderBy: {
              createdAt:
                "asc",
            },
          }
        ),
      ]);

    return {
      interview,
      snapshots,
      events,
      notes,
    };
  };