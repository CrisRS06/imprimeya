import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

/**
 * Structured logger for ImprimeYA
 * Uses pino for high-performance logging
 */
export const logger = pino({
  // En producción usar "info" para mejor observabilidad
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    app: "imprimeya",
    env: process.env.NODE_ENV,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(
  requestId: string,
  additionalContext?: Record<string, unknown>
) {
  return logger.child({
    requestId,
    ...additionalContext,
  });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log levels helper for consistent usage
 */
export const log = {
  debug: (msg: string, data?: Record<string, unknown>) =>
    logger.debug(data, msg),
  info: (msg: string, data?: Record<string, unknown>) => logger.info(data, msg),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn(data, msg),
  error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    if (error instanceof Error) {
      logger.error(
        { err: { message: error.message, stack: error.stack }, ...data },
        msg
      );
    } else {
      logger.error({ err: error, ...data }, msg);
    }
  },
};

export default logger;
