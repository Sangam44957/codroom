/**
 * Shared rate limiter.
 *
 * Priority:
 *   1. Upstash Redis REST (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — serverless-friendly
 *   2. Plain Redis (REDIS_URL) — used when Upstash is not configured
 *   3. In-memory Map — single-instance fallback
 *
 * Usage:
 *   const rl = await rateLimit("login", ip, { limit: 10, windowMs: 15 * 60_000 });
 *   if (!rl.allowed) return 429;
 */

import { createClient } from "redis";

let upstashClient = null;
let redisClient = null;
let redisConnecting = false;

function getUpstash() {
  if (upstashClient) return upstashClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = require("@upstash/redis");
  upstashClient = new Redis({ url, token });
  return upstashClient;
}

async function getRedis() {
  if (redisClient?.isReady) return redisClient;
  if (!process.env.REDIS_URL || redisConnecting) return null;
  redisConnecting = true;
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: { reconnectStrategy: (r) => Math.min(r * 500, 5000) },
    });
    redisClient.on("error", () => {}); // suppress unhandled error events
    await redisClient.connect();
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  } finally {
    redisConnecting = false;
  }
}

// In-memory fallback
const memoryStore = new Map(); // key -> { count, resetAt }

if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.REDIS_URL) {
  console.warn("[rateLimit] No Redis configured — using in-memory limiter (single-instance only).");
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore.entries()) {
    if (now > v.resetAt) memoryStore.delete(k);
  }
}, 60_000);

/**
 * @param {string} prefix  - namespace, e.g. "login", "register", "execute"
 * @param {string} id      - IP or userId
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {Promise<{ allowed: boolean, remaining: number, retryAfter?: number }>}
 */
export async function rateLimit(prefix, id, { limit, windowMs }) {
  const key = `rl:${prefix}:${id}`;
  const windowSec = Math.ceil(windowMs / 1000);

  // 1. Upstash
  const upstash = getUpstash();
  if (upstash) {
    const count = await upstash.incr(key);
    if (count === 1) await upstash.expire(key, windowSec);
    const ttl = await upstash.ttl(key);
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { allowed: true, remaining: limit - count };
  }

  // 2. Plain Redis (fixed-window via INCR + EXPIRE)
  try {
    const redis = await getRedis();
    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      const ttl = await redis.ttl(key);
      if (count > limit) {
        return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
      }
      return { allowed: true, remaining: limit - count };
    }
  } catch {
    // fall through to in-memory
  }

  // 3. In-memory fallback
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}
