import prisma from "@/lib/db";

const PROBLEM_LIST_SELECT = {
  id: true, title: true, difficulty: true, topic: true,
  description: true, starterCode: true, testCases: true,
  companies: true, estimatedTime: true, isPublic: true,
  usageCount: true, createdById: true,
  tags: { select: { id: true, name: true } },
};

export async function findProblems(where, { skip = 0, take = 50, orderBy } = {}) {
  return prisma.problem.findMany({
    where,
    orderBy: orderBy || [{ difficulty: "asc" }, { title: "asc" }],
    skip,
    take,
    select: PROBLEM_LIST_SELECT,
  });
}

export async function countProblems(where) {
  return prisma.problem.count({ where });
}

export async function findProblemById(id) {
  return prisma.problem.findUnique({
    where: { id },
    include: { tags: true },
  });
}

export async function createProblem(data) {
  const { tags, ...rest } = data;
  return prisma.problem.create({
    data: {
      ...rest,
      ...(tags?.length && {
        tags: {
          connectOrCreate: tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      }),
    },
    include: { tags: true },
  });
}

export async function deleteProblem(id) {
  return prisma.problem.delete({ where: { id } });
}

export async function incrementUsageCount(id) {
  return prisma.problem.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}
