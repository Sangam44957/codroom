import prisma from "@/lib/db";

export async function findRoomById(id) {
  return prisma.room.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      problem: true,
      problems: { include: { problem: true }, orderBy: { order: "asc" } },
      interview: { include: { report: true } },
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
  const ops = [];
  if (interviewId) {
    ops.push(
      prisma.codeSnapshot.deleteMany({ where: { interviewId } }),
      prisma.interviewEvent.deleteMany({ where: { interviewId } }),
      prisma.interviewerNote.deleteMany({ where: { interviewId } }),
      prisma.aIReport.deleteMany({ where: { interviewId } }),
      prisma.interview.delete({ where: { id: interviewId } }),
    );
  }
  ops.push(
    prisma.chatMessage.deleteMany({ where: { roomId } }),
    prisma.roomProblem.deleteMany({ where: { roomId } }),
    prisma.room.delete({ where: { id: roomId } }),
  );
  return prisma.$transaction(ops);
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
