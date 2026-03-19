import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Start an interview (create interview record)
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, language } = body;

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    // Check if interview already exists for this room
    let interview = await prisma.interview.findUnique({
      where: { roomId },
    });

    if (interview) {
      return NextResponse.json({ interview }, { status: 200 });
    }

    // Create new interview
    interview = await prisma.interview.create({
      data: {
        roomId,
        language: language || "javascript",
        status: "in_progress",
      },
    });

    // Update room status
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "active" },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Create interview error:", error);
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
}
