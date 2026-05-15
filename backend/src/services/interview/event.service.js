/**
 * src/services/interview/event.service.js
 *
 * Interview event service.
 *
 * Responsibilities:
 * - Persist timeline events
 * - Paginated event retrieval
 *
 * LLD:
 * - SRP
 * - Explicit contracts
 */

import {
  createEvent,
  findEventsPaginated,
} from "@/repositories/interview.repository";

/* -------------------------------------------------------------------------- */
/*                                SAVE EVENT                                  */
/* -------------------------------------------------------------------------- */

export const saveEvent =
  async (
    interviewId,
    {
      type,
      label,
    }
  ) => {
    return createEvent({
      interviewId,
      type,
      label,
    });
  };

/* -------------------------------------------------------------------------- */
/*                                GET EVENTS                                  */
/* -------------------------------------------------------------------------- */

export const getEvents =
  async (
    interviewId,
    {
      cursor = null,
      limit = 20,
    } = {}
  ) => {
    const rows =
      await findEventsPaginated(
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
      events: rows,
      nextCursor:
        hasMore
          ? rows[
              rows.length -
                1
            ]?.id
          : null,
    });
  };