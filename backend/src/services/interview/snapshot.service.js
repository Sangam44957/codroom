/**
 * src/services/interview/snapshot.service.js
 *
 * Snapshot persistence service.
 *
 * Responsibilities:
 * - Save snapshots
 * - Paginated snapshot retrieval
 *
 * LLD:
 * - SRP
 * - Pagination abstraction
 */

import {
  createSnapshot,
  findSnapshotsPaginated,
} from "@/repositories/interview.repository";

/* -------------------------------------------------------------------------- */
/*                               SAVE SNAPSHOT                                */
/* -------------------------------------------------------------------------- */

export const saveSnapshot =
  async (
    interviewId,
    code = ""
  ) => {
    return createSnapshot({
      interviewId,
      code,
    });
  };

/* -------------------------------------------------------------------------- */
/*                              GET SNAPSHOTS                                 */
/* -------------------------------------------------------------------------- */

export const getSnapshots =
  async (
    interviewId,
    {
      cursor = null,
      limit = 20,
    } = {}
  ) => {
    const rows =
      await findSnapshotsPaginated(
        interviewId,
        {
          cursor,
          limit,
        }
      );

    const hasMore =
      rows.length > limit;

    if (hasMore) {
      rows.pop();
    }

    return Object.freeze({
      snapshots: rows,
      nextCursor:
        hasMore
          ? rows[
              rows.length -
                1
            ]?.id
          : null,
    });
  };