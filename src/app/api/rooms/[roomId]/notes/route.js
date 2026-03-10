import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { roomId } = await params;
    const body = await request.json();
    const { content } = body;

    // Find or create interview for this room
    let interview = await prisma.interview.findUnique({
      where: { roomId },
    });

    if (!interview) {
      interview = await prisma.interview.create({
        data: {
          roomId,
          language: "javascript",
        },
      });
    }

    // Create note
    const note = await prisma.interviewerNote.create({
      data: {
        content,
        interviewId: interview.id,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Save note error:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}