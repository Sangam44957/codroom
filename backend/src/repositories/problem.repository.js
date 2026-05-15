/**
 * src/repositories/problem.repository.js
 *
 * Problem persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma problem queries
 * - Centralize reusable query projections
 * - Handle tag persistence orchestration
 * - Expose optimized persistence APIs
 *
 * NOT responsible for:
 * - Validation
 * - Authorization
 * - HTTP formatting
 * - Business logic
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - DRY
 * - Performance Optimization
 */

import prisma from "@/lib/db";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_SKIP =
  0;

const DEFAULT_TAKE =
  50;

const DEFAULT_ORDER_BY =
  Object.freeze([
    {
      difficulty: "asc",
    },

    {
      title: "asc",
    },
  ]);

/* -------------------------------------------------------------------------- */
/*                              SHARED SELECTS                                */
/* -------------------------------------------------------------------------- */

const TAG_SELECT =
  Object.freeze({
    id: true,
    name: true,
  });

export const PROBLEM_LIST_SELECT =
  Object.freeze({
    id: true,

    title: true,

    difficulty: true,

    topic: true,

    description: true,

    starterCode: true,

    testCases: true,

    companies: true,

    estimatedTime: true,

    isPublic: true,

    usageCount: true,

    createdById: true,

    tags: {
      select:
        TAG_SELECT,
    },
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const normalizeArray = (
  value
) => {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value;
};

const buildTagConnections =
  (tags = []) => {
    return normalizeArray(
      tags
    ).map((name) => ({
      where: {
        name,
      },

      create: {
        name,
      },
    }));
  };

/* -------------------------------------------------------------------------- */
/*                              FIND PROBLEMS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch paginated problems.
 *
 * @param {Object} where
 * @param {Object} options
 *
 * @returns {Promise<Array>}
 */
export const findProblems =
  async (
    where = {},
    {
      skip =
        DEFAULT_SKIP,

      take =
        DEFAULT_TAKE,

      orderBy,
    } = {}
  ) => {
    return prisma.problem.findMany(
      {
        where,

        orderBy:
          orderBy ||
          DEFAULT_ORDER_BY,

        skip,

        take,

        select:
          PROBLEM_LIST_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             COUNT PROBLEMS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Count problems matching filters.
 *
 * @param {Object} where
 *
 * @returns {Promise<number>}
 */
export const countProblems =
  async (
    where = {}
  ) => {
    return prisma.problem.count(
      {
        where,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                            FIND PROBLEM BY ID                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch problem by id.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findProblemById =
  async (
    id
  ) => {
    return prisma.problem.findUnique(
      {
        where: {
          id,
        },

        include: {
          tags: true,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             CREATE PROBLEM                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates coding problem.
 *
 * Supports automatic tag creation.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createProblem =
  async (
    data
  ) => {
    const {
      tags,
      ...rest
    } = data;

    return prisma.problem.create(
      {
        data: {
          ...rest,

          ...(tags?.length && {
            tags: {
              connectOrCreate:
                buildTagConnections(
                  tags
                ),
            },
          }),
        },

        include: {
          tags: true,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             DELETE PROBLEM                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deletes problem.
 *
 * @param {string} id
 *
 * @returns {Promise<Object>}
 */
export const deleteProblem =
  async (
    id
  ) => {
    return prisma.problem.delete(
      {
        where: {
          id,
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                         SINGLE USAGE INCREMENT                             */
/* -------------------------------------------------------------------------- */

/**
 * Increment single problem usage count.
 *
 * @param {string} id
 *
 * @returns {Promise<Object>}
 */
export const incrementUsageCount =
  async (
    id
  ) => {
    return prisma.problem.update(
      {
        where: {
          id,
        },

        data: {
          usageCount: {
            increment: 1,
          },
        },
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                         BATCH USAGE INCREMENT                              */
/* -------------------------------------------------------------------------- */

/**
 * Increments usage count for multiple problems.
 *
 * Performance optimization:
 * replaces sequential N+1 update loop
 * with a single SQL query.
 *
 * Prisma limitation:
 * updateMany cannot perform per-row increment operations.
 *
 * @param {string[]} ids
 *
 * @returns {Promise<void>}
 */
export const incrementUsageCountBatch =
  async (
    ids = []
  ) => {
    const uniqueIds = [
      ...new Set(
        normalizeArray(ids)
      ),
    ];

    if (
      !uniqueIds.length
    ) {
      return;
    }

    await prisma.$executeRaw`
      UPDATE problems
      SET "usageCount" = "usageCount" + 1
      WHERE id = ANY(${uniqueIds})
    `;
  };