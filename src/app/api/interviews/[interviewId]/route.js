import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireInterviewOwner, withAuthz } from "@/lib/authz";

export const DELETE = withAuthz(async (request, { params }) => {
  const { interviewId } = await params;
  const { interview } = await requireInterviewOwner(interviewId);

  // Cascade delete all child records, then the interview itself, then reset room
  await prisma.$transaction([
    prisma.codeSnapshot.deleteMany({ where: { interviewId } }),
    prisma.interviewEvent.deleteMany({ where: { interviewId } }),
    prisma.interviewerNote.deleteMany({ where: { interviewId } }),
    prisma.aIReport.deleteMany({ where: { interviewId } }),
    prisma.interview.delete({ where: { id: interviewId } }),
    prisma.room.update({
      where: { id: interview.room.id },
      data: { status: "waiting" },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
});
