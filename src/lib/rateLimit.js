/**
 * Shared rate limiter.
 *
 * Production: uses Upstash Redis (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * Dev / no env vars: falls back to in-memory Map (single-instance only).
 *
 * Usage:
 *   const rl = await rateLimit("login", ip, { limit: 10, windowMs: 15 * 60_000 });
 *   if (!rl.allowed) return 429;
 */

let upstashClient = null;

function getUpstash() {
  if (upstashClient) return upstashClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Lazy import — only loads when env vars are present
  const { Redis } = require("@upstash/redis");
  upstashClient = new Redis({ url, token });
  return upstashClient;
}

// In-memory fallback
// NOTE: This store is process-local. In multi-instance deployments (Vercel, etc.)
// each instance has its own counter so the effective limit is limit × instances.
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for distributed limiting.
const memoryStore = new Map(); // key -> { count, resetAt }

if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.warn("[rateLimit] No UPSTASH_REDIS_REST_URL set — using in-memory limiter (single-instance only).");
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
  const redis = getUpstash();

  if (redis) {
    // Upstash: atomic increment + expiry
    const windowSec = Math.ceil(windowMs / 1000);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    const ttl = await redis.ttl(key);
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { allowed: true, remaining: limit - count };
  }

  // In-memory fallback
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
