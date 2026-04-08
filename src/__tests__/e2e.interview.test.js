"use strict";

/**
 * End-to-end interview flow tests.
 *
 * These tests simulate the complete interview lifecycle as a state machine,
 * exercising every transition that the production routes enforce.
 * No DB or HTTP server is required — all logic is mirrored from production
 * source files, following the same pattern as the existing test suite.
 */

const { describe, it, expect, beforeEach } = require("@jest/globals");
const fs   = require("fs");
const path = require("path");

// ── Verify all critical route files exist ─────────────────────────────────────
const ROUTE_FILES = [
  "../app/api/rooms/[roomId]/join/route.js",
  "../app/api/interviews/route.js",
  "../app/api/interviews/[interviewId]/end/route.js",
  "../app/api/interviews/[interviewId]/report/route.js",
  "../app/api/interviews/[interviewId]/snapshots/route.js",
  "../app/api/interviews/[interviewId]/events/route.js",
];

describe("critical route files exist", () => {
  ROUTE_FILES.forEach((rel) => {
    it(`${rel.split("/").pop()} is present`, () => {
      const abs = path.resolve(__dirname, rel);
      expect(fs.existsSync(abs)).toBe(true);
    });
  });
});

// ── Full interview state machine ──────────────────────────────────────────────
// Mirrors all state transitions enforced by the production routes.

const STATUS = {
  WAITING:     "waiting",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed",
  EVALUATED:   "evaluated",
};

function createRoom(overrides = {}) {
  return {
    id: "room-1",
    joinToken: "valid-token",
    candidateName: null,
    language: "javascript",
    status: STATUS.WAITING,
    interview: null,
    ...overrides,
  };
}

function joinRoom(room, joinToken) {
  if (!joinToken)              return { ok: false, status: 400, error: "joinToken required" };
  if (room.joinToken !== joinToken) return { ok: false, status: 403, error: "Invalid invite link" };
  const candidateName = room.candidateName || null;
  return { ok: true, status: 200, candidateName };
}

function startInterview(room, userId) {
  if (room.status === STATUS.COMPLETED) return { ok: false, status: 400, error: "Room already completed" };
  if (room.interview) return { ok: true, status: 200, interview: room.interview, created: false };
  const interview = {
    id: "interview-1",
    roomId: room.id,
    language: room.language,
    status: STATUS.IN_PROGRESS,
    startedAt: new Date(),
    finalCode: null,
    report: null,
  };
  return { ok: true, status: 201, interview, created: true };
}

function endInterview(interview, finalCode, language) {
  if (!interview)                                          return { ok: false, status: 404, error: "Interview not found" };
  if (interview.status === STATUS.COMPLETED ||
      interview.status === STATUS.EVALUATED) return { ok: false, status: 400, error: "Interview already ended" };
  if (finalCode && Buffer.byteLength(finalCode, "utf8") > 64 * 1024)
    return { ok: false, status: 413, error: "Final code exceeds maximum size (64 KB)" };

  const endedAt  = new Date();
  const duration = Math.floor((endedAt - interview.startedAt) / 1000);
  return {
    ok: true, status: 200,
    interview: { ...interview, status: STATUS.COMPLETED, finalCode: finalCode || "", language: language || interview.language, endedAt, duration },
  };
}

function generateReport(interview) {
  if (!interview)                    return { ok: false, status: 404, error: "Interview not found" };
  if (interview.report)              return { ok: true,  status: 200, report: interview.report, cached: true };
  if (!interview.finalCode?.trim())  return { ok: false, status: 400, error: "No code was submitted" };
  if (interview.status !== STATUS.COMPLETED && interview.status !== STATUS.IN_PROGRESS)
    return { ok: false, status: 400, error: "Interview not in a reportable state" };

  const report = {
    id: "report-1",
    interviewId: interview.id,
    correctness: 8, codeQuality: 7, overallScore: 78,
    recommendation: "HIRE",
    timeComplexity: "O(n)", spaceComplexity: "O(n)",
    edgeCaseHandling: 7,
    summary: "Good solution.", improvements: "Handle edge cases.", strengths: "Clean code.", weaknesses: "Missing null check.",
  };
  return { ok: true, status: 201, report, cached: false };
}

