import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { authenticateOps } from "@/ops/lib/auth";
import { executeAction } from "@/ops/engine";
import { sensitiveLimitCheck } from "@/lib/rate-limit-guard";

const bodySchema = z.object({
    action: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
    confirmationToken: z.string().optional(),
    typedValue: z.string().optional(),
    yes: z.boolean().optional(),
    idempotencyKey: z.string().min(1).max(120).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const auth = authenticateOps(request);
        if (auth.error || !auth.ctx)
            return fail(auth.error?.message ?? "Unauthorized", auth.error?.status ?? 401);
        const limited = await sensitiveLimitCheck(request, "ops-run");
        if (limited) return fail("Too many requests", 429);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return fail("Invalid request body", 400);
        const b = parsed.data;

        const result = await executeAction(b.action, b.params, {
            ...auth.ctx,
            confirmationToken: b.confirmationToken,
            typedValue: b.typedValue,
            yes: b.yes,
            idempotencyKey: b.idempotencyKey ?? request.headers.get("idempotency-key") ?? undefined,
        });

        if (result.ok) {
            const res = ok(result.data);
            res.headers.set("X-Action", result.action);
            res.headers.set("X-Duration-Ms", String(result.durationMs));
            return res;
        }
        if (result.status === "confirmation-required") {
            const res = fail("Confirmation required", 409);
            const body = (await res.json()) as Record<string, unknown>;
            return new Response(
                JSON.stringify({
                    ...body,
                    action: result.action,
                    confirmationToken: result.confirmationToken,
                    preview: result.preview,
                    expiresAt: result.expiresAt,
                    hint: result.hint,
                }),
                { status: 409, headers: { "Content-Type": "application/json" } },
            );
        }
        const status =
            result.code === "FORBIDDEN"
                ? 403
                : result.code === "UNKNOWN_ACTION"
                  ? 404
                  : result.code === "VALIDATION" ||
                      result.code === "INVALID_CONFIRMATION" ||
                      result.code === "CONFIRMATION_MISMATCH" ||
                      result.code === "CONFIRMATION_REQUIRED"
                    ? 400
                    : 500;
        const res = fail(result.message, status);
        res.headers.set("X-Action", result.action);
        return res;
    } catch (e) {
        return handleRouteError("POST /api/ops/run", e);
    }
}
