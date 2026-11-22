import { ok } from "@/lib/api";
import { describeAll } from "@/ops/registry";

export async function GET() {
    return ok({
        name: "General Portal operator API",
        version: 1,
        auth: "Bearer <operator token>",
        transport: "HTTPS only in production",
        commands: describeAll(),
        endpoints: {
            run: "POST /api/ops/run",
            openapi: "GET /api/ops/openapi.json",
            manifest: "GET /api/ops/manifest.json",
            health: "GET /api/ops/health",
        },
    });
}
