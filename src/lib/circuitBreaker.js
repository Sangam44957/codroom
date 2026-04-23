import { logger } from "./logger";
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
    this.halfOpenMaxCalls = opts.halfOpenMaxCalls   ?? 1;

    // Local fallback state
    this.localState            = "CLOSED";
    this.localFailureCount     = 0;
    this.localLastFailureTime  = null;
    this.localHalfOpenCalls    = 0;
  }

  async execute(fn) {
    if (redis) {
      return this._executeRedis(fn);
    }
    return this._executeLocal(fn);
  }

  async _executeRedis(fn) {
    const key = `cb:${this.name}`;
    try {
      const data = await redis.hgetall(key);
      const state = data?.state || "CLOSED";
      const failureCount = parseInt(data?.failureCount || "0", 10);
      const lastFailureTime = parseInt(data?.lastFailureTime || "0", 10);
      const halfOpenCalls = parseInt(data?.halfOpenCalls || "0", 10);

      if (state === "OPEN") {
        if (Date.now() - lastFailureTime >= this.resetTimeoutMs) {
          await redis.hset(key, { state: "HALF_OPEN", halfOpenCalls: 0 });
          logger.info({ breaker: this.name }, "circuit breaker entering half-open");
        } else {
          throw new CircuitBreakerOpenError(this.name);
        }
      }

      const currentState = (await redis.hget(key, "state")) || "CLOSED";
      const currentHalfOpen = parseInt((await redis.hget(key, "halfOpenCalls")) || "0", 10);

      if (currentState === "HALF_OPEN" && currentHalfOpen >= this.halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError(this.name);
      }

      if (currentState === "HALF_OPEN") {
        await redis.hincrby(key, "halfOpenCalls", 1);
      }

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
    await redis.hset(key, { state: "CLOSED", failureCount: 0 });
  }

  async _onFailureRedis(key) {
    const failureCount = await redis.hincrby(key, "failureCount", 1);
    await redis.hset(key, { lastFailureTime: Date.now() });
    if (failureCount >= this.failureThreshold) {
      await redis.hset(key, { state: "OPEN" });
      logger.error({ breaker: this.name, failures: failureCount }, "circuit breaker opened");
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
    this.localFailureCount = 0;
    this.localState        = "CLOSED";
  }

  _onFailureLocal() {
    this.localFailureCount++;
    this.localLastFailureTime = Date.now();
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

// Uses Redis if UPSTASH_REDIS_REST_URL is set, otherwise falls back to per-process state.

export const groqBreaker = new CircuitBreaker("groq-ai", {
  failureThreshold: 3,
  resetTimeoutMs:   60_000,
});

export const dockerBreaker = new CircuitBreaker("code-execution", {
  failureThreshold: 5,
  resetTimeoutMs:   30_000,
});
