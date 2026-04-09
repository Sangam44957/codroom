import prisma from "@/lib/db";

export async function findInterviewById(id) {
  return prisma.interview.findUnique({
    where: { id },
    include: {
      room: {
        include: {
          problem: true,
          problems: { include: { problem: true }, orderBy: { order: "asc" } },
        },
      },
      report: true,
    },
  });
}

export async function findInterviewByRoomId(roomId) {
  return prisma.interview.findUnique({ where: { roomId } });
}

export async function createInterview(data) {
  return prisma.interview.create({ data });
}

export async function updateInterview(id, data) {
  return prisma.interview.update({ where: { id }, data, include: { room: true } });
}

export async function deleteInterviewCascade(interviewId, roomId) {
  return prisma.$transaction([
    prisma.codeSnapshot.deleteMany({ where: { interviewId } }),
    prisma.interviewEvent.deleteMany({ where: { interviewId } }),
    prisma.interviewerNote.deleteMany({ where: { interviewId } }),
    prisma.aIReport.deleteMany({ where: { interviewId } }),
    prisma.interview.delete({ where: { id: interviewId } }),
    prisma.room.update({ where: { id: roomId }, data: { status: "waiting" } }),
  ]);
}

export async function createSnapshot(data) {
  return prisma.codeSnapshot.create({ data });
}

export async function findSnapshotsPaginated(interviewId, { cursor, limit }) {
  return prisma.codeSnapshot.findMany({
    where: { interviewId },
    orderBy: { timestamp: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function createEvent(data) {
  return prisma.interviewEvent.create({ data });
}

export async function findEventsPaginated(interviewId, { cursor, limit }) {
  return prisma.interviewEvent.findMany({
    where: { interviewId },
    orderBy: { timestamp: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function findNoteByInterview(interviewId) {
  return prisma.interviewerNote.findFirst({
    where: { interviewId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertNote(interviewId, content) {
  const existing = await prisma.interviewerNote.findFirst({
    where: { interviewId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return prisma.interviewerNote.update({
      where: { id: existing.id },
      data: { content },
    });
  }
  if (!content) return null;
  return prisma.interviewerNote.create({ data: { content, interviewId } });
}

export async function findReport(interviewId) {
  return prisma.aIReport.findUnique({ where: { interviewId } });
}

export async function createReport(data) {
  return prisma.aIReport.create({ data });
}

export async function updateReport(interviewId, data) {
  return prisma.aIReport.update({ where: { interviewId }, data });
}
