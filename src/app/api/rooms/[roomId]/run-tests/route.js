import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { runTestsForReport } from "@/lib/testRunner";
import { rateLimit } from "@/lib/rateLimit";
import { withAuthz } from "@/lib/authz";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Candidate-safe test runner: executes tests server-side and returns
// pass/fail + actual output — never leaks expected values to the client.
export const POST = withAuthz(async (request, { params }) => {
  const { roomId } = await params;

  // Auth: room owner OR valid room-session ticket
  const user = await getCurrentUser();
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      problem: true,
      problems: { include: { problem: true }, orderBy: { order: "asc" } },
    },
  });

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isOwner = user && room.createdById === user.userId;
  if (!isOwner) {
    const ticketCookie = request.cookies.get(`room-ticket-${roomId}`)?.value;
    if (!ticketCookie) return NextResponse.json({ error: "No room access ticket" }, { status: 403 });
    try {
      const { payload } = await jwtVerify(ticketCookie, SECRET);
      if (payload.roomId !== roomId || payload.type !== "room-session") throw new Error();
    } catch {
      return NextResponse.json({ error: "Invalid or expired room ticket" }, { status: 403 });
    }
  }

  // Rate-limit by roomId (shared across all participants in the room)
  const rl = await rateLimit("run-tests", roomId, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { code, language, problemIndex = 0 } = await request.json();
  if (!code?.trim() || !language) {
    return NextResponse.json({ error: "code and language are required" }, { status: 400 });
  }

  const allProblems = room.problems?.length
    ? room.problems.map((rp) => rp.problem)
    : room.problem ? [room.problem] : [];

  const problem = allProblems[problemIndex] ?? allProblems[0];
  if (!problem?.testCases?.length) {
    return NextResponse.json({ error: "No test cases for this problem" }, { status: 400 });
  }

  const { total, passed, results } = await runTestsForReport(code, language, problem.testCases);

  // Strip expected from results before sending to client
  return NextResponse.json({
    total,
    passed,
    results: results.map(({ passed, actual, error }) => ({ passed, actual, error })),
  });
});
