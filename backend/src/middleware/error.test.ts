import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { errorHandler } from "./error.js";

describe("Error handler", () => {
    it("returns JSON with correct status code for HTTPException", async () => {
        const app = new Hono();

        app.get("/test", () => {
            throw new HTTPException(404, { message: "Not found" });
        });

        app.onError(errorHandler);

        const res = await app.request("/test");
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.status).toBe(404);
        expect(body.message).toBe("Not found");
    });

    it("returns 400 for SyntaxError", async () => {
        const app = new Hono();

        app.post("/test", () => {
            throw new SyntaxError("Invalid JSON");
        });

        app.onError(errorHandler);

        const res = await app.request("/test", { method: "POST" });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.status).toBe(400);
        expect(body.code).toBe("PARSE_ERROR");
        expect(body.message).toBe("Invalid request body");
    });

    it("returns 500 for unhandled errors", async () => {
        const app = new Hono();

        app.get("/test", () => {
            throw new Error("Something went wrong");
        });

        app.onError(errorHandler);

        const res = await app.request("/test");
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.status).toBe(500);
        expect(body.code).toBe("INTERNAL_ERROR");
        expect(body.message).toBe("An internal error occurred");
    });
});
