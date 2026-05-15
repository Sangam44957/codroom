/**
 * src/services/problem.service.js
 *
 * Problem library domain service.
 *
 * Responsibilities:
 * - Problem search/filter orchestration
 * - Problem creation
 * - Problem deletion
 * - Problem DTO shaping
 *
 * NOT responsible for:
 * - Direct database access
 * - HTTP formatting
 * - Request validation middleware
 *
 * LLD Principles:
 * - SRP
 * - DRY
 * - Explicit Error Contracts
 * - Fail Fast
 */

import {
  findProblems,
  countProblems,
  findProblemById,
  createProblem,
  deleteProblem,
} from "@/repositories/problem.repository";

import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

import {
  Difficulty,
  assertEnum,
} from "@/lib/enums";

import {
  PAGE_LIMITS,
  PAGINATION,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const PAGE_LIMIT =
  PAGE_LIMITS.PROBLEMS;

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

const normalizeCompanies = (
  companies
) => {
  return normalizeArray(
    companies
  ).map((company) =>
    company
      .trim()
      .toLowerCase()
  );
};

const normalizePage = (
  page
) => {
  return Math.max(
    PAGINATION.MIN_PAGE,
    Number(page) ||
      PAGINATION.DEFAULT_PAGE
  );
};

const assertProblemExists = (
  problem,
  problemId
) => {
  if (!problem) {
    throw new NotFoundError(
      "Problem",
      problemId
    );
  }
};

const assertProblemOwnership = (
  problem,
  userId
) => {
  if (
    problem.createdById !==
    userId
  ) {
    throw new ForbiddenError(
      "You do not own this problem"
    );
  }
};

const sanitizeTestCases = (
  testCases = []
) => {
  return testCases.map(
    ({ input }) => ({
      input,
    })
  );
};

const buildProblemFilters = (
  filters,
  userId
) => {
  const {
    difficulty,
    topic,
    search,
    company,
    tag,
    isPublic,
  } = filters;

  const where = {
    OR: [
      {
        createdById:
          userId,
      },

      {
        isPublic: true,
      },

      {
        createdById:
          null,
      },
    ],
  };

  if (
    difficulty &&
    difficulty !== "all"
  ) {
    assertEnum(
      difficulty,
      Difficulty,
      "difficulty"
    );

    where.difficulty =
      difficulty;
  }

  if (
    topic &&
    topic !== "all"
  ) {
    where.topic =
      normalizeString(
        topic
      );
  }

  if (search) {
    where.title = {
      contains:
        normalizeString(
          search
        ),

      mode:
        "insensitive",
    };
  }

  if (company) {
    where.companies = {
      has: company
        .trim()
        .toLowerCase(),
    };
  }

  if (tag) {
    where.tags = {
      some: {
        name: tag,
      },
    };
  }

  if (
    isPublic === "true"
  ) {
    where.isPublic =
      true;
  }

  return where;
};

const serializeProblem = (
  problem,
  userId
) => {
  return {
    ...problem,

    testCases:
      sanitizeTestCases(
        problem.testCases
      ),

    isOwn:
      problem.createdById ===
      userId,
  };
};

/* -------------------------------------------------------------------------- */
/*                              LIST PROBLEMS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lists paginated problems.
 *
 * @param {Object} filters
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const listProblems =
  async (
    filters = {},
    userId
  ) => {
    const page =
      normalizePage(
        filters.page
      );

    const where =
      buildProblemFilters(
        filters,
        userId
      );

    const skip =
      (page - 1) *
      PAGE_LIMIT;

    const [
      rows,
      total,
    ] =
      await Promise.all([
        findProblems(
          where,
          {
            skip,

            take:
              PAGE_LIMIT,
          }
        ),

        countProblems(
          where
        ),
      ]);

    return Object.freeze({
      problems:
        rows.map(
          (problem) =>
            serializeProblem(
              problem,
              userId
            )
        ),

      total,

      page,

      totalPages:
        Math.ceil(
          total /
            PAGE_LIMIT
        ),
    });
  };

/* -------------------------------------------------------------------------- */
/*                             CREATE PROBLEM                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates coding problem.
 *
 * @param {Object} payload
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const createNewProblem =
  async (
    payload = {},
    userId
  ) => {
    const {
      title,
      description,
      difficulty,
      topic,
      starterCode,
      testCases,
      companies,
      estimatedTime,
      isPublic,
      tags,
    } = payload;

    if (
      !normalizeString(
        title
      ) ||
      !normalizeString(
        description
      ) ||
      !difficulty ||
      !normalizeString(
        topic
      )
    ) {
      throw new ValidationError(
        "title, description, difficulty and topic are required"
      );
    }

    assertEnum(
      difficulty,
      Difficulty,
      "difficulty"
    );

    const problem =
      await createProblem({
        title:
          normalizeString(
            title
          ),

        description:
          normalizeString(
            description
          ),

        difficulty,

        topic:
          normalizeString(
            topic
          ),

        starterCode:
          normalizeString(
            starterCode
          ) || null,

        testCases:
          normalizeArray(
            testCases
          ),

        companies:
          normalizeCompanies(
            companies
          ),

        estimatedTime:
          estimatedTime ||
          null,

        isPublic:
          Boolean(
            isPublic
          ),

        createdById:
          userId,

        tags:
          normalizeArray(
            tags
          ),
      });

    return Object.freeze({
      problem,
    });
  };

/* -------------------------------------------------------------------------- */
/*                              REMOVE PROBLEM                                */
/* -------------------------------------------------------------------------- */

/**
 * Deletes problem.
 *
 * @param {string} problemId
 * @param {string} userId
 */
export const removeProblem =
  async (
    problemId,
    userId
  ) => {
    const problem =
      await findProblemById(
        problemId
      );

    assertProblemExists(
      problem,
      problemId
    );

    assertProblemOwnership(
      problem,
      userId
    );

    await deleteProblem(
      problemId
    );
  };