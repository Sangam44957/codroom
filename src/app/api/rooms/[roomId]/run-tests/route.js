import { NextResponse } from "next/server";
import { z } from "zod";
import { jwtVerify } from "jose";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { withAuthz } from "@/lib/authz";
import { checkCsrf } from "@/lib/csrf";
import { runTestsForReport } from "@/lib/testRunner";
import { getRoomById } from "@/services/room.service";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "java", "cpp", "c", "go", "rust"];

const bodySchema = z.object({
  code: z.string().min(1, "code is required"),
  language: z.enum(SUPPORTED_LANGUAGES),
  problemIndex: z.number().int().min(0).optional().default(0),
});

export const POST = withAuthz(async (request, { params }) => {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { roomId } = await params;

  const user = await getCurrentUser();
  const room = await getRoomById(roomId);
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

  const actorKey = user?.userId || request.headers.get("x-forwarded-for") || "anon";
  const rl = await rateLimit("run-tests", actorKey, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { code, language, problemIndex } = parsed.data;

  const allProblems = room.problems?.length
    ? room.problems.map((rp) => rp.problem)
    : room.problem ? [room.problem] : [];

  const problem = allProblems[problemIndex] ?? allProblems[0];
  if (!problem?.testCases?.length) {
    return NextResponse.json({ error: "No test cases for this problem" }, { status: 400 });
  }

  const { total, passed, results } = await runTestsForReport(code, language, problem.testCases);

  return NextResponse.json({
    total,
    passed,
    results: results.map(({ passed, actual, error }) => ({ passed, actual, error })),
  });
});
