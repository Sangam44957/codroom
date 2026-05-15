/**
 * src/services/interview/playback.service.js
 *
 * Interview playback analytics service.
 *
 * Responsibilities:
 * - Construct playback timeline
 * - Compute interview analytics
 * - Build playback DTO
 * - Aggregate replay data
 *
 * NOT responsible for:
 * - Interview lifecycle
 * - Report generation
 * - Share token management
 * - HTTP formatting
 *
 * LLD Principles:
 * - SRP
 * - Cohesion
 * - Explicit Contracts
 * - Named Constants
 */

import {
  findPlaybackData,
} from "@/repositories/interview.repository";

import {
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

import {
  INTERVIEW,
} from "@/lib/constants";

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

const assertPlaybackAccess = (
  interview,
  userId
) => {
  if (
    interview.room
      .createdById !==
    userId
  ) {
    throw new ForbiddenError(
      "You do not have access to this playback"
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

const toTimestamp = (
  value
) => {
  return new Date(
    value
  ).getTime();
};

const calculateOffsetMs = (
  timestamp,
  startTime
) => {
  return (
    toTimestamp(timestamp) -
    startTime
  );
};

/* -------------------------------------------------------------------------- */
/*                             DIFF CALCULATION                               */
/* -------------------------------------------------------------------------- */

/**
 * Computes rough line-diff count.
 *
 * Lightweight approximation:
 * avoids expensive diff libraries.
 */
const countDiffLines = (
  before = "",
  after = ""
) => {
  const previousLines =
    before.split("\n");

  const nextLines =
    after.split("\n");

  const maxLines =
    Math.max(
      previousLines.length,
      nextLines.length
    );

  let changes = 0;

  for (
    let index = 0;
    index < maxLines;
    index += 1
  ) {
    if (
      previousLines[index] !==
      nextLines[index]
    ) {
      changes += 1;
    }
  }

  return changes;
};

/* -------------------------------------------------------------------------- */
/*                           TIMELINE BUILDERS                                */
/* -------------------------------------------------------------------------- */

const buildSnapshotTimeline =
  (
    snapshots,
    startTime
  ) => {
    const timeline = [];

    let previousCode =
      "";

    for (const snapshot of snapshots) {
      timeline.push({
        type: "code",

        offsetMs:
          calculateOffsetMs(
            snapshot.timestamp,
            startTime
          ),

        timestamp:
          snapshot.timestamp,

        data: {
          code:
            snapshot.code,

          linesChanged:
            countDiffLines(
              previousCode,
              snapshot.code
            ),
        },
      });

      previousCode =
        snapshot.code;
    }

    return timeline;
  };

const buildEventTimeline =
  (
    events,
    startTime
  ) => {
    return events.map(
      (event) => ({
        type: event.type,

        offsetMs:
          calculateOffsetMs(
            event.timestamp,
            startTime
          ),

        timestamp:
          event.timestamp,

        data: {
          label:
            event.label,
        },
      })
    );
  };

const buildNoteTimeline =
  (
    notes,
    startTime
  ) => {
    return notes.map(
      (note) => ({
        type: "note",

        offsetMs:
          calculateOffsetMs(
            note.createdAt,
            startTime
          ),

        timestamp:
          note.createdAt,

        data: {
          content:
            note.content,
        },
      })
    );
  };

/* -------------------------------------------------------------------------- */
/*                             TIMELINE BUILDER                               */
/* -------------------------------------------------------------------------- */

const buildTimeline = (
  interview,
  snapshots,
  events,
  notes
) => {
  const startTime =
    toTimestamp(
      interview.startedAt
    );

  const timeline = [
    ...buildSnapshotTimeline(
      snapshots,
      startTime
    ),

    ...buildEventTimeline(
      events,
      startTime
    ),

    ...buildNoteTimeline(
      notes,
      startTime
    ),
  ];

  return timeline.sort(
    (left, right) =>
      left.offsetMs -
      right.offsetMs
  );
};

/* -------------------------------------------------------------------------- */
/*                             ACTIVITY STATS                                 */
/* -------------------------------------------------------------------------- */

const buildActivityBuckets =
  (snapshots) => {
    const buckets =
      new Map();

    for (const snapshot of snapshots) {
      const bucket =
        Math.floor(
          toTimestamp(
            snapshot.timestamp
          ) /
            INTERVIEW.SNAPSHOT_ACTIVITY_BUCKET_MS
        );

      buckets.set(
        bucket,
        (buckets.get(bucket) ??
          0) + 1
      );
    }

    return buckets;
  };

const estimateThinkingTime =
  (
    activityBuckets
  ) => {
    const sortedBuckets =
      [
        ...activityBuckets.keys(),
      ].sort(
        (left, right) =>
          left - right
      );

    let thinkingTimeMs =
      0;

    for (
      let index = 1;
      index <
      sortedBuckets.length;
      index += 1
    ) {
      const gapBuckets =
        sortedBuckets[index] -
        sortedBuckets[
          index - 1
        ];

      if (
        gapBuckets >
        INTERVIEW.THINKING_GAP_BUCKETS
      ) {
        thinkingTimeMs +=
          gapBuckets *
          INTERVIEW.SNAPSHOT_ACTIVITY_BUCKET_MS;
      }
    }

    return thinkingTimeMs;
  };

const computeStats = (
  snapshots,
  events
) => {
  const activityBuckets =
    buildActivityBuckets(
      snapshots
    );

  const runsPassed =
    events.filter(
      (event) =>
        event.type ===
        "run_pass"
    ).length;

  const runsFailed =
    events.filter(
      (event) =>
        event.type ===
        "run_fail"
    ).length;

  return {
    totalSnapshots:
      snapshots.length,

    totalEvents:
      events.length,

    runsPassed,

    runsFailed,

    estimatedThinkingTimeMs:
      estimateThinkingTime(
        activityBuckets
      ),

    activityHeatmap:
      Object.fromEntries(
        activityBuckets
      ),
  };
};

/* -------------------------------------------------------------------------- */
/*                           PLAYBACK CONSTRUCTOR                             */
/* -------------------------------------------------------------------------- */

/**
 * Builds playback replay payload.
 *
 * @param {string} interviewId
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const getPlaybackData =
  async (
    interviewId,
    userId
  ) => {
    const {
      interview,
      snapshots,
      events,
      notes,
    } =
      await findPlaybackData(
        interviewId
      );

    assertInterviewExists(
      interview,
      interviewId
    );

    assertPlaybackAccess(
      interview,
      userId
    );

    const problems =
      resolveProblems(
        interview
      );

    return Object.freeze({
      interview: {
        id: interview.id,

        status:
          interview.status,

        language:
          interview.language,

        duration:
          interview.duration,

        startedAt:
          interview.startedAt,

        endedAt:
          interview.endedAt,
      },

      problems:
        problems.map(
          (problem) => ({
            id: problem.id,

            title:
              problem.title,

            difficulty:
              problem.difficulty,
          })
        ),

      timeline:
        buildTimeline(
          interview,
          snapshots,
          events,
          notes
        ),

      stats:
        computeStats(
          snapshots,
          events
        ),

      report:
        interview.report ??
        null,
    });
  };