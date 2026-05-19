import pino from "pino";
import { Context, Next } from "hono";
import { env } from "./env.js";

let requestCounter = 0;

export function createLogger() {
  return pino({
    transport:
      env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    level: env.NODE_ENV === "production" ? "info" : "debug",
  });
}

export const logger = createLogger();

export async function requestLogger(c: Context, next: Next) {
  const requestId = `req-${++requestCounter}-${Date.now()}`;
  const start = Date.now();

  c.set("requestId", requestId);
  c.set("logger", logger);

  logger.info({ requestId, method: c.req.method, path: c.req.path }, "request");

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({ requestId, status, durationMs: duration }, "response");
}
