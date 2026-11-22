import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/config";
import { opsAudit } from "./lib/audit";
import { getAction } from "./registry";
import type { OpsContext, OpsResult } from "./types";

const CONFIRM_TTL_MS = 5 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const idempotency = new Map<string, { at: number; result: OpsResult }>();

function sign(payload: string): string {
    return createHmac("sha256", config.opsSecret).update(payload).digest("base64url");
}

function makeConfirmation(action: string, paramsHash: string, operator: string): string {
    const exp = Date.now() + CONFIRM_TTL_MS;
    const payload = Buffer.from(
        JSON.stringify({ a: action, p: paramsHash, o: operator, e: exp }),
        "utf8",
    ).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

function readConfirmation(token: string): {
    ok: boolean;
    action?: string;
    paramsHash?: string;
    operator?: string;
    expired?: boolean;
} {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return { ok: false };
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
            a: string;
            p: string;
            o: string;
            e: number;
        };
        if (data.e < Date.now()) return { ok: false, expired: true };
        return { ok: true, action: data.a, paramsHash: data.p, operator: data.o };
    } catch {
        return { ok: false };
    }
}

function paramsHash(action: string, input: unknown): string {
    return createHash("sha256").update(JSON.stringify({ action, input })).digest("hex");
}

function scopeAllowed(ctx: OpsContext, required: string[]): boolean {
    if (ctx.source === "tui") return true;
    return required.every((s) => ctx.scopes.includes(s as never));
}

function cachePrune(): void {
    if (idempotency.size <= 1000) return;
    const now = Date.now();
    for (const [k, v] of idempotency) {
        if (now - v.at > IDEMPOTENCY_TTL_MS) idempotency.delete(k);
    }
    while (idempotency.size > 1000) {
        const oldest = [...idempotency.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!oldest) break;
        idempotency.delete(oldest[0]);
    }
}

export async function executeAction(
    actionId: string,
    rawInput: unknown,
    ctx: OpsContext,
): Promise<OpsResult> {
    const started = performance.now();
    const action = getAction(actionId);
    if (!action) {
        return {
            ok: false,
            status: "error",
            action: actionId,
            code: "UNKNOWN_ACTION",
            message: `Unknown action: ${actionId}`,
            durationMs: Math.round(performance.now() - started),
        };
    }

    if (!scopeAllowed(ctx, action.scopes)) {
        opsAudit(ctx, actionId, "", "denied: insufficient scope");
        return {
            ok: false,
            status: "error",
            action: actionId,
            code: "FORBIDDEN",
            message: "Insufficient operator scope",
            durationMs: Math.round(performance.now() - started),
        };
    }

    let input: unknown;
    try {
        input = action.params.parse(rawInput ?? {});
    } catch (e) {
        return {
            ok: false,
            status: "error",
            action: actionId,
            code: "VALIDATION",
            message: e instanceof Error ? e.message : "Invalid parameters",
            durationMs: Math.round(performance.now() - started),
        };
    }

    const idemKey = ctx.idempotencyKey
        ? `${ctx.operatorId}:${ctx.idempotencyKey}:${actionId}`
        : null;
    if (idemKey) {
        const cached = idempotency.get(idemKey);
        if (cached && Date.now() - cached.at < IDEMPOTENCY_TTL_MS) return cached.result;
    }

    const hash = paramsHash(actionId, input);
    if (action.destructive && !ctx.yes && !ctx.confirmationToken) {
        const preview = action.preview ? await action.preview(input as never, ctx) : null;
        const token = makeConfirmation(actionId, hash, ctx.operatorId);
        opsAudit(ctx, actionId, JSON.stringify(input), "confirmation-required");
        return {
            ok: false,
            status: "confirmation-required",
            action: actionId,
            confirmationToken: token,
            preview,
            expiresAt: new Date(Date.now() + CONFIRM_TTL_MS).toISOString(),
            hint: "Repeat with confirmationToken and typedValue equal to the target slug or email.",
        };
    }

    if (action.destructive && action.confirmField) {
        if (!ctx.confirmationToken) {
            return {
                ok: false,
                status: "error",
                action: actionId,
                code: "CONFIRMATION_REQUIRED",
                message: "A confirmation token is required",
                durationMs: Math.round(performance.now() - started),
            };
        }
        const parsed = readConfirmation(ctx.confirmationToken);
        if (
            !parsed.ok ||
            parsed.action !== actionId ||
            parsed.paramsHash !== hash ||
            parsed.operator !== ctx.operatorId
        ) {
            opsAudit(ctx, actionId, "", "denied: invalid confirmation");
            return {
                ok: false,
                status: "error",
                action: actionId,
                code: "INVALID_CONFIRMATION",
                message: parsed.expired ? "Confirmation expired" : "Invalid confirmation token",
                durationMs: Math.round(performance.now() - started),
            };
        }
        const target = (input as Record<string, unknown>)[action.confirmField];
        if (typeof target !== "string" || target !== ctx.typedValue) {
            opsAudit(ctx, actionId, String(target), "denied: typed confirmation mismatch");
            return {
                ok: false,
                status: "error",
                action: actionId,
                code: "CONFIRMATION_MISMATCH",
                message: `typedValue must equal ${action.confirmField}`,
                durationMs: Math.round(performance.now() - started),
            };
        }
    }

    try {
        const data = await action.run(input as never, ctx);
        const result: OpsResult = {
            ok: true,
            data,
            action: actionId,
            durationMs: Math.round(performance.now() - started),
        };
        opsAudit(ctx, actionId, JSON.stringify(input), "ok");
        if (idemKey) {
            cachePrune();
            idempotency.set(idemKey, { at: Date.now(), result });
        }
        return result;
    } catch (e) {
        const message = e instanceof Error ? e.message : "Action failed";
        opsAudit(ctx, actionId, JSON.stringify(input), `error: ${message}`);
        return {
            ok: false,
            status: "error",
            action: actionId,
            code: "ACTION_FAILED",
            message,
            durationMs: Math.round(performance.now() - started),
        };
    }
}
