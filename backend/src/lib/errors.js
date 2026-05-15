/**
 * src/lib/errors.js
 *
 * Centralized typed exception hierarchy for CodRoom.
 *
 * Design Goals:
 * - Fail-fast architecture
 * - Typed operational errors
 * - Transport-agnostic domain layer
 * - Immutable metadata
 * - Safe structured logging
 * - Consistent API error contracts
 * - Native ES Modules support
 */

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  OPERATION_IN_PROGRESS: "OPERATION_IN_PROGRESS",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
});

const freezeContext = (context = {}) => Object.freeze({ ...context });

const sanitizeContext = (context = {}) => {
  const forbiddenKeys = new Set([
    "password",
    "token",
    "authorization",
    "cookie",
    "secret",
    "accessToken",
    "refreshToken",
  ]);

  return Object.entries(context).reduce((acc, [key, value]) => {
    acc[key] = forbiddenKeys.has(key)
      ? "[REDACTED]"
      : value;

    return acc;
  }, {});
};

export class AppError extends Error {
  /**
   * @param {Object} options
   * @param {string} options.message
   * @param {string} options.code
   * @param {number} options.status
   * @param {Object} [options.context]
   * @param {Error|null} [options.cause]
   * @param {boolean} [options.operational]
   */
  constructor({
    message,
    code,
    status,
    context = {},
    cause = null,
    operational = true,
  }) {
    super(message, cause ? { cause } : undefined);

    this.name = this.constructor.name;

    Object.defineProperties(this, {
      code: {
        value: code,
        enumerable: true,
        writable: false,
      },

      status: {
        value: status,
        enumerable: true,
        writable: false,
      },

      context: {
        value: freezeContext(context),
        enumerable: true,
        writable: false,
      },

      operational: {
        value: operational,
        enumerable: true,
        writable: false,
      },
    });

    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                               CLIENT ERRORS                                */
/* -------------------------------------------------------------------------- */

export class ValidationError extends AppError {
  constructor(message, context = {}, cause = null) {
    super({
      message,
      code: ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      context,
      cause,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required",
    context = {},
    cause = null
  ) {
    super({
      message,
      code: ERROR_CODES.UNAUTHORIZED,
      status: 401,
      context,
      cause,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "Access denied",
    context = {},
    cause = null
  ) {
    super({
      message,
      code: ERROR_CODES.FORBIDDEN,
      status: 403,
      context,
      cause,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id = null, context = {}, cause = null) {
    super({
      message: `${resource} not found${id ? `: ${id}` : ""}`,
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      status: 404,
      context: {
        resource,
        id,
        ...context,
      },
      cause,
    });

    Object.defineProperties(this, {
      resource: {
        value: resource,
        enumerable: true,
      },

      resourceId: {
        value: id,
        enumerable: true,
      },
    });
  }
}

export class ConflictError extends AppError {
  constructor(message, context = {}, cause = null) {
    super({
      message,
      code: ERROR_CODES.CONFLICT,
      status: 409,
      context,
      cause,
    });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message, context = {}, cause = null) {
    super({
      message,
      code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      status: 413,
      context,
      cause,
    });
  }
}

export class UnprocessableError extends AppError {
  constructor(message, context = {}, cause = null) {
    super({
      message,
      code: ERROR_CODES.UNPROCESSABLE_ENTITY,
      status: 422,
      context,
      cause,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                               SERVER ERRORS                                */
/* -------------------------------------------------------------------------- */

export class ServiceUnavailableError extends AppError {
  constructor(service, context = {}, cause = null) {
    super({
      message: `${service} is temporarily unavailable`,
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
      status: 503,
      context: {
        service,
        ...context,
      },
      cause,
    });

    Object.defineProperty(this, "service", {
      value: service,
      enumerable: true,
    });
  }
}

export class ConflictGeneratingError extends AppError {
  constructor(
    message = "Operation already in progress",
    context = {},
    cause = null
  ) {
    super({
      message,
      code: ERROR_CODES.OPERATION_IN_PROGRESS,
      status: 409,
      context,
      cause,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = "Internal server error",
    context = {},
    cause = null
  ) {
    super({
      message,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      status: 500,
      context,
      cause,
      operational: false,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                           ROUTE LAYER MAPPER                               */
/* -------------------------------------------------------------------------- */

export const handleServiceError = (
  error,
  logger = console
) => {
  if (error instanceof AppError) {
    logger?.warn?.(
      {
        name: error.name,
        code: error.code,
        status: error.status,
        operational: error.operational,
        context: sanitizeContext(error.context),
        stack: error.stack,
        cause: error.cause,
      },
      error.message
    );

    return {
      status: error.status,
      body: error.toJSON(),
    };
  }

  logger?.error?.(
    {
      err: error,
      stack: error?.stack,
    },
    "Unhandled application error"
  );

  return {
    status: 500,
    body: {
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      },
    },
  };
};