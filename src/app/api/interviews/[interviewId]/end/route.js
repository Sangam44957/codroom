import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";

export const POST = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { interview: existingInterview } = await requireInterviewOwner(interviewId);

  if (existingInterview.status === "completed" || existingInterview.status === "evaluated") {
    return NextResponse.json({ error: "Interview already ended" }, { status: 400 });
  }

  const { finalCode, language } = await request.json();

  if (finalCode && Buffer.byteLength(finalCode, "utf8") > 64 * 1024) {
    return NextResponse.json({ error: "Final code exceeds maximum size (64 KB)" }, { status: 413 });
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
    include: { room: true },
  });

  await prisma.room.update({
    where: { id: interview.roomId },
    data: { status: "completed" },
  });

  return NextResponse.json({ interview }, { status: 200 });
});
