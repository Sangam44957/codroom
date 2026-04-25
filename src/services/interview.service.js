import prisma from "@/lib/db";
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
  findPlaybackData,
} from "@/repositories/interview.repository";
import { updateRoom } from "@/repositories/room.repository";
import { evaluateCode } from "@/lib/groq";
import { runTestsForReport } from "@/lib/testRunner";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { CircuitBreakerOpenError } from "@/lib/circuitBreaker";
import { notifyReportReady, notifyReportShared } from "@/lib/email";
import { assertEnum, ROOM_STATUS, INTERVIEW_STATUS, RECOMMENDATION } from "@/lib/enums";

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
  assertEnum("active", ROOM_STATUS, "room status");
  await updateRoom(roomId, { status: "active" });
  return { interview, created: true };
}

export async function endInterview(interviewId, { finalCode, language }) {
  if (finalCode && Buffer.byteLength(finalCode, "utf8") > 64 * 1024) {
    return { error: "Final code exceeds maximum size (64 KB)", status: 413 };
  }

  // Atomic check-and-update: only succeeds if status is still 'in_progress'
  const endedAt = new Date();
  const updated = await prisma.$queryRaw`
    UPDATE interviews
    SET
      status     = 'completed',
      "endedAt"  = ${endedAt},
      duration   = EXTRACT(EPOCH FROM (${endedAt} - "startedAt"))::int,
      "finalCode" = ${finalCode || ""},
      language   = COALESCE(${language || null}, language)
    WHERE id = ${interviewId}
      AND status = 'in_progress'
    RETURNING *
  `;

  if (!updated.length) {
    const existing = await findInterviewById(interviewId);
    if (!existing) return { error: "Interview not found", status: 404 };
    return { error: "Interview already ended", status: 400 };
  }

  assertEnum("completed", ROOM_STATUS, "room status");
  await updateRoom(updated[0].roomId, { status: "completed" });
  return { interview: updated[0] };
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
      logger.warn({ err: e, interviewId }, "test runner failed, proceeding without results");
    }
  }

  let evaluation;
  let aiUnavailable = false;
  try {
    evaluation = await evaluateCode({
      code: interview.finalCode,
      language: interview.language,
      problems: allProblems,
      duration: interview.duration,
      testResults,
    });
  } catch (e) {
    const isBreaker = e instanceof CircuitBreakerOpenError;
    if (isBreaker) {
      logger.warn({ breaker: "groq-ai", interviewId }, "AI circuit open, using fallback scores");
    } else {
      logger.error({ err: e, interviewId }, "AI evaluation failed, using fallback scores");
    }
    aiUnavailable = true;
    evaluation = {
      correctness: testResults ? Math.round((testResults.passed / Math.max(testResults.total, 1)) * 10) : 5,
      codeQuality: 5,
      timeComplexity: "Unknown",
      spaceComplexity: "Unknown",
      edgeCaseHandling: 5,
      overallScore: testResults ? Math.round((testResults.passed / Math.max(testResults.total, 1)) * 100) : 50,
      recommendation: "BORDERLINE",
      summary: "AI evaluation was unavailable at the time of report generation. Scores are estimated from automated test results where available.",
      improvements: "Please re-generate the report when the AI service is available for a full analysis.",
      strengths: "N/A — AI evaluation unavailable.",
      weaknesses: "N/A — AI evaluation unavailable.",
    };
  }

  assertEnum(evaluation.recommendation, RECOMMENDATION, "recommendation");
  const report = await createReport({
    interviewId,
    correctness: evaluation.correctness,
    codeQuality: evaluation.codeQuality,
    timeComplexity: evaluation.timeComplexity,
    spaceComplexity: evaluation.spaceComplexity,
    edgeCaseHandling: evaluation.edgeCaseHandling,
    overallScore: evaluation.overallScore,
    recommendation: evaluation.recommendation,
    summary: aiUnavailable
      ? evaluation.summary
      : `${evaluation.summary}\n\n**Strengths:**\n${evaluation.strengths}\n\n**Weaknesses:**\n${evaluation.weaknesses}`,
    improvements: evaluation.improvements,
  });

  const nextStatus = aiUnavailable ? "completed" : "evaluated";
  assertEnum(nextStatus, INTERVIEW_STATUS, "interview status");
  await updateInterview(interviewId, { status: nextStatus });

  // Notify interviewer — fire-and-forget, never block the response
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  notifyReportReady({
    interviewerEmail: interview.room.createdBy?.email,
    candidateName: interview.room.candidateName,
    reportUrl: `${appUrl}/room/${interview.room.id}/report`,
  }).catch((err) => logger.warn({ err, interviewId }, "report-ready notify failed"));

  return { report, created: true, aiUnavailable };
}

