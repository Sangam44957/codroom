import {
  findProblems,
  findProblemById,
  createProblem,
  deleteProblem,
} from "@/repositories/problem.repository";

export async function listProblems({ difficulty, topic, search }, userId) {
  const where = {};
  if (difficulty && difficulty !== "all") where.difficulty = difficulty;
  if (topic && topic !== "all") where.topic = topic;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const problems = await findProblems(where);
  return problems.map((p) => ({
    ...p,
    testCases: (p.testCases || []).map(({ input }) => ({ input })),
    isOwn: p.createdById === userId,
  }));
}

export async function createNewProblem({ title, description, difficulty, topic, starterCode, testCases }, userId) {
  if (!title?.trim() || !description?.trim() || !difficulty || !topic?.trim()) {
    return { error: "title, description, difficulty and topic are required", status: 400 };
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return { error: "Invalid difficulty", status: 400 };
  }
  const problem = await createProblem({
    title: title.trim(),
    description: description.trim(),
    difficulty,
    topic: topic.trim(),
    starterCode: starterCode?.trim() || null,
    testCases: testCases || [],
    createdById: userId,
  });
  return { problem };
}

export async function removeProblem(id, userId) {
  const problem = await findProblemById(id);
  if (!problem) return { error: "Not found", status: 404 };
  if (problem.createdById !== userId) return { error: "Access denied", status: 403 };
  await deleteProblem(id);
  return { ok: true };
}
