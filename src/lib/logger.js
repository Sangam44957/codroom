import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),

  redact: {
    paths: [
      "password",
      "joinToken",
      "shareToken",
      "token",
      "*.password",
      "*.token",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },

  ...(isProd
    ? {
        formatters: {
          level: (label) => ({ level: label }),
          bindings: () => ({ service: "codroom-api" }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

/**
 * Creates a child logger bound to a specific API request.
 * Safe to call in any Next.js API route (server-side only).
 */
export function createRequestLogger(request, extras = {}) {
  return logger.child({
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    method: request.method,
    path: new URL(request.url).pathname,
    ...extras,
  });
}

/**
 * Creates a child logger bound to a Socket.IO socket.
 * For use in server/socket.js (CJS — import via require).
 */
export function createSocketLogger(socket, extras = {}) {
  return logger.child({
    socketId: socket.id,
    transport: socket.conn?.transport?.name,
    ...extras,
  });
}