export async function getReport(interviewId) {
  return findReport(interviewId);
}

export async function generateShareToken(interviewId, rubric = {}, recipientEmail = null) {
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

  // If caller provided a recipient email, send them the share link
  if (recipientEmail) {
    const interview = await findInterviewById(interviewId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    notifyReportShared({
      recipientEmail,
      sharedByName: interview?.room?.createdBy?.name || "Your interviewer",
      candidateName: interview?.room?.candidateName,
      shareUrl: `${appUrl}/share/${shareToken}`,
      expiresAt: shareTokenExpiresAt,
    }).catch((err) => logger.warn({ err, interviewId }, "report-shared notify failed"));
  }

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

// ─── Playback ─────────────────────────────────────────────────────────────────

function countDiffLines(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  let changes = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) changes++;
  }
  return changes;
}

function buildPlaybackTimeline(interview, snapshots, events, notes) {
  const startTime = new Date(interview.startedAt).getTime();
  const items = [];

  let prevCode = "";
  for (const snap of snapshots) {
    items.push({
      type: "code",
      offsetMs: new Date(snap.timestamp).getTime() - startTime,
      timestamp: snap.timestamp,
      data: { code: snap.code, linesChanged: countDiffLines(prevCode, snap.code) },
    });
    prevCode = snap.code;
  }

  for (const evt of events) {
    items.push({
      type: evt.type,
      offsetMs: new Date(evt.timestamp).getTime() - startTime,
      timestamp: evt.timestamp,
      data: { label: evt.label },
    });
  }

  for (const note of notes) {
    items.push({
      type: "note",
      offsetMs: new Date(note.createdAt).getTime() - startTime,
      timestamp: note.createdAt,
      data: { content: note.content },
    });
  }

  items.sort((a, b) => a.offsetMs - b.offsetMs);
  return items;
}

function computePlaybackStats(snapshots, events) {
  const BUCKET_MS = 60_000;
  const activityBuckets = new Map();

  for (const snap of snapshots) {
    const bucket = Math.floor(new Date(snap.timestamp).getTime() / BUCKET_MS);
    activityBuckets.set(bucket, (activityBuckets.get(bucket) || 0) + 1);
  }

  const sortedBuckets = [...activityBuckets.keys()].sort((a, b) => a - b);
  let thinkingTimeMs = 0;
  for (let i = 1; i < sortedBuckets.length; i++) {
    const gap = (sortedBuckets[i] - sortedBuckets[i - 1]) * BUCKET_MS;
    if (gap > 3 * BUCKET_MS) thinkingTimeMs += gap;
  }

  const runPassEvents = events.filter((e) => e.type === "run_pass");
  const runFailEvents = events.filter((e) => e.type === "run_fail");

  return {
    totalSnapshots: snapshots.length,
    totalEvents: events.length,
    runsPassed: runPassEvents.length,
    runsFailed: runFailEvents.length,
    estimatedThinkingTimeMs: thinkingTimeMs,
    activityHeatmap: Object.fromEntries(activityBuckets),
  };
}

export async function getPlaybackData(interviewId, userId) {
  const { interview, snapshots, events, notes } = await findPlaybackData(interviewId);
  if (!interview) return { error: "Interview not found", status: 404 };
  if (interview.room.createdById !== userId) return { error: "Access denied", status: 403 };

  const allProblems = interview.room.problems?.length
    ? interview.room.problems.map((rp) => rp.problem)
    : interview.room.problem ? [interview.room.problem] : [];

  return {
    interview: {
      id: interview.id,
      status: interview.status,
      language: interview.language,
      duration: interview.duration,
      startedAt: interview.startedAt,
      endedAt: interview.endedAt,
    },
    problems: allProblems.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty })),
    timeline: buildPlaybackTimeline(interview, snapshots, events, notes),
    stats: computePlaybackStats(snapshots, events),
    report: interview.report ?? null,
  };
}
