/**
 * src/services/template.service.js
 *
 * Interview template domain service.
 *
 * Responsibilities:
 * - Template CRUD orchestration
 * - Template validation
 * - Template ownership enforcement
 * - Pipeline-template linking
 *
 * NOT responsible for:
 * - Direct database access
 * - HTTP formatting
 * - Interview execution
 *
 * LLD Principles:
 * - SRP
 * - DRY
 * - Explicit Error Contracts
 * - Fail Fast
 */

import {
  findTemplatesByOwner,
  findTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/repositories/template.repository";

import {
  findPipelineByIdOnly,
} from "@/repositories/pipeline.repository";

import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";

import {
  VALID_LANGUAGES,
  DEFAULT_LANGUAGE,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_DURATION_MINUTES =
  60;

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const normalizeString = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
};

const normalizeArray = (
  value
) => {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value;
};

const assertTemplateExists = (
  template,
  templateId
) => {
  if (!template) {
    throw new NotFoundError(
      "Template",
      templateId
    );
  }
};

const assertTemplateOwnership = (
  template,
  userId
) => {
  if (
    template.ownerId !==
    userId
  ) {
    throw new ForbiddenError(
      "You do not own this template"
    );
  }
};

const assertValidLanguage = (
  language
) => {
  if (
    language &&
    !VALID_LANGUAGES.includes(
      language
    )
  ) {
    throw new ValidationError(
      "Invalid language",
      {
        allowedLanguages:
          VALID_LANGUAGES,
      }
    );
  }
};

const assertPipelineOwnership =
  async (
    pipelineId,
    userId
  ) => {
    if (!pipelineId) {
      return;
    }

    const pipeline =
      await findPipelineByIdOnly(
        pipelineId
      );

    if (
      !pipeline ||
      pipeline.createdById !==
        userId
    ) {
      throw new ValidationError(
        "Pipeline not found or access denied"
      );
    }
  };

const buildTemplatePayload =
  (
    payload,
    userId
  ) => {
    const {
      name,
      description,
      language,
      durationMinutes,
      problemIds,
      focusModeEnabled,
      rubricWeights,
      customPrompt,
      defaultPipelineId,
    } = payload;

    return {
      name:
        normalizeString(
          name
        ),

      description:
        normalizeString(
          description
        ) || null,

      ownerId:
        userId,

      language:
        language ||
        DEFAULT_LANGUAGE,

      durationMinutes:
        durationMinutes ||
        DEFAULT_DURATION_MINUTES,

      problemIds:
        normalizeArray(
          problemIds
        ),

      focusModeEnabled:
        Boolean(
          focusModeEnabled
        ),

      rubricWeights:
        rubricWeights ||
        null,

      customPrompt:
        normalizeString(
          customPrompt
        ) || null,

      defaultPipelineId:
        defaultPipelineId ||
        null,
    };
  };

const buildPartialUpdatePayload =
  (payload = {}) => {
    const {
      name,
      description,
      language,
      durationMinutes,
      problemIds,
      focusModeEnabled,
      rubricWeights,
      customPrompt,
      defaultPipelineId,
    } = payload;

    return {
      ...(name !== undefined && {
        name:
          normalizeString(
            name
          ),
      }),

      ...(description !==
        undefined && {
        description:
          normalizeString(
            description
          ) || null,
      }),

      ...(language !==
        undefined && {
        language,
      }),

      ...(durationMinutes !==
        undefined && {
        durationMinutes,
      }),

      ...(problemIds !==
        undefined && {
        problemIds:
          normalizeArray(
            problemIds
          ),
      }),

      ...(focusModeEnabled !==
        undefined && {
        focusModeEnabled:
          Boolean(
            focusModeEnabled
          ),
      }),

      ...(rubricWeights !==
        undefined && {
        rubricWeights,
      }),

      ...(customPrompt !==
        undefined && {
        customPrompt:
          normalizeString(
            customPrompt
          ) || null,
      }),

      ...(defaultPipelineId !==
        undefined && {
        defaultPipelineId:
          defaultPipelineId ||
          null,
      }),
    };
  };

/* -------------------------------------------------------------------------- */
/*                             LIST TEMPLATES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lists templates owned by user.
 *
 * @param {string} userId
 *
 * @returns {Promise<Array>}
 */
export const listTemplates =
  async (
    userId
  ) => {
    return findTemplatesByOwner(
      userId
    );
  };

/* -------------------------------------------------------------------------- */
/*                            CREATE TEMPLATE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Creates interview template.
 *
 * @param {Object} payload
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const createNewTemplate =
  async (
    payload = {},
    userId
  ) => {
    const {
      name,
      language,
      defaultPipelineId,
    } = payload;

    if (
      !normalizeString(
        name
      )
    ) {
      throw new ValidationError(
        "name is required"
      );
    }

    assertValidLanguage(
      language
    );

    await assertPipelineOwnership(
      defaultPipelineId,
      userId
    );

    return createTemplate(
      buildTemplatePayload(
        payload,
        userId
      )
    );
  };

/* -------------------------------------------------------------------------- */
/*                            UPDATE TEMPLATE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Updates existing template.
 *
 * @param {string} templateId
 * @param {Object} payload
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const updateExistingTemplate =
  async (
    templateId,
    payload = {},
    userId
  ) => {
    const template =
      await findTemplateById(
        templateId
      );

    assertTemplateExists(
      template,
      templateId
    );

    assertTemplateOwnership(
      template,
      userId
    );

    if (
      payload.language !==
      undefined
    ) {
      assertValidLanguage(
        payload.language
      );
    }

    if (
      payload.defaultPipelineId !==
      undefined
    ) {
      await assertPipelineOwnership(
        payload.defaultPipelineId,
        userId
      );
    }

    return updateTemplate(
      templateId,
      buildPartialUpdatePayload(
        payload
      )
    );
  };

/* -------------------------------------------------------------------------- */
/*                            REMOVE TEMPLATE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Deletes template.
 *
 * @param {string} templateId
 * @param {string} userId
 */
export const removeTemplate =
  async (
    templateId,
    userId
  ) => {
    const template =
      await findTemplateById(
        templateId
      );

    assertTemplateExists(
      template,
      templateId
    );

    assertTemplateOwnership(
      template,
      userId
    );

    await deleteTemplate(
      templateId
    );
  };

/* -------------------------------------------------------------------------- */
/*                         GET TEMPLATE FOR ROOM                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetches template for room usage.
 *
 * Ownership enforced.
 *
 * @param {string} templateId
 * @param {string} userId
 *
 * @returns {Promise<Object>}
 */
export const getTemplateForRoom =
  async (
    templateId,
    userId
  ) => {
    const template =
      await findTemplateById(
        templateId
      );

    assertTemplateExists(
      template,
      templateId
    );

    assertTemplateOwnership(
      template,
      userId
    );

    return template;
  };