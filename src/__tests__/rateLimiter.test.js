"use strict";

const { describe, it, expect, beforeEach } = require("@jest/globals");

// Import the rate-limit constants directly from the production socket server.
// We re-implement only the factory so tests don't need a running HTTP server,
// but the RATE_LIMITS table is the single source of truth from production code.
const fs = require("fs");
const path = require("path");

const socketSrc = fs.readFileSync(
  path.resolve(__dirname, "../../server/socket.cjs"),
  "utf8"
);

// Extract RATE_LIMITS object from source so tests always reflect production values
const match = socketSrc.match(/const RATE_LIMITS\s*=\s*(\{[\s\S]*?\});/);
if (!match) throw new Error("Could not locate RATE_LIMITS in server/socket.cjs");
const RATE_LIMITS = eval(`(${match[1]})`);

function makeRateLimiter() {
  const rateBuckets = new Map();

  function isAllowed(socketId, event) {
    const limits = RATE_LIMITS[event];
    if (!limits) return true;

    if (!rateBuckets.has(socketId)) rateBuckets.set(socketId, {});
    const buckets = rateBuckets.get(socketId);

    const now = Date.now();
    if (!buckets[event]) {
      buckets[event] = { tokens: limits.capacity, lastRefill: now };
    }

    const bucket = buckets[event];
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(limits.capacity, bucket.tokens + elapsed * limits.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  function cleanup(socketId) { rateBuckets.delete(socketId); }

  return { isAllowed, cleanup, rateBuckets };
}

describe("socket rate limiter (production RATE_LIMITS)", () => {
  let limiter;
  beforeEach(() => { limiter = makeRateLimiter(); });

  it("allows events up to capacity", () => {
    for (let i = 0; i < RATE_LIMITS["send-message"].capacity; i++) {
      expect(limiter.isAllowed("s1", "send-message")).toBe(true);
    }
  });

  it("blocks events beyond capacity", () => {
    for (let i = 0; i < RATE_LIMITS["send-message"].capacity; i++) {
      limiter.isAllowed("s1", "send-message");
    }
    expect(limiter.isAllowed("s1", "send-message")).toBe(false);
  });

  it("isolates buckets per socket", () => {
    for (let i = 0; i < RATE_LIMITS["send-message"].capacity; i++) {
      limiter.isAllowed("s1", "send-message");
    }
    expect(limiter.isAllowed("s2", "send-message")).toBe(true);
  });

  it("allows unknown events", () => {
    expect(limiter.isAllowed("s1", "unknown-event")).toBe(true);
  });

  it("cleans up bucket on disconnect", () => {
    limiter.isAllowed("s1", "send-message");
    limiter.cleanup("s1");
    expect(limiter.rateBuckets.has("s1")).toBe(false);
  });

  it("join-room is limited to production capacity", () => {
    const cap = RATE_LIMITS["join-room"].capacity;
    for (let i = 0; i < cap; i++) {
      expect(limiter.isAllowed("s1", "join-room")).toBe(true);
    }
    expect(limiter.isAllowed("s1", "join-room")).toBe(false);
  });
});
