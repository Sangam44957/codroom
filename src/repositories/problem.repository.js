import prisma from "@/lib/db";

export async function findProblems(where) {
  return prisma.problem.findMany({
    where,
    orderBy: [{ difficulty: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, difficulty: true, topic: true,
      description: true, starterCode: true, testCases: true, createdById: true,
    },
  });
}

export async function findProblemById(id) {
  return prisma.problem.findUnique({ where: { id } });
}

export async function createProblem(data) {
  return prisma.problem.create({ data });
}

export async function deleteProblem(id) {
  return prisma.problem.delete({ where: { id } });
}
