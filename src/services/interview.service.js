import {
  findInterviewById,
  findInterviewByRoomId,
  createInterview,
  updateInterview,
  deleteInterviewCascade,
  createSnapshot,
  findSnapshotsPaginated,
  createEvent,
  findEventsPaginated,
  findNoteByInterview,
  upsertNote,
  findReport,
  createReport,
  updateReport,
} from "@/repositories/interview.repository";
import { updateRoom } from "@/repositories/room.repository";
import { evaluateCode } from "@/lib/groq";
import { runTestsForReport } from "@/lib/testRunner";
import { randomBytes } from "crypto";

const SHARE_TTL_DAYS = 30;

export async function getInterview(interviewId) {
  return findInterviewById(interviewId);
}

export async function startInterview(roomId, language, userId) {
  // Idempotent — return existing if already started
  const existing = await findInterviewByRoomId(roomId);
  if (existing) return { interview: existing, created: false };

  const interview = await createInterview({
    roomId,
    language: language || "javascript",
    status: "in_progress",
  });
  await updateRoom(roomId, { status: "active" });
  return { interview, created: true };
}

export async function endInterview(interviewId, { finalCode, language }) {
  const interview = await findInterviewById(interviewId);
  if (!interview) return { error: "Interview not found", status: 404 };
  if (interview.status === "completed" || interview.status === "evaluated") {
    return { error: "Interview already ended", status: 400 };
  }
  if (finalCode && Buffer.byteLength(finalCode, "utf8") > 64 * 1024) {
    return { error: "Final code exceeds maximum size (64 KB)", status: 413 };
  }

  const endedAt = new Date();
  const duration = Math.floor(
    (endedAt.getTime() - new Date(interview.startedAt).getTime()) / 1000
  );

  const updated = await updateInterview(interviewId, {
    finalCode: finalCode || "",
    language: language || interview.language,
    status: "completed",
    endedAt,
    duration,
  });

  await updateRoom(updated.roomId, { status: "completed" });
  return { interview: updated };
}

export async function deleteInterview(interviewId) {
  const interview = await findInterviewById(interviewId);
  if (!interview) return { error: "Interview not found", status: 404 };
  await deleteInterviewCascade(interviewId, interview.room.id);
  return { success: true };
}

export async function saveSnapshot(interviewId, code) {
  const snapshot = await createSnapshot({ interviewId, code: code || "" });
  return { snapshot };
}

export async function getSnapshots(interviewId, { cursor, limit }) {
  const snapshots = await findSnapshotsPaginated(interviewId, { cursor, limit });
  const hasMore = snapshots.length > limit;
  if (hasMore) snapshots.pop();
  return { snapshots, nextCursor: hasMore ? snapshots[snapshots.length - 1].id : null };
}

export async function saveEvent(interviewId, { type, label }) {
  const event = await createEvent({ interviewId, type, label });
  return { event };
}

export async function getEvents(interviewId, { cursor, limit }) {
  const events = await findEventsPaginated(interviewId, { cursor, limit });
  const hasMore = events.length > limit;
  if (hasMore) events.pop();
  return { events, nextCursor: hasMore ? events[events.length - 1].id : null };
}

export async function getNote(interviewId) {
  return findNoteByInterview(interviewId);
}

export async function saveNote(interviewId, content) {
  return upsertNote(interviewId, content.trim());
}

export async function generateReport(interviewId) {
  const interview = await findInterviewById(interviewId);
  if (!interview) return { error: "Interview not found", status: 404 };

  // Return existing report instead of regenerating
  if (interview.report) return { report: interview.report, created: false };

  if (!interview.finalCode?.trim()) {
    return {
      error: "No code was submitted. The candidate must write code before a report can be generated.",
      status: 400,
    };
  }

  const allProblems = interview.room.problems?.length
    ? interview.room.problems.map((rp) => rp.problem)
    : interview.room.problem ? [interview.room.problem] : [];

  let testResults = null;
  const primaryProblem = allProblems[0] || null;
  if (primaryProblem?.testCases?.length) {
    try {
      testResults = await runTestsForReport(
        interview.finalCode,
        interview.language,
        primaryProblem.testCases
      );
    } catch (e) {
      console.warn("[report] Test runner failed, proceeding without results:", e.message);
    }
  }

  const evaluation = await evaluateCode({
    code: interview.finalCode,
    language: interview.language,
    problems: allProblems,
    duration: interview.duration,
    testResults,
  });

  const report = await createReport({
    interviewId,
    correctness: evaluation.correctness,
    codeQuality: evaluation.codeQuality,
    timeComplexity: evaluation.timeComplexity,
    spaceComplexity: evaluation.spaceComplexity,
    edgeCaseHandling: evaluation.edgeCaseHandling,
    overallScore: evaluation.overallScore,
    recommendation: evaluation.recommendation,
    summary: `${evaluation.summary}\n\n**Strengths:**\n${evaluation.strengths}\n\n**Weaknesses:**\n${evaluation.weaknesses}`,
    improvements: evaluation.improvements,
  });

  await updateInterview(interviewId, { status: "evaluated" });
  return { report, created: true };
}

export async function getReport(interviewId) {
  return findReport(interviewId);
}

export async function generateShareToken(interviewId, rubric = {}) {
  const report = await findReport(interviewId);
  if (!report) return { error: "Report not found", status: 404 };

  const shareToken = randomBytes(20).toString("hex");
  const shareTokenExpiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000);

  const updated = await updateReport(interviewId, {
    shareToken,
    shareTokenExpiresAt,
    shareTokenRevokedAt: null,
    rubricProblemSolving: rubric.problemSolving ?? report.rubricProblemSolving,
    rubricCommunication: rubric.communication ?? report.rubricCommunication,
    rubricCodeQuality: rubric.codeQuality ?? report.rubricCodeQuality,
    rubricEdgeCases: rubric.edgeCases ?? report.rubricEdgeCases,
    rubricSpeed: rubric.speed ?? report.rubricSpeed,
  });

  return { shareToken: updated.shareToken, expiresAt: updated.shareTokenExpiresAt };
}

export async function revokeShareToken(interviewId) {
  await updateReport(interviewId, { shareTokenRevokedAt: new Date() });
  return { ok: true };
}

export async function saveRubric(interviewId, rubric) {
  await updateReport(interviewId, {
    rubricProblemSolving: rubric.problemSolving ?? 0,
    rubricCommunication: rubric.communication ?? 0,
    rubricCodeQuality: rubric.codeQuality ?? 0,
    rubricEdgeCases: rubric.edgeCases ?? 0,
    rubricSpeed: rubric.speed ?? 0,
  });
  return { ok: true };
}
