import {
  findProblems,
  countProblems,
  findProblemById,
  createProblem,
  deleteProblem,
} from "@/repositories/problem.repository";
import { assertEnum, DIFFICULTY } from "@/lib/enums";

const PAGE_LIMIT = 20;

export async function listProblems({ difficulty, topic, search, company, tag, isPublic, page = 1 }, userId) {
  const where = {
    OR: [
      { createdById: userId },
      { isPublic: true },
      { createdById: null },
    ],
  };

  if (difficulty && difficulty !== "all") where.difficulty = difficulty;
  if (topic && topic !== "all") where.topic = topic;
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (company) where.companies = { has: company.toLowerCase() };
  if (tag) where.tags = { some: { name: tag } };
  if (isPublic === "true") where.isPublic = true;

  const skip = (Math.max(1, page) - 1) * PAGE_LIMIT;
  const [rows, total] = await Promise.all([
    findProblems(where, { skip, take: PAGE_LIMIT }),
    countProblems(where),
  ]);

  const problems = rows.map((p) => ({
    ...p,
    testCases: (p.testCases || []).map(({ input }) => ({ input })),
    isOwn: p.createdById === userId,
  }));

  return { problems, total, page, totalPages: Math.ceil(total / PAGE_LIMIT) };
}

export async function createNewProblem(
  { title, description, difficulty, topic, starterCode, testCases, companies, estimatedTime, isPublic, tags },
  userId
) {
  if (!title?.trim() || !description?.trim() || !difficulty || !topic?.trim()) {
    return { error: "title, description, difficulty and topic are required", status: 400 };
  }
  assertEnum(difficulty, DIFFICULTY, "difficulty");
  const problem = await createProblem({
    title: title.trim(),
    description: description.trim(),
    difficulty,
    topic: topic.trim(),
    starterCode: starterCode?.trim() || null,
    testCases: testCases || [],
    companies: companies?.map((c) => c.toLowerCase()) || [],
    estimatedTime: estimatedTime || null,
    isPublic: isPublic || false,
    createdById: userId,
    tags: tags || [],
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
