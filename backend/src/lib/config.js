/**
 * src/lib/config.js
 *
 * Centralized runtime configuration for CodRoom.
 *
 * Design Goals:
 * - Single source of truth for runtime configuration
 * - Zero scattered process.env access
 * - Immutable configuration contract
 * - Environment validation at startup
 * - Shared platform-wide constants
 * - Predictable defaults
 *
 * LLD Principles:
 * - Separation of Concerns
 * - DRY
 * - Fail Fast
 * - Explicit Contracts
 */

import { InternalServerError } from "./errors.js";

/* -------------------------------------------------------------------------- */
/*                              ENVIRONMENT HELPERS                           */
/* -------------------------------------------------------------------------- */

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isNaN(parsed)
    ? fallback
    : parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

const getEnv = (key, fallback = undefined) => {
  return process.env[key] ?? fallback;
};

const requireEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new InternalServerError(
      `Missing required environment variable: ${key}`,
      {
        envKey: key,
      }
    );
  }

  return value;
};

/* -------------------------------------------------------------------------- */
/*                              PLATFORM CONSTANTS                            */
/* -------------------------------------------------------------------------- */

export const VALID_LANGUAGES = Object.freeze([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "c",
  "go",
  "rust",
]);

export const SHARE_TTL_DAYS = 7;

export const DEFAULT_PAGINATION_LIMIT = 20;

export const MAX_PAGINATION_LIMIT = 100;

export const DEFAULT_SOCKET_PORT = 3001;

export const DEFAULT_APP_URL = "http://localhost:3000";

export const DEFAULT_SOCKET_URL = "http://localhost:3001";

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

const nodeEnv = getEnv("NODE_ENV", "development");

const isProduction = nodeEnv === "production";

const logLevel = getEnv(
  "LOG_LEVEL",
  isProduction
    ? "info"
    : "debug"
);

const appConfig = {
  /* ---------------------------------- URLs --------------------------------- */

  appUrl: getEnv(
    "NEXT_PUBLIC_APP_URL",
    DEFAULT_APP_URL
  ),

  socketUrl: getEnv(
    "NEXT_PUBLIC_SOCKET_URL",
    DEFAULT_SOCKET_URL
  ),

  /* ---------------------------------- AUTH --------------------------------- */

  jwtSecret: getEnv("JWT_SECRET"),

  internalSecret: getEnv("INTERNAL_SECRET"),

  /* -------------------------------- DATABASE ------------------------------- */

  databaseUrl: getEnv("DATABASE_URL"),

  /* --------------------------------- REDIS --------------------------------- */

  redisUrl: getEnv("REDIS_URL"),

  upstashRestUrl: getEnv("UPSTASH_REDIS_REST_URL"),

  upstashRestToken: getEnv("UPSTASH_REDIS_REST_TOKEN"),

  /* --------------------------- EXTERNAL SERVICES --------------------------- */

  groqApiKey: getEnv("GROQ_API_KEY"),

  brevoApiKey: getEnv("BREVO_API_KEY"),

  brevoSenderEmail: getEnv("BREVO_SENDER_EMAIL"),

  /* ------------------------------ OBSERVABILITY ---------------------------- */

  logLevel,

  sentryDsn: getEnv("SENTRY_DSN"),

  /* -------------------------------- RUNTIME ------------------------------- */

  nodeEnv,

  socketPort: parseInteger(
    getEnv("SOCKET_PORT"),
    DEFAULT_SOCKET_PORT
  ),

  enableMetrics: parseBoolean(
    getEnv("ENABLE_METRICS"),
    false
  ),

  /* ----------------------------- FEATURE FLAGS ----------------------------- */

  emailEnabled: Boolean(
    getEnv("BREVO_API_KEY")
  ),

  isProduction,

  isDevelopment: nodeEnv === "development",

  isTest: nodeEnv === "test",
};

/* -------------------------------------------------------------------------- */
/*                           STARTUP CONFIG VALIDATION                        */
/* -------------------------------------------------------------------------- */

const validateConfig = () => {
  if (config.isProduction) {
    requireEnv("JWT_SECRET");

    requireEnv("DATABASE_URL");

    requireEnv("INTERNAL_SECRET");
  }

  if (
    config.socketPort < 1 ||
    config.socketPort > 65535
  ) {
    throw new InternalServerError(
      "Invalid SOCKET_PORT configuration",
      {
        socketPort: config.socketPort,
      }
    );
  }

  if (
    config.emailEnabled &&
    !config.brevoSenderEmail
  ) {
    throw new InternalServerError(
      "BREVO_SENDER_EMAIL is required when email is enabled"
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                               IMMUTABLE EXPORT                             */
/* -------------------------------------------------------------------------- */

export const config = Object.freeze(appConfig);

validateConfig();