import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});

export function createSocketLogger(socket) {
  return logger.child({
    socketId: socket.id,
    userId: socket.data?.user?.userId || null,
    roomId: socket.data?.roomId || null,
  });
}