/**
 * src/lib/auth.js
 *
 * Authentication infrastructure utilities.
 *
 * Responsibilities:
 * - Password hashing
 * - Password verification
 * - JWT creation/verification
 * - Auth cookie management
 * - Session extraction
 * - Optional DB-backed session validation
 *
 * NOT responsible for:
 * - Authorization rules
 * - Business logic
 * - User persistence
 * - HTTP responses
 *
 * LLD Principles:
 * - SRP
 * - Encapsulation
 * - Security by Default
 * - Fail-safe Authentication
 */

import "@/lib/validateEnv";

import bcrypt from "bcryptjs";

import {
  SignJWT,
  jwtVerify,
} from "jose";

import {
  cookies,
} from "next/headers";

import {
  SESSION_COOKIE_OPTIONS,
  clearCookie,
} from "@/lib/secureCookies";

import {
  config,
} from "@/lib/config";

import {
  logger,
} from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const COOKIE_NAME =
  "codroom-token";

const PASSWORD_SALT_ROUNDS =
  10;

const TOKEN_EXPIRY =
  "7d";

const JWT_SECRET =
  new TextEncoder().encode(
    config.jwtSecret
  );

/* -------------------------------------------------------------------------- */
/*                              HELPER METHODS                                */
/* -------------------------------------------------------------------------- */

const getCookieStore =
  async () => {
    return cookies();
  };

const getAuthToken =
  async () => {
    const cookieStore =
      await getCookieStore();

    return (
      cookieStore.get(
        COOKIE_NAME
      )?.value || null
    );
  };

const clearAuthCookie =
  async () => {
    const cookieStore =
      await getCookieStore();

    clearCookie(
      cookieStore,
      COOKIE_NAME
    );
  };

const buildJwtPayload = (
  payload
) => {
  return {
    ...payload,
  };
};

/* -------------------------------------------------------------------------- */
/*                           PASSWORD UTILITIES                               */
/* -------------------------------------------------------------------------- */

/**
 * Hashes password before persistence.
 *
 * @param {string} password
 *
 * @returns {Promise<string>}
 */
export const hashPassword =
  async (
    password
  ) => {
    return bcrypt.hash(
      password,
      PASSWORD_SALT_ROUNDS
    );
  };

/**
 * Verifies password against hash.
 *
 * @param {string} password
 * @param {string} hashedPassword
 *
 * @returns {Promise<boolean>}
 */
export const verifyPassword =
  async (
    password,
    hashedPassword
  ) => {
    return bcrypt.compare(
      password,
      hashedPassword
    );
  };

/* -------------------------------------------------------------------------- */
/*                              JWT UTILITIES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates signed JWT token.
 *
 * @param {Object} payload
 *
 * @returns {Promise<string>}
 */
export const createToken =
  async (
    payload
  ) => {
    return new SignJWT(
      buildJwtPayload(
        payload
      )
    )
      .setProtectedHeader({
        alg: "HS256",
      })
      .setExpirationTime(
        TOKEN_EXPIRY
      )
      .sign(JWT_SECRET);
  };

/**
 * Verifies JWT token.
 *
 * Returns null instead of throwing
 * for easier auth flow handling.
 *
 * @param {string} token
 *
 * @returns {Promise<Object|null>}
 */
export const verifyToken =
  async (
    token
  ) => {
    try {
      const {
        payload,
      } =
        await jwtVerify(
          token,
          JWT_SECRET
        );

      return payload;
    } catch {
      return null;
    }
  };

/* -------------------------------------------------------------------------- */
/*                             COOKIE UTILITIES                               */
/* -------------------------------------------------------------------------- */

/**
 * Sets authentication cookie.
 *
 * @param {string} token
 */
export const setAuthCookie =
  async (
    token
  ) => {
    const cookieStore =
      await getCookieStore();

    cookieStore.set(
      COOKIE_NAME,
      token,
      SESSION_COOKIE_OPTIONS
    );
  };

/**
 * Removes authentication cookie.
 */
export const removeAuthCookie =
  async () => {
    await clearAuthCookie();
  };

/* -------------------------------------------------------------------------- */
/*                           CURRENT USER HELPERS                             */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves authenticated JWT payload.
 *
 * JWT-only validation.
 *
 * Fast path for non-sensitive requests.
 *
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser =
  async () => {
    const token =
      await getAuthToken();

    if (!token) {
      return null;
    }

    return verifyToken(
      token
    );
  };

/* -------------------------------------------------------------------------- */
/*                       DB-VALIDATED USER SESSION                            */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves authenticated user
 * with database existence validation.
 *
 * Guards against:
 * - stale JWTs
 * - deleted users
 * - database resets
 *
 * Use for:
 * - destructive actions
 * - billing
 * - security-sensitive operations
 *
 * @returns {Promise<Object|null>}
 */
export const getCurrentUserWithDbCheck =
  async () => {
    const cookieStore =
      await getCookieStore();

    const token =
      cookieStore.get(
        COOKIE_NAME
      )?.value;

    if (!token) {
      return null;
    }

    const payload =
      await verifyToken(
        token
      );

    if (!payload) {
      return null;
    }

    try {
      /**
       * Lazy import:
       * avoids circular dependency
       * during startup.
       */
      const {
        default: prisma,
      } = await import(
        "@/lib/db"
      );

      const user =
        await prisma.user.findUnique(
          {
            where: {
              id: payload.userId,
            },

            select: {
              id: true,
            },
          }
        );

      if (!user) {
        await clearAuthCookie();

        return null;
      }
    } catch (error) {
      /**
       * DB unavailable:
       * allow upstream handlers
       * to decide behavior.
       */
      logger.warn(
        {
          err: error,
        },
        "DB validation skipped during auth check"
      );
    }

    return payload;
  };

/* -------------------------------------------------------------------------- */
/*                                EXPORTS                                     */
/* -------------------------------------------------------------------------- */

export {
  COOKIE_NAME,
};