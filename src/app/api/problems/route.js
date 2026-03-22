import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");

    const where = {};
    if (difficulty && difficulty !== "all") where.difficulty = difficulty;
    if (topic && topic !== "all") where.topic = topic;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const problems = await prisma.problem.findMany({
      where,
      orderBy: [{ difficulty: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        difficulty: true,
        topic: true,
        description: true,
        starterCode: true,
        testCases: true,
      },
    });

    // Always strip expected answers from the public problems list.
    // Full test cases (with expected) are only available via the room API
    // to the verified room owner, never through this public endpoint.
    const sanitized = problems.map((p) => ({
      ...p,
      testCases: (p.testCases || []).map(({ input }) => ({ input })),
    }));

    return NextResponse.json({ problems: sanitized }, { status: 200 });
  } catch (error) {
    console.error("[problems] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
  }
}
