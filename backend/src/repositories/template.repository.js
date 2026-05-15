/**
 * src/repositories/template.repository.js
 *
 * Interview template persistence layer.
 *
 * Responsibilities:
 * - Encapsulate Prisma template queries
 * - Centralize reusable template projections
 * - Handle template CRUD persistence
 * - Expose optimized template retrieval APIs
 *
 * NOT responsible for:
 * - Validation
 * - Authorization
 * - Business logic
 * - HTTP formatting
 *
 * LLD Principles:
 * - Repository Pattern
 * - SRP
 * - DRY
 * - Encapsulation
 */

import prisma from "@/lib/db";

/* -------------------------------------------------------------------------- */
/*                              SHARED SELECTS                                */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_SELECT =
  Object.freeze({
    id: true,

    name: true,

    description: true,

    language: true,

    durationMinutes:
      true,

    problemIds: true,

    focusModeEnabled:
      true,

    rubricWeights:
      true,

    customPrompt:
      true,

    defaultPipelineId:
      true,

    usageCount: true,

    createdAt: true,

    updatedAt: true,

    ownerId: true,
  });

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const buildOwnerWhere = (
  ownerId
) => {
  return {
    ownerId,
  };
};

/* -------------------------------------------------------------------------- */
/*                          FIND TEMPLATES BY OWNER                           */
/* -------------------------------------------------------------------------- */

/**
 * Fetch templates owned by user.
 *
 * @param {string} ownerId
 *
 * @returns {Promise<Array>}
 */
export const findTemplatesByOwner =
  async (
    ownerId
  ) => {
    return prisma.interviewTemplate.findMany(
      {
        where:
          buildOwnerWhere(
            ownerId
          ),

        orderBy: {
          createdAt:
            "desc",
        },

        select:
          TEMPLATE_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                            FIND TEMPLATE BY ID                             */
/* -------------------------------------------------------------------------- */

/**
 * Fetch template by id.
 *
 * @param {string} id
 *
 * @returns {Promise<Object|null>}
 */
export const findTemplateById =
  async (
    id
  ) => {
    return prisma.interviewTemplate.findUnique(
      {
        where: { id },

        select:
          TEMPLATE_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             CREATE TEMPLATE                                */
/* -------------------------------------------------------------------------- */

/**
 * Creates interview template.
 *
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const createTemplate =
  async (
    data
  ) => {
    return prisma.interviewTemplate.create(
      {
        data,

        select:
          TEMPLATE_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             UPDATE TEMPLATE                                */
/* -------------------------------------------------------------------------- */

/**
 * Updates interview template.
 *
 * @param {string} id
 * @param {Object} data
 *
 * @returns {Promise<Object>}
 */
export const updateTemplate =
  async (
    id,
    data
  ) => {
    return prisma.interviewTemplate.update(
      {
        where: { id },

        data,

        select:
          TEMPLATE_SELECT,
      }
    );
  };

/* -------------------------------------------------------------------------- */
/*                             DELETE TEMPLATE                                */
/* -------------------------------------------------------------------------- */

/**
 * Deletes interview template.
 *
 * @param {string} id
 *
 * @returns {Promise<Object>}
 */
export const deleteTemplate =
  async (
    id
  ) => {
    return prisma.interviewTemplate.delete(
      {
        where: { id },
      }
    );
  };