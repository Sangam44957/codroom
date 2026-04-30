import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const SLOW_QUERY_MS = 200;

function makePrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("query", (e) => {
    if (e.duration > SLOW_QUERY_MS) {
      logger.warn(
        {
          duration: e.duration,
          query: e.query.substring(0, 500),
          params: e.params?.substring(0, 200),
        },
        "slow database query"
      );
    }
  });

  client.$on("error", (e) => {
    logger.error({ prismaError: e }, "prisma client error");
  });

  client.$on("warn", (e) => {
    logger.warn({ prismaWarn: e }, "prisma client warning");
  });

  return client;
}

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? makePrismaClient();

// Always preserve singleton in globalThis to prevent multiple instances
globalForPrisma.prisma = prisma;

// Remove eager connection - let Prisma connect lazily on first query

export default prisma;

export async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "database health check failed");
    return { healthy: false, error: error.message };
  }
}
