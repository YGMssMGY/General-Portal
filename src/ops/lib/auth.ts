import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { config } from "@/config";
import { verifyToken } from "../actions/system";
import type { OpsContext, OpsScope } from "../types";

const ALL_SCOPES: OpsScope[] = ["ops:read", "ops:deploy", "ops:backup", "ops:danger"];

function equalSecret(a: string, b: string): boolean {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    if (aa.length !== bb.length) return false;
    return timingSafeEqual(aa, bb);
}

export interface OpsAuthResult {
    ctx: OpsContext | null;
    error: { status: number; message: string } | null;
}

export function authenticateOps(request: NextRequest): OpsAuthResult {
    if (config.nodeEnv === "production" && request.headers.get("x-forwarded-proto") !== "https") {
        return { ctx: null, error: { status: 403, message: "HTTPS required" } };
    }
    if (config.opsAllowedIps.trim() !== "") {
        const allowed = new Set(
            config.opsAllowedIps
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
        );
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            "";
        if (!ip || !allowed.has(ip)) {
            return { ctx: null, error: { status: 403, message: "Source IP not allowed" } };
        }
    }
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
        return { ctx: null, error: { status: 401, message: "Operator token required" } };
    }
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        undefined;
    if (config.opsToken && equalSecret(token, config.opsToken)) {
        return {
            ctx: { operatorId: "env-token", source: "api", scopes: ALL_SCOPES, ip },
            error: null,
        };
    }
    const verified = verifyToken(token);
    if (!verified.ok || !verified.subject || !verified.scopes) {
        return { ctx: null, error: { status: 401, message: "Invalid or expired operator token" } };
    }
    return {
        ctx: {
            operatorId: verified.subject,
            source: "api",
            scopes: verified.scopes,
            ip,
        },
        error: null,
    };
}
