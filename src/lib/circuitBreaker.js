import { logger } from "./logger.js";
import { Redis } from "@upstash/redis";

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export class CircuitBreakerOpenError extends Error {
  constructor(name) {
    super(`Circuit breaker '${name}' is open — service temporarily unavailable`);
    this.name = "CircuitBreakerOpenError";
    this.statusCode = 503;
  }
}

export class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name             = name;
    this.failureThreshold = opts.failureThreshold  ?? 5;
    this.resetTimeoutMs   = opts.resetTimeoutMs    ?? 30_000;
    this.failureWindowMs  = opts.failureWindowMs   ?? opts.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxCalls = opts.halfOpenMaxCalls   ?? 1;

    // Local fallback state
    this.localState           = "CLOSED";
    this.localFailureCount    = 0;
    this.localWindowStartTime = null;
    this.localLastFailureTime = null;
    this.localHalfOpenCalls   = 0;
  }

  async execute(fn) {
    if (redis) return this._executeRedis(fn);
    return this._executeLocal(fn);
  }

  async _executeRedis(fn) {
    const key = `cb:${this.name}`;
    // Atomically: check state, handle OPEN→HALF_OPEN transition, gate HALF_OPEN concurrency
    const lua = `
      local state = redis.call('HGET', KEYS[1], 'state') or 'CLOSED'
      if state == 'OPEN' then
        local last = tonumber(redis.call('HGET', KEYS[1], 'lastFailureTime') or '0')
        if (tonumber(ARGV[1]) - last) < tonumber(ARGV[2]) then
          return 'DENY'
        end
        redis.call('HSET', KEYS[1], 'state', 'HALF_OPEN', 'halfOpenCalls', 0)
        state = 'HALF_OPEN'
      end
      if state == 'HALF_OPEN' then
        local calls = redis.call('HINCRBY', KEYS[1], 'halfOpenCalls', 1)
        if calls > tonumber(ARGV[3]) then return 'DENY' end
      end
      return 'ALLOW'
    `;
    try {
      const decision = await redis.eval(
        lua,
        [key],
        [String(Date.now()), String(this.resetTimeoutMs), String(this.halfOpenMaxCalls)]
      );
      if (decision === "DENY") throw new CircuitBreakerOpenError(this.name);
      const result = await fn();
      await this._onSuccessRedis(key);
      return result;
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) throw err;
      await this._onFailureRedis(key);
      throw err;
    }
  }

  async _onSuccessRedis(key) {
    const state = await redis.hget(key, "state");
    if (state === "HALF_OPEN") {
      logger.info({ breaker: this.name }, "circuit breaker recovered — closing");
    }
    await redis.hset(key, { state: "CLOSED", failureCount: 0, windowStartTime: 0 });
  }

  async _onFailureRedis(key) {
    // Rolling window: reset count if outside the failure window
    const lua = `
      local now        = tonumber(ARGV[1])
      local windowMs   = tonumber(ARGV[2])
      local threshold  = tonumber(ARGV[3])
      local windowStart = tonumber(redis.call('HGET', KEYS[1], 'windowStartTime') or '0')
      if (now - windowStart) >= windowMs then
        redis.call('HSET', KEYS[1], 'failureCount', 0, 'windowStartTime', now)
      end
      local count = redis.call('HINCRBY', KEYS[1], 'failureCount', 1)
      redis.call('HSET', KEYS[1], 'lastFailureTime', now)
      if count >= threshold then
        redis.call('HSET', KEYS[1], 'state', 'OPEN')
        return count
      end
      return count
    `;
    const count = await redis.eval(
      lua,
      [key],
      [String(Date.now()), String(this.failureWindowMs), String(this.failureThreshold)]
    );
    if (Number(count) >= this.failureThreshold) {
      logger.error({ breaker: this.name, failures: count }, "circuit breaker opened");
    }
  }

  async _executeLocal(fn) {
    if (this.localState === "OPEN") {
      if (Date.now() - this.localLastFailureTime >= this.resetTimeoutMs) {
        this.localState         = "HALF_OPEN";
        this.localHalfOpenCalls = 0;
        logger.info({ breaker: this.name }, "circuit breaker entering half-open");
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    if (this.localState === "HALF_OPEN" && this.localHalfOpenCalls >= this.halfOpenMaxCalls) {
      throw new CircuitBreakerOpenError(this.name);
    }

    if (this.localState === "HALF_OPEN") this.localHalfOpenCalls++;

    try {
      const result = await fn();
      this._onSuccessLocal();
      return result;
    } catch (err) {
      this._onFailureLocal();
      throw err;
    }
  }

  _onSuccessLocal() {
    if (this.localState === "HALF_OPEN") {
      logger.info({ breaker: this.name }, "circuit breaker recovered — closing");
    }
    this.localFailureCount    = 0;
    this.localWindowStartTime = null;
    this.localState           = "CLOSED";
  }

  _onFailureLocal() {
    const now = Date.now();
    // Reset window if expired
    if (!this.localWindowStartTime || (now - this.localWindowStartTime) >= this.failureWindowMs) {
      this.localFailureCount    = 0;
      this.localWindowStartTime = now;
    }
    this.localFailureCount++;
    this.localLastFailureTime = now;
    if (this.localFailureCount >= this.failureThreshold) {
      this.localState = "OPEN";
      logger.error({ breaker: this.name, failures: this.localFailureCount }, "circuit breaker opened");
    }
  }

  async getState() {
    if (redis) {
      const key = `cb:${this.name}`;
      const data = await redis.hgetall(key);
      return {
        name:         this.name,
        state:        data?.state || "CLOSED",
        failureCount: parseInt(data?.failureCount || "0", 10),
        lastFailure:  parseInt(data?.lastFailureTime || "0", 10),
      };
    }
    return {
      name:         this.name,
      state:        this.localState,
      failureCount: this.localFailureCount,
      lastFailure:  this.localLastFailureTime,
    };
  }
}

export const groqBreaker = new CircuitBreaker("groq-ai", {
  failureThreshold: 5,
  resetTimeoutMs:   120_000,
  failureWindowMs:  120_000,
});

export const dockerBreaker = new CircuitBreaker("code-execution", {
  failureThreshold: 10,
  resetTimeoutMs:   60_000,
  failureWindowMs:  60_000,
});
