import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// CREATE a new room
export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, candidateName, language } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Room title is required" },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        title,
        candidateName: candidateName || null,
        language: language || "javascript",
        createdById: user.userId,
      },
    });

    return NextResponse.json(
      { message: "Room created", room },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// GET all rooms for the logged-in user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const rooms = await prisma.room.findMany({
      where: { createdById: user.userId },
      orderBy: { createdAt: "desc" },
      include: {
        interview: {
          include: {
            report: true,
          },
        },
      },
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error("Get rooms error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}