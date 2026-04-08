import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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
        id: true, title: true, difficulty: true, topic: true,
        description: true, starterCode: true, testCases: true, createdById: true,
      },
    });

    const sanitized = problems.map((p) => ({
      ...p,
      testCases: (p.testCases || []).map(({ input }) => ({ input })),
      isOwn: p.createdById === user.userId,
    }));

    return NextResponse.json({ problems: sanitized }, { status: 200 });
  } catch (error) {
    console.error("[problems] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { title, description, difficulty, topic, starterCode, testCases } = await request.json();

    if (!title?.trim() || !description?.trim() || !difficulty || !topic?.trim()) {
      return NextResponse.json({ error: "title, description, difficulty and topic are required" }, { status: 400 });
    }
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    const problem = await prisma.problem.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        topic: topic.trim(),
        starterCode: starterCode?.trim() || null,
        testCases: testCases || [],
        createdById: user.userId,
      },
    });

    return NextResponse.json({ problem }, { status: 201 });
  } catch (error) {
    console.error("[problems] POST error:", error);
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (problem.createdById !== user.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.problem.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[problems] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete problem" }, { status: 500 });
  }
}
