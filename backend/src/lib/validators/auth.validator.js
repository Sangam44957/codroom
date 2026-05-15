/**
 * src/lib/validators/auth.validator.js
 *
 * Centralized authentication payload validators.
 *
 * Design Goals:
 * - Remove validation logic from services
 * - Fail-fast validation
 * - Consistent payload normalization
 * - Reusable validation utilities
 * - Explicit validation contracts
 *
 * LLD Principles:
 * - SRP
 * - DRY
 * - Fail Fast
 * - Explicit Contracts
 */

import { ValidationError } from "../errors.js";

import {
  validatePassword,
  assertValidPassword,
} from "./password.validator.js";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OTP_REGEX = /^\d{4,8}$/;

const NAME_RULES = Object.freeze({
  MIN_LENGTH: 2,

  MAX_LENGTH: 80,
});

/* -------------------------------------------------------------------------- */
/*                              NORMALIZERS                                   */
/* -------------------------------------------------------------------------- */

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeEmail = (email) => {
  return normalizeString(email).toLowerCase();
};

/* -------------------------------------------------------------------------- */
/*                             VALIDATION HELPERS                             */
/* -------------------------------------------------------------------------- */

const assertRequired = (
  value,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    throw new ValidationError(
      `${fieldName} is required`,
      {
        field: fieldName,
      }
    );
  }
};

const assertValidEmail = (email) => {
  const normalizedEmail =
    normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new ValidationError(
      "Enter a valid email address",
      {
        field: "email",
      }
    );
  }

  return normalizedEmail;
};

const assertValidName = (name) => {
  const normalizedName =
    normalizeString(name);

  if (
    normalizedName.length <
      NAME_RULES.MIN_LENGTH ||
    normalizedName.length >
      NAME_RULES.MAX_LENGTH
  ) {
    throw new ValidationError(
      `Name must be between ${NAME_RULES.MIN_LENGTH} and ${NAME_RULES.MAX_LENGTH} characters`,
      {
        field: "name",
        minLength: NAME_RULES.MIN_LENGTH,
        maxLength: NAME_RULES.MAX_LENGTH,
      }
    );
  }

  return normalizedName;
};

const assertValidOtp = (otp) => {
  const normalizedOtp =
    normalizeString(otp);

  if (!OTP_REGEX.test(normalizedOtp)) {
    throw new ValidationError(
      "Invalid OTP format",
      {
        field: "otp",
      }
    );
  }

  return normalizedOtp;
};

/* -------------------------------------------------------------------------- */
/*                         REGISTER PAYLOAD VALIDATOR                         */
/* -------------------------------------------------------------------------- */

/**
 * Validates registration payload.
 *
 * Returns normalized payload.
 *
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} payload.password
 *
 * @returns {{
 *   name: string,
 *   email: string,
 *   password: string
 * }}
 *
 * @throws {ValidationError}
 */
export const validateRegisterPayload = (
  payload = {}
) => {
  const {
    name,
    email,
    password,
  } = payload;

  assertRequired(name, "name");

  assertRequired(email, "email");

  assertRequired(password, "password");

  const normalizedName =
    assertValidName(name);

  const normalizedEmail =
    assertValidEmail(email);

  assertValidPassword(password);

  return Object.freeze({
    name: normalizedName,
    email: normalizedEmail,
    password,
  });
};

/* -------------------------------------------------------------------------- */
/*                          LOGIN PAYLOAD VALIDATOR                           */
/* -------------------------------------------------------------------------- */

/**
 * Validates login payload.
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 *
 * @returns {{
 *   email: string,
 *   password: string
 * }}
 *
 * @throws {ValidationError}
 */
export const validateLoginPayload = (
  payload = {}
) => {
  const {
    email,
    password,
  } = payload;

  assertRequired(email, "email");

  assertRequired(password, "password");

  const normalizedEmail =
    assertValidEmail(email);

  return Object.freeze({
    email: normalizedEmail,
    password,
  });
};

/* -------------------------------------------------------------------------- */
/*                    RESET PASSWORD PAYLOAD VALIDATOR                        */
/* -------------------------------------------------------------------------- */

/**
 * Validates reset password payload.
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.otp
 * @param {string} payload.password
 *
 * @returns {{
 *   email: string,
 *   otp: string,
 *   password: string
 * }}
 *
 * @throws {ValidationError}
 */
export const validateResetPasswordPayload = (
  payload = {}
) => {
  const {
    email,
    otp,
    password,
  } = payload;

  assertRequired(email, "email");

  assertRequired(otp, "otp");

  assertRequired(password, "password");

  const normalizedEmail =
    assertValidEmail(email);

  const normalizedOtp =
    assertValidOtp(otp);

  assertValidPassword(password);

  return Object.freeze({
    email: normalizedEmail,
    otp: normalizedOtp,
    password,
  });
};

/* -------------------------------------------------------------------------- */
/*                    REQUEST PASSWORD RESET VALIDATOR                        */
/* -------------------------------------------------------------------------- */

/**
 * Validates forgot-password payload.
 *
 * @param {Object} payload
 * @param {string} payload.email
 *
 * @returns {{
 *   email: string
 * }}
 *
 * @throws {ValidationError}
 */
export const validateForgotPasswordPayload = (
  payload = {}
) => {
  const { email } = payload;

  assertRequired(email, "email");

  const normalizedEmail =
    assertValidEmail(email);

  return Object.freeze({
    email: normalizedEmail,
  });
};

/* -------------------------------------------------------------------------- */
/*                           VERIFY OTP VALIDATOR                             */
/* -------------------------------------------------------------------------- */

/**
 * Validates OTP verification payload.
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.otp
 *
 * @returns {{
 *   email: string,
 *   otp: string
 * }}
 *
 * @throws {ValidationError}
 */
export const validateVerifyOtpPayload = (
  payload = {}
) => {
  const {
    email,
    otp,
  } = payload;

  assertRequired(email, "email");

  assertRequired(otp, "otp");

  const normalizedEmail =
    assertValidEmail(email);

  const normalizedOtp =
    assertValidOtp(otp);

  return Object.freeze({
    email: normalizedEmail,
    otp: normalizedOtp,
  });
};

/* -------------------------------------------------------------------------- */
/*                              EXPORT HELPERS                                */
/* -------------------------------------------------------------------------- */

export {
  EMAIL_REGEX,
  OTP_REGEX,
  NAME_RULES,
  validatePassword,
};