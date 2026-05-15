/**
 * src/services/interview/report.service.js
 *
 * Interview report generation service.
 *
 * Responsibilities:
 * - Generate evaluation reports
 * - Execute AI evaluation flow
 * - Execute fallback scoring flow
 * - Run automated tests
 * - Persist report results
 * - Notify report readiness
 *
 * NOT responsible for:
 * - Interview lifecycle
 * - Playback
 * - Share tokens
 * - HTTP formatting
 *
 * LLD Principles:
 * - SRP
 * - Strategy Pattern
 * - Fail Fast
 * - Explicit Error Contracts
 * - Transaction Safety
 */

import prisma from "@/lib/db";

import {
  logger,
} from "@/lib/logger";

import {
  config,
} from "@/lib/config";

import {
  evaluateCode,
} from "@/lib/groq";

import {
  runTestsForReport,
} from "@/lib/testRunner";

import {
  notifyReportReady,
} from "@/lib/email";

import {
  CircuitBreakerOpenError,
} from "@/lib/circuitBreaker";

import {
  ValidationError,
  NotFoundError,
  ConflictGeneratingError,
} from "@/lib/errors";

import {
  InterviewStatus,
  Recommendation,
  assertEnum,
} from "@/lib/enums";

import {
  findInterviewById,
  findReport,
  createReport,
  updateReport,
  updateInterview,
} from "@/repositories/interview.repository";

/* -------------------------------------------------------------------------- */
/*                           FALLBACK EVALUATION                              */
/* -------------------------------------------------------------------------- */

/**
 * Strategy Pattern:
 * fallback scoring strategy
 * when AI evaluation fails.
 */
const buildFallbackEvaluation = (
  testResults
) => {
  const passRatio =
    testResults
      ? testResults.passed /
        Math.max(
          testResults.total,
          1
        )
      : 0.5;

  return {
    correctness:
      Math.round(
        passRatio * 10
      ),

    codeQuality: 5,

    timeComplexity:
      "Unknown",

    spaceComplexity:
      "Unknown",

    edgeCaseHandling: 5,

    overallScore:
      Math.round(
        passRatio * 100
      ),

    recommendation:
      Recommendation.BORDERLINE,

    summary:
      "AI evaluation was unavailable. Scores were estimated from automated test results.",

    improvements:
      "Re-generate the report once the AI service becomes available.",

    strengths:
      "AI evaluation unavailable.",

    weaknesses:
      "AI evaluation unavailable.",
  };
};

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const assertInterviewExists = (
  interview,
  interviewId
) => {
  if (!interview) {
    throw new NotFoundError(
      "Interview",
      interviewId
    );
  }
};

const assertCodeSubmitted = (
  interview
) => {
  if (
    !interview.finalCode?.trim()
  ) {
    throw new ValidationError(
      "No code was submitted. A report cannot be generated without a final submission."
    );
  }
};

const resolveProblems = (
  interview
) => {
  if (
    interview.room
      .problems?.length
  ) {
    return interview.room.problems.map(
      (roomProblem) =>
        roomProblem.problem
    );
  }

  if (
    interview.room.problem
  ) {
    return [
      interview.room.problem,
    ];
  }

  return [];
};

const runInterviewTests =
  async (
    interview,
    problems,
    interviewId
  ) => {
    const primaryProblem =
      problems[0] ?? null;

    if (
      !primaryProblem
        ?.testCases?.length
    ) {
      return null;
    }

    try {
      return await runTestsForReport(
        interview.finalCode,
        interview.language,
        primaryProblem.testCases
      );
    } catch (error) {
      logger.warn(
        {
          err: error,
          interviewId,
        },
        "Test runner failed — continuing without test results"
      );

      return null;
    }
  };

const buildSummary = (
  evaluation,
  aiUnavailable
) => {
  if (aiUnavailable) {
    return evaluation.summary;
  }

  return `
${evaluation.summary}

**Strengths**
${evaluation.strengths}

**Weaknesses**
${evaluation.weaknesses}
  `.trim();
};

const queueReportNotification =
  (
    interview,
    interviewId
  ) => {
    notifyReportReady({
      interviewerEmail:
        interview.room
          .createdBy?.email,

      candidateName:
        interview.room
          .candidateName,

      reportUrl:
        `${config.appUrl}/room/${interview.room.id}/report`,
    }).catch((error) => {
      logger.warn(
        {
          err: error,
          interviewId,
        },
        "Report-ready notification failed"
      );
    });
  };

/* -------------------------------------------------------------------------- */
/*                         GENERATION TRANSACTION GUARD                       */
/* -------------------------------------------------------------------------- */

