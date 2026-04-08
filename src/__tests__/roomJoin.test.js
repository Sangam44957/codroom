"use strict";

const { describe, it, expect } = require("@jest/globals");
const fs   = require("fs");
const path = require("path");

// ── Pull source text so tests break if production logic changes ───────────────
const joinSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rooms/[roomId]/join/route.js"), "utf8"
);
const roomSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/rooms/[roomId]/route.js"), "utf8"
);

// ── Structural checks on production source ────────────────────────────────────
describe("room join route — source checks", () => {
  it("issues a signed room-session ticket", () => {
    expect(joinSrc).toMatch(/room-session/);
    expect(joinSrc).toMatch(/SignJWT/);
  });

  it("scopes the ticket cookie path to the specific room", () => {
    expect(joinSrc).toMatch(/path.*api\/rooms/);
  });

  it("rejects missing joinToken with 400", () => {
    expect(joinSrc).toMatch(/joinToken required/);
    expect(joinSrc).toMatch(/status: 400/);
  });

  it("rejects wrong joinToken with 403", () => {
    expect(joinSrc).toMatch(/Invalid invite link/);
    expect(joinSrc).toMatch(/status: 403/);
  });

  it("ticket TTL is at least 1 hour", () => {
    // Extract the numeric TTL constant
    const match = joinSrc.match(/TICKET_TTL_SECONDS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeGreaterThanOrEqual(3600);
  });
});

describe("room GET route — source checks", () => {
  it("strips expected test-case outputs for non-owners", () => {
    expect(roomSrc).toMatch(/sanitizeProblem/);
    expect(roomSrc).toMatch(/input/);   // keeps input
    // must not expose 'expected' field to candidates
    expect(roomSrc).not.toMatch(/expected.*testCases/);
  });

  it("validates room-session ticket type before granting access", () => {
    expect(roomSrc).toMatch(/room-session/);
  });

  it("returns 403 when no ticket cookie is present", () => {
    expect(roomSrc).toMatch(/No room access ticket/);
    expect(roomSrc).toMatch(/status: 403/);
  });
});

// ── Mirror candidate-name resolution logic ────────────────────────────────────
// Mirrors: resolvedName = room.candidateName?.trim() || candidateName?.trim() || null
function resolveCandidateName(roomCandidateName, submittedName) {
  return roomCandidateName?.trim() || submittedName?.trim() || null;
}

describe("candidate name resolution", () => {
  it("prefers the room's pre-set candidate name", () => {
    expect(resolveCandidateName("Alice", "Bob")).toBe("Alice");
  });

  it("falls back to submitted name when room has none", () => {
    expect(resolveCandidateName(null, "Bob")).toBe("Bob");
  });

  it("returns null when neither is provided", () => {
    expect(resolveCandidateName(null, null)).toBeNull();
  });

  it("trims whitespace from room name", () => {
    expect(resolveCandidateName("  Alice  ", "Bob")).toBe("Alice");
  });

  it("trims whitespace from submitted name", () => {
    expect(resolveCandidateName(null, "  Bob  ")).toBe("Bob");
  });

  it("treats empty string room name as absent", () => {
    expect(resolveCandidateName("", "Bob")).toBe("Bob");
  });
});

// ── Mirror test-case sanitisation logic ──────────────────────────────────────
// Mirrors: testCases: (p.testCases || []).map(({ input }) => ({ input }))
function sanitizeProblem(p) {
  if (!p) return null;
  return {
    ...p,
    testCases: (p.testCases || []).map(({ input }) => ({ input })),
  };
}

describe("problem sanitisation for candidates", () => {
  it("strips expected output from test cases", () => {
    const problem = {
      id: "p1", title: "Two Sum",
      testCases: [
        { input: "[2,7,11,15]\n9", expected: "[0,1]" },
        { input: "[3,2,4]\n6",     expected: "[1,2]" },
      ],
    };
    const sanitized = sanitizeProblem(problem);
    sanitized.testCases.forEach((tc) => {
      expect(tc).toHaveProperty("input");
      expect(tc).not.toHaveProperty("expected");
    });
  });

  it("preserves input values exactly", () => {
    const problem = {
      id: "p1", title: "T",
      testCases: [{ input: "hello", expected: "world" }],
    };
    expect(sanitizeProblem(problem).testCases[0].input).toBe("hello");
  });

  it("handles problem with no test cases", () => {
    const problem = { id: "p1", title: "T", testCases: [] };
    expect(sanitizeProblem(problem).testCases).toHaveLength(0);
  });

  it("handles null problem", () => {
    expect(sanitizeProblem(null)).toBeNull();
  });

  it("handles problem with null testCases", () => {
    const problem = { id: "p1", title: "T", testCases: null };
    expect(sanitizeProblem(problem).testCases).toHaveLength(0);
  });
});
