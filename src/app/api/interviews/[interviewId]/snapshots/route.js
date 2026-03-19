import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Save a code snapshot
export async function POST(request, { params }) {
  try {
    const { interviewId } = await params;
    const body = await request.json();
    const { code } = body;

    if (!interviewId) {
      return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
    }

    // Verify the interview exists and is in progress
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if (interview.status !== "in_progress") {
      return NextResponse.json({ error: "Interview is not in progress" }, { status: 400 });
    }

    const snapshot = await prisma.codeSnapshot.create({
      data: {
        interviewId,
        code: code || "",
      },
    });

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    console.error("Save snapshot error:", error);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}

// Get all snapshots for an interview
export async function GET(request, { params }) {
  try {
    const { interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
    }

    const snapshots = await prisma.codeSnapshot.findMany({
      where: { interviewId },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ snapshots }, { status: 200 });
  } catch (error) {
    console.error("Get snapshots error:", error);
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  }
}
