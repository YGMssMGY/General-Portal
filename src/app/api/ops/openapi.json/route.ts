import { ok } from "@/lib/api";
import { config } from "@/config";
import { describeAll } from "@/ops/registry";

export async function GET() {
    const body = {
        openapi: "3.0.3",
        info: {
            title: "General Portal Operator API",
            version: "1.0.0",
            description:
                "HTTPS operator control plane. Bearer token required except for discovery endpoints.",
        },
        servers: [{ url: config.baseUrl }],
        security: [{ bearerAuth: [] }],
        paths: {
            "/api/ops": {
                get: {
                    tags: ["Discovery"],
                    summary: "Capability directory with ready-to-run curl and irm examples",
                    responses: { "200": { description: "Capability directory" } },
                },
            },
            "/api/ops/manifest.json": {
                get: {
                    tags: ["Discovery"],
                    summary: "Agent tool manifest",
                    responses: { "200": { description: "Tool definitions" } },
                },
            },
            "/api/ops/health": {
                get: {
                    tags: ["Discovery"],
                    summary: "Operator API status without secrets",
                    responses: { "200": { description: "Status" } },
                },
            },
            "/api/ops/run": {
                post: {
                    tags: ["Execution"],
                    summary: "Execute any registered operator action",
                    parameters: [
                        {
                            name: "Idempotency-Key",
                            in: "header",
                            required: false,
                            schema: { type: "string" },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["action"],
                                    properties: {
                                        action: {
                                            type: "string",
                                            enum: describeAll().map((a) => a.id),
                                        },
                                        params: { type: "object" },
                                        confirmationToken: { type: "string" },
                                        typedValue: { type: "string" },
                                        yes: { type: "boolean" },
                                        idempotencyKey: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "Action result" },
                        "202": { description: "Long-running action accepted" },
                        "400": { description: "Validation or confirmation error" },
                        "401": { description: "Missing or invalid operator token" },
                        "403": { description: "Insufficient scope, non-HTTPS, or IP not allowed" },
                        "409": {
                            description: "Confirmation required; token and preview in the body",
                        },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    description: "Scoped operator token",
                },
            },
            schemas: {
                Envelope: {
                    type: "object",
                    required: ["success"],
                    properties: {
                        success: { type: "boolean" },
                        data: {},
                        error: { type: "string" },
                    },
                },
            },
        },
    };
    return ok(body);
}
