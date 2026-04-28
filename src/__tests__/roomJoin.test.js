"use strict";

const { describe, it, expect, beforeEach } = require("@jest/globals");

// ── Mock next/server so NextResponse works outside the Next.js runtime ────────
jest.mock("next/server", () => {
  const { NextResponse } = jest.requireActual("next/server");
  return { NextResponse };
});

// ── Mock next/headers (used by getCurrentUser inside withAuthz) ───────────────
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn().mockReturnValue(null) }),
}));

// ── Mock validateEnv so it doesn't throw on missing prod vars ─────────────────
jest.mock("@/lib/env", () => ({ validateEnv: jest.fn() }));

// ── Mock the service layer — tests control what the DB "returns" ──────────────
jest.mock("@/services/room.service", () => ({
  validateJoinToken: jest.fn(),
  getRoomById: jest.fn(),
}));

const { validateJoinToken } = require("@/services/room.service");
let joinRoom;
beforeAll(async () => {
  const module = await import("@/app/api/rooms/[roomId]/join/route");
  joinRoom = module.POST;
});

// ── Minimal Request factory ───────────────────────────────────────────────────
function makeRequest(body) {
  return {
    json: () => Promise.resolve(body),
    cookies: { get: () => null },
    headers: { get: () => null },
  };
}

const ROOM_ID = "room-abc-123";
const VALID_TOKEN = "valid-token-abc123";

describe("POST /api/rooms/[roomId]/join — behavioral", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 and sets HttpOnly room-ticket cookie on valid token", async () => {
    validateJoinToken.mockResolvedValue({ id: ROOM_ID, joinToken: VALID_TOKEN, candidateName: null });

    const res = await joinRoom(makeRequest({ joinToken: VALID_TOKEN }), { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const cookie = res.cookies.get(`room-ticket-${ROOM_ID}`);
    expect(cookie).toBeDefined();
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.path).toBe("/");
  });

  it("embeds candidateName from room record into the ticket cookie value", async () => {
    validateJoinToken.mockResolvedValue({ id: ROOM_ID, joinToken: VALID_TOKEN, candidateName: "Alice" });

    const res = await joinRoom(makeRequest({ joinToken: VALID_TOKEN }), { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidateName).toBe("Alice");
  });

  it("falls back to submitted candidateName when room has none", async () => {
    validateJoinToken.mockResolvedValue({ id: ROOM_ID, joinToken: VALID_TOKEN, candidateName: null });

    const res = await joinRoom(makeRequest({ joinToken: VALID_TOKEN, candidateName: "Bob" }), { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(200);
    expect((await res.json()).candidateName).toBe("Bob");
  });

  it("returns 400 when joinToken is missing from request body", async () => {
    const res = await joinRoom(makeRequest({}), { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(400);
    expect(validateJoinToken).not.toHaveBeenCalled();
  });

  it("returns 403 when joinToken does not match the room", async () => {
    validateJoinToken.mockResolvedValue(null);

    const res = await joinRoom(makeRequest({ joinToken: "wrong-token" }), { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(403);
  });

  it("returns 403 when room does not exist", async () => {
    validateJoinToken.mockResolvedValue(null);

    const res = await joinRoom(makeRequest({ joinToken: VALID_TOKEN }), { params: Promise.resolve({ roomId: "non-existent-id" }) });

    expect(res.status).toBe(403);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const badReq = { json: () => Promise.reject(new SyntaxError("bad json")), cookies: { get: () => null } };

    const res = await joinRoom(badReq, { params: Promise.resolve({ roomId: ROOM_ID }) });

    expect(res.status).toBe(400);
  });
});

// ── Candidate name resolution (pure logic — no mocks needed) ─────────────────
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

// ── Problem sanitisation (pure logic — no mocks needed) ──────────────────────
function sanitizeProblem(p) {
  if (!p) return null;
  return { ...p, testCases: (p.testCases || []).map(({ input }) => ({ input })) };
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
    sanitizeProblem(problem).testCases.forEach((tc) => {
      expect(tc).toHaveProperty("input");
      expect(tc).not.toHaveProperty("expected");
    });
  });

  it("preserves input values exactly", () => {
    const problem = { id: "p1", title: "T", testCases: [{ input: "hello", expected: "world" }] };
    expect(sanitizeProblem(problem).testCases[0].input).toBe("hello");
  });

  it("handles problem with no test cases", () => {
    expect(sanitizeProblem({ id: "p1", title: "T", testCases: [] }).testCases).toHaveLength(0);
  });

  it("handles null problem", () => {
    expect(sanitizeProblem(null)).toBeNull();
  });

  it("handles problem with null testCases", () => {
    expect(sanitizeProblem({ id: "p1", title: "T", testCases: null }).testCases).toHaveLength(0);
  });
});
