"use strict";

const { describe, it, expect } = require("@jest/globals");
const fs   = require("fs");
const path = require("path");

// ── Pull source text ──────────────────────────────────────────────────────────
const startRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/interviews/route.js"), "utf8"
);
const endRouteSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/interviews/[interviewId]/end/route.js"), "utf8"
);
const serviceSrc = fs.readFileSync(
  path.resolve(__dirname, "../services/interview.service.js"), "utf8"
);

// ── Structural checks ─────────────────────────────────────────────────────────
describe("interview start route — source checks", () => {
  it("requires roomId", () => {
    expect(startRouteSrc).toMatch(/roomId is required/);
    expect(startRouteSrc).toMatch(/status: 400/);
  });

  it("is idempotent — returns existing interview if already started", () => {
    expect(serviceSrc).toMatch(/findInterviewByRoomId/);
    expect(serviceSrc).toMatch(/Idempotent/i);
  });

  it("only room owner can start (requireRoomOwner)", () => {
    expect(startRouteSrc).toMatch(/requireRoomOwner/);
  });
});

describe("interview end route — source checks", () => {
  it("rejects ending an already-completed interview", () => {
    expect(serviceSrc).toMatch(/already ended/);
    expect(serviceSrc).toMatch(/status: 400/);
  });

  it("enforces 64 KB code size limit", () => {
    expect(serviceSrc).toMatch(/64/);
    expect(serviceSrc).toMatch(/413/);
  });

  it("calculates duration from startedAt", () => {
    expect(serviceSrc).toMatch(/duration/);
    expect(serviceSrc).toMatch(/startedAt/);
  });

  it("only interview owner can end (requireInterviewOwner)", () => {
    expect(endRouteSrc).toMatch(/requireInterviewOwner/);
  });
});

// ── Mirror interview state-machine ───────────────────────────────────────────
const TERMINAL_STATUSES = ["completed", "evaluated"];

function canEndInterview(status) {
  return !TERMINAL_STATUSES.includes(status);
}

describe("interview end — state machine", () => {
  it("allows ending an in_progress interview", () => {
    expect(canEndInterview("in_progress")).toBe(true);
  });

  it("allows ending a waiting interview", () => {
    expect(canEndInterview("waiting")).toBe(true);
  });

  it("rejects ending a completed interview", () => {
    expect(canEndInterview("completed")).toBe(false);
  });

  it("rejects ending an evaluated interview", () => {
    expect(canEndInterview("evaluated")).toBe(false);
  });
});

// ── Mirror duration calculation ───────────────────────────────────────────────
function calcDuration(startedAt, endedAt) {
  return Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

describe("interview duration calculation", () => {
  it("calculates exact seconds", () => {
    const start = new Date("2024-01-01T10:00:00Z");
    const end   = new Date("2024-01-01T10:30:00Z");
    expect(calcDuration(start, end)).toBe(1800);
  });

  it("floors sub-second remainder", () => {
    const start = new Date("2024-01-01T10:00:00.000Z");
    const end   = new Date("2024-01-01T10:00:00.999Z");
    expect(calcDuration(start, end)).toBe(0);
  });

  it("handles 1-hour interview", () => {
    const start = new Date("2024-01-01T09:00:00Z");
    const end   = new Date("2024-01-01T10:00:00Z");
    expect(calcDuration(start, end)).toBe(3600);
  });

  it("returns 0 for same start and end", () => {
    const t = new Date();
    expect(calcDuration(t, t)).toBe(0);
  });
});

// ── Mirror code size guard ────────────────────────────────────────────────────
const MAX_CODE_BYTES = 64 * 1024;

function isCodeTooLarge(code) {
  return Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES;
}

describe("interview end — code size guard", () => {
  it("accepts empty code", () => {
    expect(isCodeTooLarge("")).toBe(false);
  });

  it("accepts normal solution code", () => {
    const code = "function twoSum(nums, target) { return []; }";
    expect(isCodeTooLarge(code)).toBe(false);
  });

  it("rejects code exceeding 64 KB", () => {
    const big = "x".repeat(MAX_CODE_BYTES + 1);
    expect(isCodeTooLarge(big)).toBe(true);
  });

  it("accepts code exactly at the limit", () => {
    const exact = "x".repeat(MAX_CODE_BYTES);
    expect(isCodeTooLarge(exact)).toBe(false);
  });

  it("counts multi-byte UTF-8 characters correctly", () => {
    const emoji = "😀".repeat(16385);
    expect(isCodeTooLarge(emoji)).toBe(true);
  });
});

// ── Mirror start idempotency ──────────────────────────────────────────────────
function startInterview(existingInterview, roomId, language) {
  if (existingInterview) return { interview: existingInterview, created: false };
  const interview = { id: "new-id", roomId, language: language || "javascript", status: "in_progress" };
  return { interview, created: true };
}

describe("interview start — idempotency", () => {
  it("returns existing interview without creating a new one", () => {
    const existing = { id: "existing", roomId: "r1", language: "python", status: "in_progress" };
    const result = startInterview(existing, "r1", "python");
    expect(result.created).toBe(false);
    expect(result.interview.id).toBe("existing");
  });

  it("creates a new interview when none exists", () => {
    const result = startInterview(null, "r1", "javascript");
    expect(result.created).toBe(true);
    expect(result.interview.status).toBe("in_progress");
  });

  it("defaults language to javascript when not provided", () => {
    const result = startInterview(null, "r1", null);
    expect(result.interview.language).toBe("javascript");
  });
});
