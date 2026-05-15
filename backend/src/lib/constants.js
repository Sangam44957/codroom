/**
 * src/lib/constants.js
 *
 * Centralized application-wide constants.
 *
 * Design Goals:
 * - Eliminate magic numbers and magic strings
 * - Shared single source of truth
 * - Immutable runtime contracts
 * - Domain-oriented grouping
 * - Predictable platform-wide defaults
 *
 * LLD Principles:
 * - DRY
 * - KISS
 * - Separation of Concerns
 * - Explicit Contracts
 */

/* -------------------------------------------------------------------------- */
/*                                 PAGINATION                                 */
/* -------------------------------------------------------------------------- */

export const PAGE_LIMITS = Object.freeze({
  DEFAULT: 10,
  ROOMS: 12,
  PROBLEMS: 20,
  USERS: 25,
  MESSAGES: 50,
  AUDIT_LOGS: 100,
});

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  MIN_PAGE: 1,
  MAX_LIMIT: 100,
});

/* -------------------------------------------------------------------------- */
/*                             SUPPORTED LANGUAGES                            */
/* -------------------------------------------------------------------------- */

export const VALID_LANGUAGES = Object.freeze([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "csharp",
  "go",
  "rust",
]);

export const DEFAULT_LANGUAGE = "javascript";

/* -------------------------------------------------------------------------- */
/*                                  SHARING                                   */
/* -------------------------------------------------------------------------- */

export const SHARE = Object.freeze({
  TTL_DAYS: 30,
  MAX_ACTIVE_LINKS_PER_USER: 25,
});

/* -------------------------------------------------------------------------- */
/*                                CODE LIMITS                                 */
/* -------------------------------------------------------------------------- */

export const CODE_LIMITS = Object.freeze({
  MAX_CODE_BYTES: 64 * 1024,
  MAX_FILE_BYTES: 256 * 1024,
  MAX_CHAT_TEXT_CHARS: 2_000,
  MAX_MESSAGES_FETCH: 200,
  MAX_STDOUT_CHARS: 10_000,
  MAX_STDERR_CHARS: 10_000,
  MAX_EXECUTION_TIME_MS: 15_000,
});

/* -------------------------------------------------------------------------- */
/*                            INTERVIEW ANALYTICS                             */
/* -------------------------------------------------------------------------- */

export const INTERVIEW = Object.freeze({
  SNAPSHOT_ACTIVITY_BUCKET_MS: 60_000,

  THINKING_GAP_BUCKETS: 3,

  MAX_SESSION_HOURS: 6,

  MAX_RECORDING_SIZE_MB: 500,
});

/* -------------------------------------------------------------------------- */
/*                                   OTP                                      */
/* -------------------------------------------------------------------------- */

export const OTP = Object.freeze({
  VERIFY_TTL_MS: 10 * 60 * 1000,

  RESET_TTL_MS: 15 * 60 * 1000,

  MAX_ATTEMPTS: 5,

  RESEND_COOLDOWN_MS: 60 * 1000,
});

/* -------------------------------------------------------------------------- */
/*                                   REDIS                                    */
/* -------------------------------------------------------------------------- */

export const REDIS = Object.freeze({
  ROOM_TTL_SECONDS: 86_400,

  CACHE_TTL_SECONDS: 3_600,

  RATE_LIMIT_WINDOW_SECONDS: 60,

  PRESENCE_TTL_SECONDS: 120,
});

/* -------------------------------------------------------------------------- */
/*                               RATE LIMITING                                */
/* -------------------------------------------------------------------------- */

export const RATE_LIMITS = Object.freeze({
  LOGIN_ATTEMPTS_PER_MINUTE: 5,

  OTP_REQUESTS_PER_HOUR: 10,

  API_REQUESTS_PER_MINUTE: 120,

  MESSAGE_SENDS_PER_MINUTE: 60,

  ROOM_CREATIONS_PER_HOUR: 25,
});

/* -------------------------------------------------------------------------- */
/*                                 HTTP LAYER                                 */
/* -------------------------------------------------------------------------- */

export const HTTP = Object.freeze({
  REQUEST_TIMEOUT_MS: 15_000,

  MAX_REQUEST_BODY_BYTES: 1 * 1024 * 1024,

  DEFAULT_HEADERS: Object.freeze({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  }),
});

/* -------------------------------------------------------------------------- */
/*                                 SOCKET.IO                                  */
/* -------------------------------------------------------------------------- */

export const SOCKET = Object.freeze({
  CONNECTION_TIMEOUT_MS: 20_000,

  PING_INTERVAL_MS: 25_000,

  PING_TIMEOUT_MS: 60_000,

  MAX_DISCONNECTION_DURATION_MS: 5 * 60 * 1000,
});

/* -------------------------------------------------------------------------- */
/*                                 DATABASE                                   */
/* -------------------------------------------------------------------------- */

export const DATABASE = Object.freeze({
  DEFAULT_TRANSACTION_TIMEOUT_MS: 10_000,

  MAX_CONNECTION_POOL_SIZE: 20,

  SLOW_QUERY_THRESHOLD_MS: 500,
});

/* -------------------------------------------------------------------------- */
/*                                OBSERVABILITY                               */
/* -------------------------------------------------------------------------- */

export const OBSERVABILITY = Object.freeze({
  MAX_LOG_CONTEXT_DEPTH: 5,

  MAX_LOG_STRING_LENGTH: 5_000,

  METRICS_FLUSH_INTERVAL_MS: 30_000,
});

/* -------------------------------------------------------------------------- */
/*                              REGEX PATTERNS                                */
/* -------------------------------------------------------------------------- */

export const REGEX = Object.freeze({
  USERNAME: /^[a-zA-Z0-9_]{3,24}$/,

  ROOM_SLUG: /^[a-z0-9-]{3,50}$/,

  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  OTP: /^\d{6}$/,
});

/* -------------------------------------------------------------------------- */
/*                              COMMON ENUMS                                  */
/* -------------------------------------------------------------------------- */

export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  USER: "user",
  MODERATOR: "moderator",
});

export const ROOM_VISIBILITY = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
});

export const INTERVIEW_STATUS = Object.freeze({
  CREATED: "created",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

/* -------------------------------------------------------------------------- */
/*                               DEFAULT EXPORTS                              */
/* -------------------------------------------------------------------------- */

export default Object.freeze({
  PAGE_LIMITS,
  PAGINATION,
  VALID_LANGUAGES,
  DEFAULT_LANGUAGE,
  SHARE,
  CODE_LIMITS,
  INTERVIEW,
  OTP,
  REDIS,
  RATE_LIMITS,
  HTTP,
  SOCKET,
  DATABASE,
  OBSERVABILITY,
  REGEX,
  USER_ROLES,
  ROOM_VISIBILITY,
  INTERVIEW_STATUS,
});