import prisma from "@/lib/db";

export async function findPipelinesByUser(userId) {
  return prisma.hiringPipeline.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { id: true, name: true } },
      _count: { select: { rooms: true } },
    },
  });
}

export async function findPipelineById(id, userId) {
  return prisma.hiringPipeline.findFirst({
    where: { id, createdById: userId },
    include: {
      template: { select: { id: true, name: true, durationMinutes: true, problemIds: true } },
    },
  });
}

export async function findPipelineWithRooms(id, userId) {
  return prisma.hiringPipeline.findFirst({
    where: { id, createdById: userId },
    include: {
      template: { select: { name: true, durationMinutes: true, problemIds: true } },
      rooms: {
        include: {
          interview: {
            where: { status: { in: ["completed", "evaluated"] } },
            include: {
              report: true,
              snapshots: { orderBy: { timestamp: "asc" }, select: { timestamp: true, code: true } },
              events: {
                where: { type: { in: ["test-run", "code-execution"] } },
                select: { type: true, label: true, timestamp: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function createPipeline(data) {
  return prisma.hiringPipeline.create({ data });
}

export async function updatePipeline(id, userId, data) {
  return prisma.hiringPipeline.updateMany({ where: { id, createdById: userId }, data });
}

export async function deletePipeline(id, userId) {
  // Detach rooms first, then delete
  await prisma.room.updateMany({ where: { pipelineId: id }, data: { pipelineId: null } });
  return prisma.hiringPipeline.deleteMany({ where: { id, createdById: userId } });
}
