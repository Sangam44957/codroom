/**
 * src/services/interview/index.js
 *
 * Public interview domain facade.
 *
 * This barrel file acts as the stable public API
 * for the interview domain.
 *
 * Route handlers and external consumers MUST import
 * only from:
 *
 * "@/services/interview"
 *
 * Never from internal sub-services directly.
 *
 * Benefits:
 * - Internal refactors remain isolated
 * - Future service splits do not affect callers
 * - Simplifies dependency graph
 * - Enables domain-level encapsulation
 *
 * LLD Principles:
 * - OCP
 * - Facade Pattern
 * - Encapsulation
 * - Stable Public Contracts
 */

/* -------------------------------------------------------------------------- */
/*                          INTERVIEW LIFECYCLE                               */
/* -------------------------------------------------------------------------- */

export {
  getInterview,
  startInterview,
  endInterview,
  deleteInterview,
} from "./interview.service.js";

/* -------------------------------------------------------------------------- */
/*                             SNAPSHOT SERVICE                               */
/* -------------------------------------------------------------------------- */

export {
  saveSnapshot,
  getSnapshots,
} from "./snapshot.service.js";

/* -------------------------------------------------------------------------- */
/*                               EVENT SERVICE                                */
/* -------------------------------------------------------------------------- */

export {
  saveEvent,
  getEvents,
} from "./event.service.js";

/* -------------------------------------------------------------------------- */
/*                                NOTE SERVICE                                */
/* -------------------------------------------------------------------------- */

export {
  getNote,
  saveNote,
} from "./note.service.js";

/* -------------------------------------------------------------------------- */
/*                              REPORT SERVICE                                */
/* -------------------------------------------------------------------------- */

export {
  generateReport,
  getReport,
  saveRubric,
} from "./report.service.js";

/* -------------------------------------------------------------------------- */
/*                               SHARE SERVICE                                */
/* -------------------------------------------------------------------------- */

export {
  generateShareToken,
  revokeShareToken,
  isShareTokenValid,
} from "./share.service.js";

/* -------------------------------------------------------------------------- */
/*                             PLAYBACK SERVICE                               */
/* -------------------------------------------------------------------------- */

export {
  getPlaybackData,
} from "./playback.service.js";

/* -------------------------------------------------------------------------- */
/*                              DOMAIN EXPORTS                                */
/* -------------------------------------------------------------------------- */

/**
 * Optional namespace exports.
 *
 * Useful for:
 * import * as InterviewService from "@/services/interview";
 */

export * as InterviewLifecycleService
  from "./interview.service.js";

export * as SnapshotService
  from "./snapshot.service.js";

export * as EventService
  from "./event.service.js";

export * as NoteService
  from "./note.service.js";

export * as ReportService
  from "./report.service.js";

export * as ShareService
  from "./share.service.js";

export * as PlaybackService
  from "./playback.service.js";