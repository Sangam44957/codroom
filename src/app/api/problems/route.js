import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");

    // Build filter
    const where = {};

    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }

    if (topic && topic !== "all") {
      where.topic = topic;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: [
        { difficulty: "asc" },
        { title: "asc" },
      ],
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

    return NextResponse.json({ problems }, { status: 200 });
  } catch (error) {
    console.error("Get problems error:", error);
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 }
    );
  }
}