/**
 * src/lib/db.js
 *
 * Prisma database client singleton.
 *
 * Responsibilities:
 * - Prisma client lifecycle management
 * - Singleton enforcement
 * - Query observability
 * - Slow query monitoring
 * - Database health checks
 *
 * NOT responsible for:
 * - Business logic
 * - Query construction
 * - Request handling
 * - Retry orchestration
 *
 * LLD Principles:
 * - Singleton Pattern
 * - Encapsulation
 * - Observability
 * - Fail-safe Infrastructure
 */

import {
  PrismaClient,
} from "@prisma/client";

import {
  logger,
} from "@/lib/logger";

import {
  config,
} from "@/lib/config";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const SLOW_QUERY_MS =
  200;

const MAX_QUERY_LOG_LENGTH =
  500;

const MAX_PARAM_LOG_LENGTH =
  200;

/* -------------------------------------------------------------------------- */
/*                              HELPER METHODS                                */
/* -------------------------------------------------------------------------- */

const truncate = (
  value,
  maxLength
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  if (
    value.length <=
    maxLength
  ) {
    return value;
  }

  return `${value.slice(
    0,
    maxLength
  )}...`;
};

const isSlowQuery = (
  duration
) => {
  return (
    duration >
    SLOW_QUERY_MS
  );
};

/* -------------------------------------------------------------------------- */
/*                          PRISMA EVENT HANDLERS                             */
/* -------------------------------------------------------------------------- */

const registerQueryLogging =
  (client) => {
    client.$on(
      "query",
      (event) => {
        if (
          !isSlowQuery(
            event.duration
          )
        ) {
          return;
        }

        logger.warn(
          {
            durationMs:
              event.duration,

            query:
              truncate(
                event.query,
                MAX_QUERY_LOG_LENGTH
              ),

            params:
              truncate(
                event.params,
                MAX_PARAM_LOG_LENGTH
              ),
          },
          "Slow database query detected"
        );
      }
    );
  };

const registerErrorLogging =
  (client) => {
    client.$on(
      "error",
      (event) => {
        logger.error(
          {
            prismaError:
              event,
          },
          "Prisma client error"
        );
      }
    );

    client.$on(
      "warn",
      (event) => {
        logger.warn(
          {
            prismaWarning:
              event,
          },
          "Prisma client warning"
        );
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           PRISMA FACTORY                                   */
/* -------------------------------------------------------------------------- */

const createPrismaClient =
  () => {
    const client =
      new PrismaClient({
        log: [
          {
            emit: "event",
            level:
              "query",
          },

          {
            emit: "event",
            level:
              "error",
          },

          {
            emit: "event",
            level:
              "warn",
          },
        ],
      });

    registerQueryLogging(
      client
    );

    registerErrorLogging(
      client
    );

    return client;
  };

/* -------------------------------------------------------------------------- */
/*                            SINGLETON SETUP                                 */
/* -------------------------------------------------------------------------- */

/**
 * Prevent multiple Prisma instances
 * during Next.js HMR in development.
 */
const globalForPrisma =
  globalThis;

const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

/**
 * Always preserve singleton globally.
 */
if (
  !config.isProduction
) {
  globalForPrisma.prisma =
    prisma;
}

/* -------------------------------------------------------------------------- */
/*                            HEALTH CHECK                                    */
/* -------------------------------------------------------------------------- */

/**
 * Performs lightweight database health check.
 *
 * @returns {Promise<{
 *   healthy: boolean,
 *   latencyMs?: number,
 *   error?: string
 * }>}
 */
export const checkDatabaseHealth =
  async () => {
    try {
      const startedAt =
        performance.now();

      await prisma.$queryRaw`
        SELECT 1
      `;

      return {
        healthy: true,

        latencyMs:
          Math.round(
            performance.now() -
              startedAt
          ),
      };
    } catch (error) {
      logger.error(
        {
          err: error,
        },
        "Database health check failed"
      );

      return {
        healthy: false,

        error:
          error.message,
      };
    }
  };

/* -------------------------------------------------------------------------- */
/*                                EXPORTS                                     */
/* -------------------------------------------------------------------------- */

export default prisma;