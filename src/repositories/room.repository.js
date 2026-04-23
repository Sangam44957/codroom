import prisma from "@/lib/db";

export async function findRoomById(id) {
  return prisma.room.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      problem: true,
      problems: { include: { problem: true }, orderBy: { order: "asc" } },
      interview: { include: { report: true } },
      template: { select: { id: true, name: true, durationMinutes: true } },
    },
  });
}

export async function findRoomByIdSelect(id, select) {
  return prisma.room.findUnique({ where: { id }, select });
}

export async function findRoomsByUser(userId, { skip, take }) {
  return Promise.all([
    prisma.room.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        title: true,
        status: true,
        language: true,
        candidateName: true,
        joinToken: true,
        createdAt: true,
        problem: { select: { id: true, title: true, difficulty: true } },
        problems: {
          orderBy: { order: "asc" },
          select: { order: true, problem: { select: { id: true, title: true, difficulty: true } } },
        },
        interview: {
          select: {
            id: true, status: true, duration: true,
            report: { select: { id: true } },
          },
        },
      },
    }),
    prisma.room.count({ where: { createdById: userId } }),
  ]);
}

export async function createRoom(data) {
  return prisma.room.create({
    data,
    include: {
      problem: true,
      problems: { include: { problem: true }, orderBy: { order: "asc" } },
    },
  });
}

export async function updateRoom(id, data) {
  return prisma.room.update({ where: { id }, data });
}

export async function deleteRoomCascade(roomId, interviewId) {
  return prisma.$transaction(async (tx) => {
    if (interviewId) {
      await tx.codeSnapshot.deleteMany({ where: { interviewId } });
      await tx.interviewEvent.deleteMany({ where: { interviewId } });
      await tx.interviewerNote.deleteMany({ where: { interviewId } });
      await tx.aIReport.deleteMany({ where: { interviewId } });
      await tx.interview.delete({ where: { id: interviewId } });
    }
    await tx.chatMessage.deleteMany({ where: { roomId } });
    await tx.roomProblem.deleteMany({ where: { roomId } });
    await tx.room.delete({ where: { id: roomId } });
  });
}

export async function findMessagesByRoom(roomId, limit) {
  return prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { timestamp: "asc" },
    take: limit,
  });
}

export async function createMessage(data) {
  return prisma.chatMessage.create({ data });
}
