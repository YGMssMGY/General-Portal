import { describe, it, expect, vi } from "vitest";
import { logger, requestLogger, createLogger } from "../../../src/lib/logger.js";
import { Context } from "hono";

describe("logger", () => {
	it("creates a logger instance", () => {
		expect(logger).toBeDefined();
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.error).toBe("function");
	});

	it("createLogger returns a pino logger", () => {
		const l = createLogger();
		expect(l).toBeDefined();
		expect(typeof l.info).toBe("function");
	});

	it("requestLogger middleware sets requestId on context", async () => {
		const c = {
			set: vi.fn(),
			get: vi.fn(),
			req: { method: "GET", path: "/api/test" },
			res: { status: 200 },
		} as unknown as Context;
		const next = vi.fn();

		await requestLogger(c, next);

		expect(c.set).toHaveBeenCalledWith("requestId", expect.stringContaining("req-"));
		expect(c.set).toHaveBeenCalledWith("logger", logger);
		expect(next).toHaveBeenCalledOnce();
	});
});
