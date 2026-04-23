import {
  findPipelinesByUser,
  findPipelineById,
  findPipelineWithRooms,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from "@/repositories/pipeline.repository";

export async function listPipelines(userId) {
  return findPipelinesByUser(userId);
}

export async function getPipeline(id, userId) {
  return findPipelineById(id, userId);
}

export async function createNewPipeline({ name, description, templateId, targetHires }, userId) {
  return createPipeline({
    name: name.trim(),
    description: description?.trim() || null,
    templateId: templateId || null,
    targetHires: targetHires || 1,
    createdById: userId,
  });
}

export async function updateExistingPipeline(id, userId, body) {
  const allowed = ["name", "description", "status", "targetHires", "templateId"];
  const data = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );
  const result = await updatePipeline(id, userId, data);
  if (result.count === 0) return null;
  return findPipelineById(id, userId);
}

export async function removePipeline(id, userId) {
  const result = await deletePipeline(id, userId);
  return result.count > 0;
}

export async function getPipelineComparison(id, userId) {
  const pipeline = await findPipelineWithRooms(id, userId);
  if (!pipeline) return null;

  const candidates = pipeline.rooms
    .filter((room) => room.interview)
    .map((room) => {
      const interview = room.interview;
      const report = interview.report;
      const velocity = computeCodingVelocity(interview.snapshots, interview.duration);
      const testPattern = analyzeTestRunPattern(interview.events);

      return {
        candidateName: room.candidateName || "Anonymous",
        roomId: room.id,
        interviewId: interview.id,
        date: interview.startedAt,
        duration: interview.duration,
        scores: report
          ? {
              correctness: report.correctness,
              codeQuality: report.codeQuality,
              edgeCaseHandling: report.edgeCaseHandling,
              overallScore: report.overallScore,
            }
          : null,
        recommendation: report?.recommendation ?? null,
        behavioral: {
          codingVelocity: velocity,
          testRunPattern: testPattern,
          timeToFirstTestMs: computeTimeToFirstTest(interview.events, interview.startedAt),
        },
        rankScore: computeRankScore(report, velocity, testPattern),
      };
    })
    .sort((a, b) => (b.rankScore ?? -1) - (a.rankScore ?? -1));

  return {
    pipeline: {
      id: pipeline.id,
      name: pipeline.name,
      status: pipeline.status,
      targetHires: pipeline.targetHires,
      template: pipeline.template,
    },
    candidates,
    summary: {
      total: candidates.length,
      evaluated: candidates.filter((c) => c.scores).length,
      avgOverallScore: avg(candidates.map((c) => c.scores?.overallScore).filter(Boolean)),
      recommendationDistribution: countBy(candidates, (c) => c.recommendation),
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeCodingVelocity(snapshots, durationSeconds) {
  if (snapshots.length < 2 || !durationSeconds) return null;
  let changed = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const before = (snapshots[i - 1].code || "").split("\n");
    const after = (snapshots[i].code || "").split("\n");
    const len = Math.max(before.length, after.length);
    for (let j = 0; j < len; j++) {
      if (before[j] !== after[j]) changed++;
    }
  }
  return Math.round((changed / (durationSeconds / 60)) * 10) / 10;
}

function analyzeTestRunPattern(events) {
  const runs = events.filter((e) => e.type === "test-run");
  if (!runs.length) return { total: 0, passRate: null, frequency: null };
  const passed = runs.filter((e) => e.label?.includes("pass")).length;
  return {
    total: runs.length,
    passRate: Math.round((passed / runs.length) * 100),
    frequency:
      runs.length > 1
        ? Math.round(
            (runs[runs.length - 1].timestamp.getTime() - runs[0].timestamp.getTime()) /
              runs.length /
              1000
          )
        : null,
  };
}

function computeTimeToFirstTest(events, interviewStart) {
  const first = events.find((e) => e.type === "test-run");
  if (!first || !interviewStart) return null;
  return first.timestamp.getTime() - new Date(interviewStart).getTime();
}

function computeRankScore(report, velocity, testPattern) {
  if (!report) return null;
  // overallScore is 1-100; weight it at 70%, behavioral signals at 30%
  const ai = (report.overallScore / 100) * 70;
  const behavioral =
    ((testPattern?.passRate ?? 50) / 100) * 20 +
    (velocity ? Math.min(velocity / 10, 1) : 0.5) * 10;
  return Math.round(ai + behavioral);
}

function avg(nums) {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function countBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item) || "pending";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
