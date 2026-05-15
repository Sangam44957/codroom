/**
 * src/services/pipeline.service.js
 *
 * Hiring pipeline domain service.
 *
 * Responsibilities:
 * - Pipeline CRUD orchestration
 * - Candidate comparison analytics
 * - Interview ranking calculations
 * - Pipeline summary aggregation
 *
 * NOT responsible for:
 * - Direct database access
 * - HTTP formatting
 * - AI evaluation
 * - Playback generation
 *
 * LLD Principles:
 * - SRP
 * - DIP
 * - Explicit Error Contracts
 * - Cohesion
 * - Named Constants
 */

import {
  findPipelinesByUser,
  findPipelineById,
  findPipelineWithRooms,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from "@/repositories/pipeline.repository";

import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

import {
  PipelineStatus,
  Recommendation,
  assertEnum,
} from "@/lib/enums";

import {
  DEFAULT_LANGUAGE,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_UPDATE_FIELDS =
  Object.freeze(
    new Set([
      "name",
      "description",
      "status",
      "targetHires",
      "templateId",
    ])
  );

const DEFAULT_TARGET_HIRES =
  1;

const DEFAULT_PASS_RATE =
  50;

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const normalizeString = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
};

const assertPipelineExists = (
  pipeline,
  pipelineId
) => {
  if (!pipeline) {
    throw new NotFoundError(
      "Pipeline",
      pipelineId
    );
  }
};

const sanitizeUpdatePayload = (
  payload = {}
) => {
  const filtered =
    Object.fromEntries(
      Object.entries(
        payload
      ).filter(
        ([key]) =>
          ALLOWED_UPDATE_FIELDS.has(
            key
          )
      )
    );

  if (
    filtered.status
  ) {
    assertEnum(
      filtered.status,
      PipelineStatus,
      "pipeline status"
    );
  }

  return filtered;
};

const average = (
  numbers
) => {
  if (!numbers.length) {
    return null;
  }

  return (
    Math.round(
      (numbers.reduce(
        (
          total,
          current
        ) =>
          total +
          current,
        0
      ) /
        numbers.length) *
        10
    ) / 10
  );
};

const countBy = (
  collection,
  selector
) => {
  return collection.reduce(
    (
      accumulator,
      item
    ) => {
      const key =
        selector(item) ||
        "pending";

      accumulator[key] =
        (accumulator[key] ??
          0) + 1;

      return accumulator;
    },
    {}
  );
};

/* -------------------------------------------------------------------------- */
/*                         CODING VELOCITY ANALYSIS                           */
/* -------------------------------------------------------------------------- */

const countChangedLines = (
  before = "",
  after = ""
) => {
  const previous =
    before.split("\n");

  const next =
    after.split("\n");

  const maxLength =
    Math.max(
      previous.length,
      next.length
    );

  let changed = 0;

  for (
    let index = 0;
    index < maxLength;
    index += 1
  ) {
    if (
      previous[index] !==
      next[index]
    ) {
      changed += 1;
    }
  }

  return changed;
};

const computeCodingVelocity =
  (
    snapshots = [],
    durationSeconds
  ) => {
    if (
      snapshots.length < 2 ||
      !durationSeconds
    ) {
      return null;
    }

    let changedLines =
      0;

    for (
      let index = 1;
      index <
      snapshots.length;
      index += 1
    ) {
      changedLines +=
        countChangedLines(
          snapshots[
            index - 1
          ].code,
          snapshots[index]
            .code
        );
    }

    return (
      Math.round(
        (changedLines /
          (durationSeconds /
            60)) *
          10
      ) / 10
    );
  };

/* -------------------------------------------------------------------------- */
/*                          TEST RUN ANALYTICS                                */
/* -------------------------------------------------------------------------- */

const analyzeTestRunPattern =
  (events = []) => {
    const runs =
      events.filter(
        (event) =>
          event.type ===
          "test-run"
      );

    if (!runs.length) {
      return {
        total: 0,

        passRate:
          null,

        frequency:
          null,
      };
    }

    const passed =
      runs.filter(
        (event) =>
          event.label?.includes(
            "pass"
          )
      ).length;

    return {
      total:
        runs.length,

      passRate:
        Math.round(
          (passed /
            runs.length) *
            100
        ),

      frequency:
        runs.length > 1
          ? Math.round(
              (runs[
                runs.length -
                  1
              ].timestamp.getTime() -
                runs[0].timestamp.getTime()) /
                runs.length /
                1000
            )
          : null,
    };
  };

const computeTimeToFirstTest =
  (
    events = [],
    interviewStart
  ) => {
    const firstRun =
      events.find(
        (event) =>
          event.type ===
          "test-run"
      );

    if (
      !firstRun ||
      !interviewStart
    ) {
      return null;
    }

    return (
      firstRun.timestamp.getTime() -
      new Date(
        interviewStart
      ).getTime()
    );
  };

/* -------------------------------------------------------------------------- */
/*                              RANKING SCORE                                 */
/* -------------------------------------------------------------------------- */

const computeRankScore =
  (
    report,
    velocity,
    testPattern
  ) => {
    if (!report) {
      return null;
    }

    const aiWeight =
      (report.overallScore /
        100) *
      70;

    const behavioralWeight =
      (((testPattern?.passRate ??
        DEFAULT_PASS_RATE) /
        100) *
        20) +
      ((velocity
        ? Math.min(
            velocity / 10,
            1
          )
        : 0.5) *
        10);

    return Math.round(
      aiWeight +
        behavioralWeight
    );
  };

/* -------------------------------------------------------------------------- */
/*                         CANDIDATE SERIALIZER                               */
/* -------------------------------------------------------------------------- */

const serializeCandidate =
  (room) => {
    const {
      interview,
    } = room;

    const report =
      interview.report;

    const codingVelocity =
      computeCodingVelocity(
        interview.snapshots,
        interview.duration
      );

    const testRunPattern =
      analyzeTestRunPattern(
        interview.events
      );

    return {
      candidateName:
        room.candidateName ||
        "Anonymous",

      roomId: room.id,

      interviewId:
        interview.id,

      date:
        interview.startedAt,

      duration:
        interview.duration,

      scores: report
        ? {
            correctness:
              report.correctness,

            codeQuality:
              report.codeQuality,

            edgeCaseHandling:
              report.edgeCaseHandling,

            overallScore:
              report.overallScore,
          }
        : null,

      recommendation:
        report?.recommendation ??
        null,

      behavioral: {
        codingVelocity,

        testRunPattern,

        timeToFirstTestMs:
          computeTimeToFirstTest(
            interview.events,
            interview.startedAt
          ),
      },

      rankScore:
        computeRankScore(
          report,
          codingVelocity,
          testRunPattern
        ),
    };
  };

/* -------------------------------------------------------------------------- */
/*                             LIST PIPELINES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lists pipelines for user.
 *
 * @param {string} userId
 *
 * @returns {Promise<Array>}
 */
export const listPipelines =
  async (
    userId
  ) => {
    return findPipelinesByUser(
      userId
    );
  };

/* -------------------------------------------------------------------------- */
/*                              GET PIPELINE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetches pipeline by id.
 *
 * @param {string} pipelineId
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const getPipeline =
  async (
    pipelineId,
    userId
  ) => {
    const pipeline =
      await findPipelineById(
        pipelineId,
        userId
      );

    assertPipelineExists(
      pipeline,
      pipelineId
    );

    return pipeline;
  };

/* -------------------------------------------------------------------------- */
/*                            CREATE PIPELINE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates hiring pipeline.
 *
 * @param {Object} payload
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const createNewPipeline =
  async (
    payload = {},
    userId
  ) => {
    const {
      name,
      description,
      templateId,
      targetHires,
    } = payload;

    if (
      !normalizeString(
        name
      )
    ) {
      throw new ValidationError(
        "Pipeline name is required"
      );
    }

    return createPipeline({
      name:
        normalizeString(
          name
        ),

      description:
        normalizeString(
          description
        ) || null,

      templateId:
        templateId ||
        null,

      targetHires:
        targetHires ||
        DEFAULT_TARGET_HIRES,

      createdById:
        userId,
    });
  };

/* -------------------------------------------------------------------------- */
/*                            UPDATE PIPELINE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Updates existing pipeline.
 *
 * @param {string} pipelineId
 * @param {string} userId
 * @param {Object} payload
 *
 * @returns {Promise<Object>}
 */
export const updateExistingPipeline =
  async (
    pipelineId,
    userId,
    payload = {}
  ) => {
    const data =
      sanitizeUpdatePayload(
        payload
      );

    const result =
      await updatePipeline(
        pipelineId,
        userId,
        data
      );

    if (
      result.count === 0
    ) {
      throw new NotFoundError(
        "Pipeline",
        pipelineId
      );
    }

    return findPipelineById(
      pipelineId,
      userId
    );
  };

/* -------------------------------------------------------------------------- */
/*                            REMOVE PIPELINE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deletes pipeline.
 *
 * @param {string} pipelineId
 * @param {string} userId
 */
export const removePipeline =
  async (
    pipelineId,
    userId
  ) => {
    const result =
      await deletePipeline(
        pipelineId,
        userId
      );

    if (
      result.count === 0
    ) {
      throw new NotFoundError(
        "Pipeline",
        pipelineId
      );
    }
  };

/* -------------------------------------------------------------------------- */
/*                        PIPELINE COMPARISON                                 */
/* -------------------------------------------------------------------------- */

/**
 * Builds pipeline candidate comparison.
 *
 * @param {string} pipelineId
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const getPipelineComparison =
  async (
    pipelineId,
    userId
  ) => {
    const pipeline =
      await findPipelineWithRooms(
        pipelineId,
        userId
      );

    assertPipelineExists(
      pipeline,
      pipelineId
    );

    const candidates =
      pipeline.rooms
        .filter(
          (room) =>
            room.interview
        )
        .map(
          serializeCandidate
        )
        .sort(
          (
            left,
            right
          ) =>
            (right.rankScore ??
              -1) -
            (left.rankScore ??
              -1)
        );

    return Object.freeze({
      pipeline: {
        id: pipeline.id,

        name:
          pipeline.name,

        status:
          pipeline.status,

        targetHires:
          pipeline.targetHires,

        template:
          pipeline.template,
      },

      candidates,

      summary: {
        total:
          candidates.length,

        evaluated:
          candidates.filter(
            (
              candidate
            ) =>
              candidate.scores
          ).length,

        avgOverallScore:
          average(
            candidates
              .map(
                (
                  candidate
                ) =>
                  candidate
                    .scores
                    ?.overallScore
              )
              .filter(
                Boolean
              )
          ),

        recommendationDistribution:
          countBy(
            candidates,
            (
              candidate
            ) =>
              candidate.recommendation
          ),
      },
    });
  };