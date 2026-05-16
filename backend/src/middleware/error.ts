import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        timestamp: new Date().toISOString(),
        status: err.status,
        code: err.status < 500 ? "VALIDATION_ERROR" : "SERVER_ERROR",
        message: err.message,
        path: c.req.path,
      },
      err.status as ContentfulStatusCode,
    );
  }

  if (err instanceof SyntaxError) {
    return c.json(
      {
        timestamp: new Date().toISOString(),
        status: 400,
        code: "PARSE_ERROR",
        message: "Invalid request body",
        path: c.req.path,
      },
      400 as ContentfulStatusCode,
    );
  }

  console.error("Unhandled error:", err);
  return c.json(
    {
      timestamp: new Date().toISOString(),
      status: 500,
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
      path: c.req.path,
    },
    500 as ContentfulStatusCode,
  );
};
