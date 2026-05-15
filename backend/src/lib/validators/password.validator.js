/**
 * src/lib/validators/password.validator.js
 *
 * Centralized password validation rules for CodRoom.
 *
 * Design Goals:
 * - Single source of truth for password policy
 * - Reusable across auth flows
 * - Explicit validation contracts
 * - Extensible rule system
 * - Predictable validation responses
 *
 * LLD Principles:
 * - DRY
 * - SRP
 * - Open/Closed Principle
 * - Explicit Contracts
 */

import { ValidationError } from "../errors.js";

/* -------------------------------------------------------------------------- */
/*                              PASSWORD POLICY                               */
/* -------------------------------------------------------------------------- */

export const PASSWORD_RULES = Object.freeze({
  MIN_LENGTH: 8,

  MAX_LENGTH: 128,

  REQUIRE_UPPERCASE: true,

  REQUIRE_LOWERCASE: true,

  REQUIRE_NUMBER: true,

  REQUIRE_SPECIAL_CHARACTER: false,
});

/* -------------------------------------------------------------------------- */
/*                              REGEX PATTERNS                                */
/* -------------------------------------------------------------------------- */

const PASSWORD_PATTERNS = Object.freeze({
  UPPERCASE: /[A-Z]/,

  LOWERCASE: /[a-z]/,

  NUMBER: /[0-9]/,

  SPECIAL_CHARACTER: /[^A-Za-z0-9]/,
});

/* -------------------------------------------------------------------------- */
/*                              HELPER METHODS                                */
/* -------------------------------------------------------------------------- */

const createFailure = (reason, code) => {
  return {
    valid: false,
    reason,
    code,
  };
};

const createSuccess = () => {
  return {
    valid: true,
  };
};

/* -------------------------------------------------------------------------- */
/*                            PASSWORD VALIDATION                             */
/* -------------------------------------------------------------------------- */

/**
 * Validates a password against CodRoom policy.
 *
 * @param {string} password
 *
 * @returns {{
 *   valid: true
 * } | {
 *   valid: false,
 *   reason: string,
 *   code: string
 * }}
 */
export const validatePassword = (password) => {
  if (
    password === undefined ||
    password === null ||
    typeof password !== "string"
  ) {
    return createFailure(
      "Password is required",
      "PASSWORD_REQUIRED"
    );
  }

  const normalizedPassword = password.trim();

  if (!normalizedPassword.length) {
    return createFailure(
      "Password cannot be empty",
      "PASSWORD_EMPTY"
    );
  }

  if (
    normalizedPassword.length < PASSWORD_RULES.MIN_LENGTH ||
    normalizedPassword.length > PASSWORD_RULES.MAX_LENGTH
  ) {
    return createFailure(
      `Password must be between ${PASSWORD_RULES.MIN_LENGTH} and ${PASSWORD_RULES.MAX_LENGTH} characters`,
      "PASSWORD_INVALID_LENGTH"
    );
  }

  if (
    PASSWORD_RULES.REQUIRE_UPPERCASE &&
    !PASSWORD_PATTERNS.UPPERCASE.test(normalizedPassword)
  ) {
    return createFailure(
      "Password must contain at least one uppercase letter",
      "PASSWORD_MISSING_UPPERCASE"
    );
  }

  if (
    PASSWORD_RULES.REQUIRE_LOWERCASE &&
    !PASSWORD_PATTERNS.LOWERCASE.test(normalizedPassword)
  ) {
    return createFailure(
      "Password must contain at least one lowercase letter",
      "PASSWORD_MISSING_LOWERCASE"
    );
  }

  if (
    PASSWORD_RULES.REQUIRE_NUMBER &&
    !PASSWORD_PATTERNS.NUMBER.test(normalizedPassword)
  ) {
    return createFailure(
      "Password must contain at least one number",
      "PASSWORD_MISSING_NUMBER"
    );
  }

  if (
    PASSWORD_RULES.REQUIRE_SPECIAL_CHARACTER &&
    !PASSWORD_PATTERNS.SPECIAL_CHARACTER.test(normalizedPassword)
  ) {
    return createFailure(
      "Password must contain at least one special character",
      "PASSWORD_MISSING_SPECIAL_CHARACTER"
    );
  }

  return createSuccess();
};

/* -------------------------------------------------------------------------- */
/*                         THROWING VALIDATION HELPER                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates password and throws ValidationError on failure.
 *
 * Useful inside services/controllers that already use exceptions.
 *
 * @param {string} password
 */
export const assertValidPassword = (password) => {
  const validationResult = validatePassword(password);

  if (!validationResult.valid) {
    throw new ValidationError(
      validationResult.reason,
      {
        code: validationResult.code,
      }
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                           PASSWORD STRENGTH SCORE                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns a simple password strength score.
 *
 * Score Range:
 * 0 → Weak
 * 1 → Fair
 * 2 → Good
 * 3 → Strong
 * 4 → Very Strong
 *
 * @param {string} password
 *
 * @returns {{
 *   score: number,
 *   label: string
 * }}
 */
export const getPasswordStrength = (password) => {
  if (!password || typeof password !== "string") {
    return {
      score: 0,
      label: "Weak",
    };
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (PASSWORD_PATTERNS.UPPERCASE.test(password)) {
    score += 1;
  }

  if (PASSWORD_PATTERNS.LOWERCASE.test(password)) {
    score += 1;
  }

  if (PASSWORD_PATTERNS.NUMBER.test(password)) {
    score += 1;
  }

  if (PASSWORD_PATTERNS.SPECIAL_CHARACTER.test(password)) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  const normalizedScore = Math.min(score, 4);

  const labels = [
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very Strong",
  ];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
  };
};

/* -------------------------------------------------------------------------- */
/*                                DEFAULT EXPORT                              */
/* -------------------------------------------------------------------------- */

export default Object.freeze({
  PASSWORD_RULES,

  validatePassword,

  assertValidPassword,

  getPasswordStrength,
});