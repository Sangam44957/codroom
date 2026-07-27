import { NextResponse } from "next/server";
import { healthCheck as dbHealthCheck } from "@/lib/db";

export async function GET() {
  const checks = {};
  let overallHealthy = true;

  // Database health
  try {
    const dbHealth = await dbHealthCheck();
    checks.database = {
      status: "healthy",
      latencyMs: dbHealth.latencyMs,
      timestamp: dbHealth.timestamp
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    };
    overallHealthy = false;
  }

  // Socket server reachability check
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (socketUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${socketUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        checks.socket = {
          status: "healthy",
          uptime: data.uptime,
          timestamp: new Date().toISOString(),
        };
      } else {
        checks.socket = {
          status: "unhealthy",
          error: `HTTP ${res.status}`,
          timestamp: new Date().toISOString(),
        };
        // Socket being down doesn't mean the app is fully unhealthy
        // Mark as degraded but don't fail the whole check
      }
    } catch (error) {
      checks.socket = {
        status: "unreachable",
        error: error.name === "AbortError" ? "Timeout" : error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Redis health — only check if REDIS_URL points to a reachable host (not localhost on Vercel)
  const redisUrl = process.env.REDIS_URL || "";
  const isLocalRedis = redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1");
  const isVercel = !!process.env.VERCEL;

  if (redisUrl && !(isVercel && isLocalRedis)) {
    try {
      const { optimizedRoomStateManager } = await import("../../../../server/optimizedRoomStateManager.js");
      await optimizedRoomStateManager.connect();
      const redisHealth = await optimizedRoomStateManager.healthCheck();
      checks.redis = redisHealth;
      if (redisHealth.status !== "healthy") overallHealthy = false;
    } catch (error) {
      checks.redis = {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      };
      overallHealthy = false;
    }
  } else if (isVercel && isLocalRedis) {
    checks.redis = {
      status: "skipped",
      reason: "Redis runs on EC2, not reachable from Vercel serverless",
      timestamp: new Date().toISOString(),
    };
  }

  // Job queue — same logic, skip on Vercel if local Redis
  if (redisUrl && !(isVercel && isLocalRedis)) {
    try {
      const { jobQueue } = await import("@/lib/jobQueue");
      await jobQueue.connect();
      const queueStats = await jobQueue.getQueueStats('ai-reports');
      checks.jobQueue = {
        status: "healthy",
        stats: queueStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      checks.jobQueue = {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      };
      overallHealthy = false;
    }
  } else if (isVercel && isLocalRedis) {
    checks.jobQueue = {
      status: "skipped",
      reason: "Job queue runs on EC2, not reachable from Vercel serverless",
      timestamp: new Date().toISOString(),
    };
  }

  return NextResponse.json({
    status: overallHealthy ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, {
    status: overallHealthy ? 200 : 503
  });
}