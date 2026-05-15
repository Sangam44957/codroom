/**
 * src/lib/enums.js
 *
 * Centralized immutable application enums.
 *
 * Design Goals:
 * - Eliminate magic strings
 * - Immutable enum contracts
 * - IDE autocomplete support
 * - Safer validation
 * - Shared domain vocabulary
 * - Backward compatibility during migration
 *
 * LLD Principles:
 * - Encapsulation
 * - DRY
 * - Explicit Contracts
 * - Immutability
 */

import { ValidationError } from "./errors.js";

/* -------------------------------------------------------------------------- */
/*                               ENUM FACTORY                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates an immutable enum object.
 *
 * Example:
 * createEnum(["ACTIVE", "PAUSED"])
 *
 * =>
 * {
 *   ACTIVE: "ACTIVE",
 *   PAUSED: "PAUSED"
 * }
 */
const createEnum = (values) => {
  return Object.freeze(
    values.reduce((accumulator, value) => {
      accumulator[value] = value;

      return accumulator;
    }, {})
  );
};

/**
 * Creates a key/value enum object.
 *
 * Example:
 * createMappedEnum({
 *   ACTIVE: "active"
 * })
 */
const createMappedEnum = (mapping) => {
  return Object.freeze({ ...mapping });
};

/* -------------------------------------------------------------------------- */
/*                               ROOM STATUS                                  */
/* -------------------------------------------------------------------------- */

export const RoomStatus = createMappedEnum({
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
});

/* -------------------------------------------------------------------------- */
/*                            INTERVIEW STATUS                                */
/* -------------------------------------------------------------------------- */

export const InterviewStatus = createMappedEnum({
  CREATED: "created",

  IN_PROGRESS: "in_progress",

  GENERATING: "generating",

  EVALUATED: "evaluated",

  COMPLETED: "completed",

  CANCELLED: "cancelled",
});

/* -------------------------------------------------------------------------- */
/*                                DIFFICULTY                                  */
/* -------------------------------------------------------------------------- */

export const Difficulty = createMappedEnum({
  EASY: "easy",

  MEDIUM: "medium",

  HARD: "hard",
});

/* -------------------------------------------------------------------------- */
/*                              RECOMMENDATION                                */
/* -------------------------------------------------------------------------- */

export const Recommendation = createEnum([
  "STRONG_HIRE",
  "HIRE",
  "BORDERLINE",
  "NO_HIRE",
]);

/* -------------------------------------------------------------------------- */
/*                              PIPELINE STATUS                               */
/* -------------------------------------------------------------------------- */

export const PipelineStatus = createEnum([
  "ACTIVE",
  "PAUSED",
  "CLOSED",
]);

/* -------------------------------------------------------------------------- */
/*                                 USER ROLE                                  */
/* -------------------------------------------------------------------------- */

export const UserRole = createEnum([
  "ADMIN",
  "USER",
  "MODERATOR",
]);

/* -------------------------------------------------------------------------- */
/*                              ROOM VISIBILITY                               */
/* -------------------------------------------------------------------------- */

export const RoomVisibility = createEnum([
  "PUBLIC",
  "PRIVATE",
]);

/* -------------------------------------------------------------------------- */
/*                             PIPELINE STAGES                                */
/* -------------------------------------------------------------------------- */

export const PipelineStage = createEnum([
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "HIRED",
]);

/* -------------------------------------------------------------------------- */
/*                              MESSAGE TYPES                                 */
/* -------------------------------------------------------------------------- */

export const MessageType = createEnum([
  "TEXT",
  "CODE",
  "SYSTEM",
  "IMAGE",
  "FILE",
]);

/* -------------------------------------------------------------------------- */
/*                              SOCKET EVENTS                                 */
/* -------------------------------------------------------------------------- */

export const SocketEvent = createMappedEnum({
  CONNECT: "connect",

  DISCONNECT: "disconnect",

  ROOM_JOIN: "room:join",

  ROOM_LEAVE: "room:leave",

  MESSAGE_SEND: "message:send",

  MESSAGE_RECEIVE: "message:receive",

  CODE_CHANGE: "code:change",

  USER_TYPING: "user:typing",
});

/* -------------------------------------------------------------------------- */
/*                            ENUM HELPER METHODS                             */
/* -------------------------------------------------------------------------- */

/**
 * Returns all enum values.
 *
 * @param {Readonly<Record<string, string>>} enumObject
 * @returns {string[]}
 */
export const enumValues = (enumObject) => {
  return Object.values(enumObject);
};

/**
 * Returns whether a value exists in the enum.
 *
 * @param {string} value
 * @param {Readonly<Record<string, string>>} enumObject
 * @returns {boolean}
 */
export const isEnumValue = (value, enumObject) => {
  return enumValues(enumObject).includes(value);
};

/**
 * Asserts that a value belongs to the enum.
 *
 * Throws ValidationError if invalid.
 *
 * @param {string} value
 * @param {Readonly<Record<string, string>>} enumObject
 * @param {string} fieldName
 */
export const assertEnum = (
  value,
  enumObject,
  fieldName = "field"
) => {
  const allowedValues = enumValues(enumObject);

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}: "${value}"`,
      {
        field: fieldName,
        received: value,
        allowedValues,
      }
    );
  }
};

/**
 * Returns enum value or fallback.
 *
 * @param {string} value
 * @param {Readonly<Record<string, string>>} enumObject
 * @param {string} fallback
 * @returns {string}
 */
export const getEnumValueOrDefault = (
  value,
  enumObject,
  fallback
) => {
  return isEnumValue(value, enumObject)
    ? value
    : fallback;
};

/* -------------------------------------------------------------------------- */
/*                      BACKWARD-COMPATIBLE ARRAY EXPORTS                     */
/* -------------------------------------------------------------------------- */

export const ROOM_STATUS = Object.freeze(
  enumValues(RoomStatus)
);

export const INTERVIEW_STATUS = Object.freeze(
  enumValues(InterviewStatus)
);

export const DIFFICULTY = Object.freeze(
  enumValues(Difficulty)
);

export const RECOMMENDATION = Object.freeze(
  enumValues(Recommendation)
);

export const PIPELINE_STATUS = Object.freeze(
  enumValues(PipelineStatus)
);

export const USER_ROLES = Object.freeze(
  enumValues(UserRole)
);

export const ROOM_VISIBILITY = Object.freeze(
  enumValues(RoomVisibility)
);

/* -------------------------------------------------------------------------- */
/*                                DEFAULT EXPORT                              */
/* -------------------------------------------------------------------------- */

export default Object.freeze({
  RoomStatus,
  InterviewStatus,
  Difficulty,
  Recommendation,
  PipelineStatus,
  UserRole,
  RoomVisibility,
  PipelineStage,
  MessageType,
  SocketEvent,

  enumValues,
  isEnumValue,
  assertEnum,
  getEnumValueOrDefault,
});