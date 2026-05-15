/**
 * src/repositories/pipeline.repository.js
 *
 * Hiring pipeline persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma pipeline queries
 * - Centralize reusable include/select projections
 * - Handle pipeline-room relationship persistence
 * - Expose optimized pipeline retrieval APIs
 *
 * NOT responsible for:
 * - Business logic
 * - Validation
 * - Authorization
 * - HTTP formatting
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - DRY
 * - Encapsulation
 */

import prisma from "@/lib/db";

import {
  InterviewStatus,
} from "@/lib/enums";

/* -------------------------------------------------------------------------- */
/*                              SHARED SELECTS                                */
/* -------------------------------------------------------------------------- */

const TEMPLATE_MINIMAL_SELECT =
  Object.freeze({
    id: true,
    name: true,
  });

const TEMPLATE_FULL_SELECT =
  Object.freeze({
    id: true,

    name: true,

    durationMinutes:
      true,

    problemIds: true,
  });

const PIPELINE_LIST_INCLUDE =
  Object.freeze({
    template: {
      select:
        TEMPLATE_MINIMAL_SELECT,
    },

    _count: {
      select: {
        rooms: true,
      },
    },
  });

const PIPELINE_DETAIL_INCLUDE =
  Object.freeze({
    template: {
      select:
        TEMPLATE_FULL_SELECT,
    },
  });

const PIPELINE_ROOM_INTERVIEW_INCLUDE =
  Object.freeze({
    report: true,

    snapshots: {
      orderBy: {
        timestamp:
          "asc",
      },

      select: {
        timestamp:
          true,

        code: true,
      },
    },

    events: {
      where: {
        type: {
          in: [
            "test-run",
            "code-execution",
          ],
        },
      },

      select: {
        type: true,

        label: true,

        timestamp:
          true,
      },
    },
  });

const PIPELINE_WITH_ROOMS_INCLUDE =
  Object.freeze({
    template: {
      select: {
        name: true,

        durationMinutes:
          true,

        problemIds: true,
      },
    },

    rooms: {
      include: {
        interview: {
          where: {
            status: {
              in: [
                InterviewStatus.COMPLETED,
                InterviewStatus.EVALUATED,
              ],
            },
          },

          include:
            PIPELINE_ROOM_INTERVIEW_INCLUDE,
        },
      },
    },
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const buildOwnerWhere = (
  id,
  userId
) => {
  return {
    id,
    createdById:
      userId,
  };
};

/* -------------------------------------------------------------------------- */
/*                           LIST USER PIPELINES                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch pipelines owned by user.
 *
 * @param {string} userId
 *
 * @returns {Promise<Array>}
 */
export const findPipelinesByUser =
  async (
    userId
  ) => {
    return prisma.hiringPipeline.findMany(
      {
        where: {
          createdById:
            userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        include:
          PIPELINE_LIST_INCLUDE,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                            FIND PIPELINE                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetch pipeline by id with template.
 *
 * Ownership enforced.
 *
 * @param {string} id
 * @param {string} userId
 *
 * @returns {Promise<Object|null>}
 */
export const findPipelineById =
  async (
    id,
    userId
  ) => {
    return prisma.hiringPipeline.findFirst(
      {
        where:
          buildOwnerWhere(
            id,
            userId
          ),

        include:
          PIPELINE_DETAIL_INCLUDE,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                        FIND PIPELINE ID ONLY                               */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight ownership lookup.
 *
 * Used for validation checks.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findPipelineByIdOnly =
  async (
    id
  ) => {
    return prisma.hiringPipeline.findUnique(
      {
        where: { id },

        select: {
          id: true,

          createdById:
            true,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                      FIND PIPELINE WITH ROOMS                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetches pipeline comparison payload.
 *
 * Includes:
 * - rooms
 * - interviews
 * - reports
 * - snapshots
 * - execution events
 *
 * @param {string} id
 * @param {string} userId
 *
 * @returns {Promise<Object|null>}
 */
export const findPipelineWithRooms =
  async (
    id,
    userId
  ) => {
    return prisma.hiringPipeline.findFirst(
      {
        where:
          buildOwnerWhere(
            id,
            userId
          ),

        include:
          PIPELINE_WITH_ROOMS_INCLUDE,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           CREATE PIPELINE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates hiring pipeline.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createPipeline =
  async (
    data
  ) => {
    return prisma.hiringPipeline.create(
      {
        data,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           UPDATE PIPELINE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Updates pipeline with ownership enforcement.
 *
 * Uses updateMany for safe ownership guard.
 *
 * @param {string} id
 * @param {string} userId
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updatePipeline =
  async (
    id,
    userId,
    data
  ) => {
    return prisma.hiringPipeline.updateMany(
      {
        where:
          buildOwnerWhere(
            id,
            userId
          ),

        data,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           DELETE PIPELINE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Deletes pipeline safely.
 *
 * Workflow:
 * 1. Detach linked rooms
 * 2. Delete pipeline
 *
 * @param {string} id
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const deletePipeline =
  async (
    id,
    userId
  ) => {
    return prisma.$transaction(
      async (tx) => {
        /**
         * Prevent foreign-key conflicts.
         */
        await tx.room.updateMany(
          {
            where: {
              pipelineId:
                id,
            },

            data: {
              pipelineId:
                null,
            },
          }
        );

        return tx.hiringPipeline.deleteMany(
          {
            where:
              buildOwnerWhere(
                id,
                userId
              ),
          }
        );
      }
    );
  };