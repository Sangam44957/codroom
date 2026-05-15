/**
 * src/repositories/user.repository.js
 *
 * User persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma user queries
 * - Centralize reusable user lookups
 * - Handle user CRUD persistence
 * - Expose authentication-related retrieval APIs
 *
 * NOT responsible for:
 * - Authentication logic
 * - Password hashing
 * - Authorization
 * - Validation
 * - HTTP formatting
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - Encapsulation
 * - DRY
 */

import prisma from "@/lib/db";

/* -------------------------------------------------------------------------- */
/*                              SHARED SELECTS                                */
/* -------------------------------------------------------------------------- */

export const USER_SELECT =
  Object.freeze({
    id: true,

    name: true,

    email: true,

    password: true,

    emailVerified:
      true,

    verifyToken: true,

    verifyTokenExpiry:
      true,

    resetToken: true,

    resetTokenExpiry:
      true,

    createdAt: true,

    updatedAt: true,
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const buildIdWhere = (
  id
) => ({
  id,
});

const buildEmailWhere = (
  email
) => ({
  email,
});

/* -------------------------------------------------------------------------- */
/*                           FIND USER BY EMAIL                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetch user by email.
 *
 * @param {string} email
 *
 * @returns {Promise<Object|null>}
 */
export const findUserByEmail =
  async (
    email
  ) => {
    return prisma.user.findUnique(
      {
        where:
          buildEmailWhere(
            email
          ),

        select:
          USER_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             FIND USER BY ID                                */
/* -------------------------------------------------------------------------- */

/**
 * Fetch user by id.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findUserById =
  async (
    id
  ) => {
    return prisma.user.findUnique(
      {
        where:
          buildIdWhere(
            id
          ),

        select:
          USER_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                               CREATE USER                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates user.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createUser =
  async (
    data
  ) => {
    return prisma.user.create(
      {
        data,

        select:
          USER_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                               UPDATE USER                                  */
/* -------------------------------------------------------------------------- */

/**
 * Updates user.
 *
 * @param {string} id
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updateUser =
  async (
    id,
    data
  ) => {
    return prisma.user.update(
      {
        where:
          buildIdWhere(
            id
          ),

        data,

        select:
          USER_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                       FIND USER BY VERIFY TOKEN                            */
/* -------------------------------------------------------------------------- */

/**
 * Fetch user by email verification token.
 *
 * @param {string} token
 *
 * @returns {Promise<Object|null>}
 */
export const findUserByVerifyToken =
  async (
    token
  ) => {
    return prisma.user.findUnique(
      {
        where: {
          verifyToken:
            token,
        },

        select:
          USER_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                        FIND USER BY RESET TOKEN                            */
/* -------------------------------------------------------------------------- */

/**
 * Fetch user by password reset token.
 *
 * @param {string} token
 *
 * @returns {Promise<Object|null>}
 */
export const findUserByResetToken =
  async (
    token
  ) => {
    return prisma.user.findUnique(
      {
        where: {
          resetToken:
            token,
        },

        select:
          USER_SELECT,
      }
    );
  };