const acquireGenerationLock =
  async (
    interviewId
  ) => {
    return prisma.$transaction(
      async (tx) => {
        const current =
          await tx.interview.findUnique(
            {
              where: {
                id: interviewId,
              },

              select: {
                id: true,

                status: true,

                report: {
                  select: {
                    id: true,
                  },
                },
              },
            }
          );

        if (!current) {
          throw new NotFoundError(
            "Interview",
            interviewId
          );
        }

        if (current.report) {
          return {
            existing: true,
          };
        }

        if (
          current.status ===
          InterviewStatus.GENERATING
        ) {
          return {
            generating: true,
          };
        }

        if (
          current.status !==
          InterviewStatus.COMPLETED
        ) {
          throw new ValidationError(
            "Interview must be completed before generating a report"
          );
        }

        await tx.interview.update(
          {
            where: {
              id: interviewId,
            },

            data: {
              status:
                InterviewStatus.GENERATING,
            },
          }
        );

        return {
          canGenerate: true,
        };
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                           GENERATE REPORT                                  */
/* -------------------------------------------------------------------------- */

/**
 * Generates interview report.
 *
 * @param {string} interviewId
 *
 * @returns {{
 *   report: Object,
 *   created: boolean,
 *   aiUnavailable?: boolean
 * }}
 */
export const generateReport =
  async (
    interviewId
  ) => {
    const interview =
      await findInterviewById(
        interviewId
      );

    assertInterviewExists(
      interview,
      interviewId
    );

    if (interview.report) {
      return Object.freeze({
        report:
          interview.report,

        created: false,
      });
    }

    assertCodeSubmitted(
      interview
    );

    const guard =
      await acquireGenerationLock(
        interviewId
      );

    if (guard.existing) {
      return Object.freeze({
        report:
          await findReport(
            interviewId
          ),

        created: false,
      });
    }

    if (guard.generating) {
      throw new ConflictGeneratingError(
        "Report generation already in progress"
      );
    }

    try {
      return await runGeneration(
        interviewId,
        interview
      );
    } catch (error) {
      /**
       * Always reset status
       * on generation failure.
       */
      await updateInterview(
        interviewId,
        {
          status:
            InterviewStatus.COMPLETED,
        }
      ).catch(() => {});

      logger.error(
        {
          err: error,
          interviewId,
        },
        "Report generation failed"
      );

      throw error;
    }
  };

/* -------------------------------------------------------------------------- */
/*                             RUN GENERATION                                 */
/* -------------------------------------------------------------------------- */

const runGeneration =
  async (
    interviewId,
    interview
  ) => {
    const problems =
      resolveProblems(
        interview
      );

    const testResults =
      await runInterviewTests(
        interview,
        problems,
        interviewId
      );

    let evaluation;

    let aiUnavailable =
      false;

    try {
      evaluation =
        await evaluateCode({
          code:
            interview.finalCode,

          language:
            interview.language,

          problems,

          duration:
            interview.duration,

          testResults,
        });
    } catch (error) {
      const circuitOpen =
        error instanceof
        CircuitBreakerOpenError;

      logger.warn(
        {
          breaker:
            "groq-ai",

          interviewId,

          circuitOpen,
        },
        "AI evaluation failed — using fallback strategy"
      );

      aiUnavailable = true;

      evaluation =
        buildFallbackEvaluation(
          testResults
        );
    }

    assertEnum(
      evaluation.recommendation,
      Recommendation,
      "recommendation"
    );

    const report =
      await createReport({
        interviewId,

        correctness:
          evaluation.correctness,

        codeQuality:
          evaluation.codeQuality,

        timeComplexity:
          evaluation.timeComplexity,

        spaceComplexity:
          evaluation.spaceComplexity,

        edgeCaseHandling:
          evaluation.edgeCaseHandling,

        overallScore:
          evaluation.overallScore,

        recommendation:
          evaluation.recommendation,

        summary:
          buildSummary(
            evaluation,
            aiUnavailable
          ),

        improvements:
          evaluation.improvements,
      });

    const nextStatus =
      aiUnavailable
        ? InterviewStatus.COMPLETED
        : InterviewStatus.EVALUATED;

    assertEnum(
      nextStatus,
      InterviewStatus,
      "interview status"
    );

    await updateInterview(
      interviewId,
      {
        status:
          nextStatus,
      }
    );

    queueReportNotification(
      interview,
      interviewId
    );

    logger.info(
      {
        interviewId,
        aiUnavailable,
        overallScore:
          report.overallScore,
      },
      "Interview report generated"
    );

    return Object.freeze({
      report,
      created: true,
      aiUnavailable,
    });
  };

/* -------------------------------------------------------------------------- */
/*                               GET REPORT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetches report by interview id.
 *
 * @param {string} interviewId
 *
 * @returns {Promise<Object|null>}
 */
export const getReport =
  async (
    interviewId
  ) => {
    return findReport(
      interviewId
    );
  };

/* -------------------------------------------------------------------------- */
/*                              SAVE RUBRIC                                   */
/* -------------------------------------------------------------------------- */

/**
 * Saves manual rubric scores.
 *
 * @param {string} interviewId
 * @param {Object} rubric
 */
export const saveRubric =
  async (
    interviewId,
    rubric = {}
  ) => {
    await updateReport(
      interviewId,
      {
        rubricProblemSolving:
          rubric.problemSolving ??
          0,

        rubricCommunication:
          rubric.communication ??
          0,

        rubricCodeQuality:
          rubric.codeQuality ??
          0,

        rubricEdgeCases:
          rubric.edgeCases ??
          0,

        rubricSpeed:
          rubric.speed ?? 0,
      }
    );
  };