"use strict";

const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
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
          bindings: () => ({ service: "codroom-socket" }),
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

function createSocketLogger(socket, extras = {}) {
  return logger.child({
    socketId: socket.id,
    transport: socket.conn?.transport?.name,
    ...extras,
  });
}

module.exports = { logger, createSocketLogger };
