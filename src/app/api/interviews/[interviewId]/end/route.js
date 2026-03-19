import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { interviewId } = await params;
    const body = await request.json();
    const { finalCode, language } = body;

    if (!interviewId) {
      return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
    }

    const existingInterview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!existingInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if (existingInterview.status === "completed") {
      return NextResponse.json({ error: "Interview already ended" }, { status: 400 });
    }

    const endedAt = new Date();
    const duration = Math.floor(
      (endedAt.getTime() - new Date(existingInterview.startedAt).getTime()) / 1000
    );

    const interview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        finalCode: finalCode || "",
        language: language || existingInterview.language,
        status: "completed",
        endedAt,
        duration,
      },
      include: {
        room: true,
      },
    });

    await prisma.room.update({
      where: { id: interview.roomId },
      data: { status: "completed" },
    });

    return NextResponse.json({ interview }, { status: 200 });
  } catch (error) {
    console.error("End interview error:", error);
    return NextResponse.json({ error: "Failed to end interview" }, { status: 500 });
  }
}