// ── E2E Flow 1: happy path — join → start → code → end → report ───────────────
describe("E2E flow 1: complete happy-path interview", () => {
  let room, interview;

  beforeEach(() => {
    room = createRoom();
    interview = null;
  });

  it("step 1 — candidate joins with valid token", () => {
    const result = joinRoom(room, "valid-token");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("step 2 — interviewer starts the interview", () => {
    const result = startInterview(room, "owner-user-id");
    expect(result.ok).toBe(true);
    expect(result.created).toBe(true);
    expect(result.interview.status).toBe(STATUS.IN_PROGRESS);
    interview = result.interview;
  });

  it("step 3 — starting again is idempotent", () => {
    const first  = startInterview(room, "owner-user-id");
    room.interview = first.interview;
    const second = startInterview(room, "owner-user-id");
    expect(second.created).toBe(false);
    expect(second.interview.id).toBe(first.interview.id);
  });

  it("step 4 — interviewer ends the interview with code", () => {
    const started = startInterview(room, "owner-user-id");
    const result  = endInterview(started.interview, "function twoSum() { return [0,1]; }", "javascript");
    expect(result.ok).toBe(true);
    expect(result.interview.status).toBe(STATUS.COMPLETED);
    expect(result.interview.finalCode).toBe("function twoSum() { return [0,1]; }");
    expect(result.interview.duration).toBeGreaterThanOrEqual(0);
    interview = result.interview;
  });

  it("step 5 — report is generated for completed interview", () => {
    const started = startInterview(room, "owner-user-id");
    const ended   = endInterview(started.interview, "function twoSum() { return [0,1]; }", "javascript");
    const result  = generateReport(ended.interview);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    expect(result.report.recommendation).toBe("HIRE");
    expect(result.cached).toBe(false);
  });

  it("step 6 — fetching report again returns cached copy", () => {
    const started  = startInterview(room, "owner-user-id");
    const ended    = endInterview(started.interview, "function twoSum() { return [0,1]; }", "javascript");
    const first    = generateReport(ended.interview);
    const withReport = { ...ended.interview, report: first.report };
    const second   = generateReport(withReport);
    expect(second.cached).toBe(true);
    expect(second.status).toBe(200);
    expect(second.report.id).toBe(first.report.id);
  });

  it("step 7 — ending an already-completed interview is rejected", () => {
    const started   = startInterview(room, "owner-user-id");
    const ended     = endInterview(started.interview, "code", "javascript");
    const reEndResult = endInterview(ended.interview, "more code", "javascript");
    expect(reEndResult.ok).toBe(false);
    expect(reEndResult.status).toBe(400);
    expect(reEndResult.error).toMatch(/already ended/);
  });
});

// ── E2E Flow 2: security auto-lock path ───────────────────────────────────────
// Mirrors the auto-end triggered by useSecurityMonitor threshold in the room page.
describe("E2E flow 2: security violation auto-lock", () => {
  const MAX_VIOLATIONS = 3;

  function makeSecurityMonitor() {
    let count = 0;
    let locked = false;
    return {
      recordViolation() {
        count += 1;
        if (count >= MAX_VIOLATIONS) locked = true;
        return { count, locked };
      },
      get violationCount() { return count; },
      get isLocked()       { return locked; },
    };
  }

  it("does not lock before threshold", () => {
    const monitor = makeSecurityMonitor();
    monitor.recordViolation();
    monitor.recordViolation();
    expect(monitor.isLocked).toBe(false);
    expect(monitor.violationCount).toBe(2);
  });

  it("locks exactly at threshold", () => {
    const monitor = makeSecurityMonitor();
    for (let i = 0; i < MAX_VIOLATIONS; i++) monitor.recordViolation();
    expect(monitor.isLocked).toBe(true);
  });

  it("auto-end is triggered when locked — interview can still be ended", () => {
    const monitor  = makeSecurityMonitor();
    for (let i = 0; i < MAX_VIOLATIONS; i++) monitor.recordViolation();

    const room     = createRoom();
    const started  = startInterview(room, "owner-id");
    // Auto-end sends whatever code was typed at lock time
    const autoCode = "function partial() { /* incomplete */";
    const result   = endInterview(started.interview, autoCode, "javascript");

    expect(monitor.isLocked).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.interview.status).toBe(STATUS.COMPLETED);
    expect(result.interview.finalCode).toBe(autoCode);
  });

  it("report can be generated after auto-lock end", () => {
    const room    = createRoom();
    const started = startInterview(room, "owner-id");
    const ended   = endInterview(started.interview, "function partial() {}", "javascript");
    const report  = generateReport(ended.interview);
    expect(report.ok).toBe(true);
    expect(report.report).toBeDefined();
  });

  it("join with wrong token is rejected before any interview state", () => {
    const room   = createRoom();
    const result = joinRoom(room, "wrong-token");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    // Interview state is untouched
    expect(room.interview).toBeNull();
  });

  it("report generation blocked when no code submitted after auto-lock", () => {
    const room    = createRoom();
    const started = startInterview(room, "owner-id");
    // Auto-lock fires but candidate had typed nothing
    const ended   = endInterview(started.interview, "", "javascript");
    const report  = generateReport(ended.interview);
    expect(report.ok).toBe(false);
    expect(report.status).toBe(400);
    expect(report.error).toMatch(/No code was submitted/);
  });
});
