/**
 * src/services/interview/note.service.js
 *
 * Interview notes service.
 *
 * Responsibilities:
 * - Retrieve notes
 * - Save notes
 *
 * LLD:
 * - SRP
 * - Encapsulation
 */

import {
  findNoteByInterview,
  upsertNote,
} from "@/repositories/interview.repository";

/* -------------------------------------------------------------------------- */
/*                                 GET NOTE                                   */
/* -------------------------------------------------------------------------- */

export const getNote =
  async (
    interviewId
  ) => {
    return findNoteByInterview(
      interviewId
    );
  };

/* -------------------------------------------------------------------------- */
/*                                SAVE NOTE                                   */
/* -------------------------------------------------------------------------- */

export const saveNote =
  async (
    interviewId,
    content = ""
  ) => {
    return upsertNote(
      interviewId,
      content.trim()
    );
  };