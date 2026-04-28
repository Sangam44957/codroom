import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { logger } from "@/lib/logger";
import { groqBreaker, dockerBreaker } from "@/lib/circuitBreaker";

export const dynamic = "force-dynamic";

async function checkRedisHealth() {
  const url = process.env.REDIS_URL;
  if (!url) return { healthy: true, note: "not configured (single-instance mode)" };
  
  let client = null;
  try {
    const { createClient } = await import("redis");
    client = createClient({ 
      url, 
      socket: { 
        connectTimeout: 3000,
        lazyConnect: true // Don't auto-connect
      } 
    });
    client.on("error", () => {}); // Suppress error events
    
    await client.connect();
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    
    return { healthy: true, latencyMs };
  } catch (error) {
    return { healthy: false, error: error.message };
  } finally {
    // Always disconnect the client to prevent leaks
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }
}

async function checkSocketHealth() {
  // In production, use the socket server URL; in dev, use localhost
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL 
    ? `${process.env.NEXT_PUBLIC_SOCKET_URL}/health`
    : `http://localhost:${process.env.SOCKET_PORT || 3001}/health`;
  
  try {
    const start = Date.now();
    const res = await fetch(socketUrl, {
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
