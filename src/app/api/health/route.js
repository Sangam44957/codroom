import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { logger } from "@/lib/logger";
import { groqBreaker, dockerBreaker } from "@/lib/circuitBreaker";

export const dynamic = "force-dynamic";

let redisHealthClient = null;

async function checkRedisHealth() {
  const url = process.env.REDIS_URL;
  if (!url) return { healthy: true, note: "not configured (single-instance mode)" };
  try {
    if (!redisHealthClient) {
      const { createClient } = await import("redis");
      redisHealthClient = createClient({ url, socket: { connectTimeout: 3000 } });
      redisHealthClient.on("error", () => {});
      await redisHealthClient.connect();
    }
    const start = Date.now();
    await redisHealthClient.ping();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    redisHealthClient = null; // reset so next call retries
    return { healthy: false, error: error.message };
  }
}

async function checkSocketHealth() {
  const port = process.env.SOCKET_PORT || 3001;
  try {
    const start = Date.now();
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return { healthy: res.ok, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function GET() {
  const start = Date.now();

  const [db, redis, socket] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkSocketHealth(),
  ]);

  const allHealthy = db.healthy && redis.healthy && socket.healthy;

  const body = {
    status:          allHealthy ? "healthy" : "degraded",
    timestamp:       new Date().toISOString(),
    uptime:          process.uptime(),
    checkDurationMs: Date.now() - start,
    services: { database: db, redis, socketServer: socket },
    circuitBreakers: {
      groqAi:        groqBreaker.getState(),
      codeExecution: dockerBreaker.getState(),
    },
  };

  if (!allHealthy) {
    logger.warn({ services: body.services }, "health check: degraded");
  }

  return NextResponse.json(body, {
    status: allHealthy ? 200 : 503,
    headers: { "Cache-Control": "no-cache, no-store" },
  });
}
