/**
 * src/services/auth.service.js
 *
 * Authentication service — business logic orchestration only.
 *
 * Responsibilities:
 * - Register / login / logout flows
 * - Email verification flows
 * - Password reset flows
 * - Session/token orchestration
 *
 * NOT responsible for:
 * - Input validation
 * - HTTP response formatting
 * - Raw process.env access
 * - Database implementation details
 * - Email implementation details
 *
 * LLD Principles:
 * - SRP
 * - DRY
 * - Fail Fast
 * - Explicit Error Contracts
 * - Separation of Concerns
 */

import { randomInt } from "crypto";

import bcrypt from "bcryptjs";

import {
  findUserByEmail,
  createUser,
  updateUser,
} from "@/repositories/user.repository";

import {
  hashPassword,
  verifyPassword,
  createToken,
  setAuthCookie,
  removeAuthCookie,
} from "@/lib/auth";

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

import { logger } from "@/lib/logger";

import { config } from "@/lib/config";

import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
} from "@/lib/errors";

import {
  validateRegisterPayload,
  validateLoginPayload,
  validateVerifyOtpPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
} from "@/lib/validators/auth.validator";

import {
  OTP,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const generateOtp = () => {
  return String(
    randomInt(100_000, 999_999)
  );
};

const createOtpExpiry = (
  ttlMs
) => {
  return new Date(
    Date.now() + ttlMs
  );
};

const normalizeEmail = (
  email
) => {
  return email
    .trim()
    .toLowerCase();
};

const createSession = async (
  user
) => {
  const token =
    await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

  await setAuthCookie(token);
};

const queueVerificationEmail = (
  user,
  otp
) => {
  sendVerificationEmail(
    user.email,
    otp
  ).catch((error) => {
    logger.error(
      {
        err: error,
        userId: user.id,
        email: user.email,
      },
      "Verification email delivery failed"
    );
  });
};

const queuePasswordResetEmail = (
  user,
  otp
) => {
  sendPasswordResetEmail(
    user.email,
    otp
  ).catch((error) => {
    logger.error(
      {
        err: error,
        userId: user.id,
        email: user.email,
      },
      "Password reset email delivery failed"
    );
  });
};

const assertEmailVerificationAllowed = (
  user
) => {
  if (!user) {
    throw new NotFoundError(
      "User"
    );
  }

  if (user.emailVerified) {
    throw new ValidationError(
      "Email already verified"
    );
  }
};

const assertOtpNotExpired = (
  expiryDate,
  errorMessage
) => {
  if (
    expiryDate &&
    new Date() >
      new Date(expiryDate)
  ) {
    throw new ValidationError(
      errorMessage
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                                   LOGIN                                    */
/* -------------------------------------------------------------------------- */

/**
 * Authenticates a user and creates a session.
 *
 * @param {Object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 *
 * @returns {{
 *   id: string,
 *   name: string,
 *   email: string
 * }}
 */
export const login = async (
  payload = {}
) => {
  const {
    email,
    password,
  } = validateLoginPayload(
    payload
  );

  const user =
    await findUserByEmail(
      email
    );

  const passwordValid =
    user &&
    (await verifyPassword(
      password,
      user.password
    ));

  /**
   * Use same error message for:
   * - missing user
   * - invalid password
   *
   * Prevents email enumeration.
   */
  if (!passwordValid) {
    throw new UnauthorizedError(
      "Invalid email or password"
    );
  }

  if (!user.emailVerified) {
    throw new ForbiddenError(
      "Please verify your email before signing in",
      {
        email: user.email,
        needsVerification: true,
      }
    );
  }

  await createSession(user);

  return Object.freeze({
    id: user.id,
    name: user.name,
    email: user.email,
  });
};

/* -------------------------------------------------------------------------- */
/*                                  REGISTER                                  */
/* -------------------------------------------------------------------------- */

/**
 * Registers a new user account.
 *
 * @param {Object} payload
 *
 * @returns {Object}
 */
export const register = async (
  payload = {}
) => {
  const {
    name,
    email,
    password,
  } =
    validateRegisterPayload(
      payload
    );

  const existingUser =
    await findUserByEmail(
      email
    );

  if (existingUser) {
    throw new ConflictError(
      "Email already registered",
      {
        email,
      }
    );
  }

  const hashedPassword =
    await hashPassword(
      password
    );

  const otp = generateOtp();

  const otpExpiry =
    createOtpExpiry(
      OTP.VERIFY_TTL_MS
    );

  const otpHash =
    config.emailEnabled
      ? await bcrypt.hash(
          otp,
          10
        )
      : null;

  const user =
    await createUser({
      name,
      email,
      password:
        hashedPassword,

      verifyOtp: otpHash,

      verifyOtpExpiry:
        config.emailEnabled
          ? otpExpiry
          : null,

      emailVerified:
        !config.emailEnabled,
    });

  if (config.emailEnabled) {
    queueVerificationEmail(
      user,
      otp
    );

    return Object.freeze({
      needsVerification: true,
      email: user.email,
      message:
        "Account created. Enter the verification code sent to your email.",
    });
  }

  /**
   * Development mode:
   * automatically authenticate.
   */
  await createSession(user);

  return Object.freeze({
    id: user.id,
    name: user.name,
    email: user.email,
  });
};

/* -------------------------------------------------------------------------- */
/*                                   LOGOUT                                   */
/* -------------------------------------------------------------------------- */

/**
 * Removes auth session.
 */
export const logout =
  async () => {
    await removeAuthCookie();
  };

/* -------------------------------------------------------------------------- */
/*                             VERIFY EMAIL                                   */
/* -------------------------------------------------------------------------- */

/**
 * Verifies user email using OTP.
 *
 * @param {Object} payload
 *
 * @returns {{
 *   id: string,
 *   name: string,
 *   email: string
 * }}
 */
export const verifyEmail =
  async (payload = {}) => {
    const {
      email,
      otp,
    } =
      validateVerifyOtpPayload(
        payload
      );

    const user =
      await findUserByEmail(
        email
      );

    assertEmailVerificationAllowed(
      user
    );

    const otpValid =
      user.verifyOtp &&
      (await bcrypt.compare(
        otp,
        user.verifyOtp
      ));

    if (!otpValid) {
      throw new ValidationError(
        "Invalid verification code"
      );
    }

    assertOtpNotExpired(
      user.verifyOtpExpiry,
      "Verification code expired. Request a new one."
    );

    await updateUser(
      user.id,
      {
        emailVerified: true,

        verifyOtp: null,

        verifyOtpExpiry:
          null,

        verifyToken: null,
      }
    );

    await createSession(user);

    return Object.freeze({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  };

/* -------------------------------------------------------------------------- */
/*                            FORGOT PASSWORD                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sends password reset OTP.
 *
 * Always returns success semantics
 * to prevent email enumeration.
 *
 * @param {Object} payload
 */
export const forgotPassword =
  async (payload = {}) => {
    const { email } =
      validateForgotPasswordPayload(
        payload
      );

    const user =
      await findUserByEmail(
        email
      );

    /**
     * Prevent email enumeration.
     */
    if (
      !user ||
      !user.emailVerified
    ) {
      return;
    }

    const otp = generateOtp();

    const expiry =
      createOtpExpiry(
        OTP.RESET_TTL_MS
      );

    const otpHash =
      await bcrypt.hash(
        otp,
        10
      );

    await updateUser(
      user.id,
      {
        resetOtp: otpHash,

        resetOtpExpiry:
          expiry,
      }
    );

    queuePasswordResetEmail(
      user,
      otp
    );
  };

/* -------------------------------------------------------------------------- */
/*                             RESET PASSWORD                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resets user password using OTP.
 *
 * @param {Object} payload
 */
export const resetPassword =
  async (payload = {}) => {
    const {
      email,
      otp,
      password,
    } =
      validateResetPasswordPayload(
        payload
      );

    const user =
      await findUserByEmail(
        email
      );

    const resetOtpValid =
      user?.resetOtp &&
      (await bcrypt.compare(
        otp,
        user.resetOtp
      ));

    if (!resetOtpValid) {
      throw new ValidationError(
        "Invalid or expired reset code"
      );
    }

    assertOtpNotExpired(
      user.resetOtpExpiry,
      "Reset code expired. Request a new one."
    );

    const hashedPassword =
      await hashPassword(
        password
      );

    await updateUser(
      user.id,
      {
        password:
          hashedPassword,

        resetOtp: null,

        resetOtpExpiry:
          null,

        resetToken: null,

        resetTokenExpiry:
          null,
      }
    );
  };