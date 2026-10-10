import { and, eq, gt, isNull, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessions } from "@/db/schema";
import { handleRouteError, ok, parseBody } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { requireTenant, sha256Hex } from "@/lib/tenant";

const deleteSchema = z.object({
    id: z.string().uuid().optional(),
});

function maskIp(ip: string | null): string | null {
    if (!ip) return null;
    const v4 = ip.split(".");
    if (v4.length === 4 && v4.every((p) => /^\d+$/.test(p))) {
        return `${v4[0]}.${v4[1]}.${v4[2]}.x`;
    }
    if (ip.includes(":")) {
        return `${ip.split(":")[0]}:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx`;
    }
    return null;
}

function parseAgent(ua: string | null): string {
    if (!ua) return "Unknown";
    let browser = "Other";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua)) browser = "Safari";
    let os = "Other";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad/.test(ua)) os = "iOS";
    else if (/Mac OS/.test(ua)) os = "macOS";
    else if (/Linux/.test(ua)) os = "Linux";
    return `${browser} / ${os}`;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        const now = new Date();
        const rows = await t.db.query.sessions.findMany({
            where: and(
                eq(sessions.userId, t.userId),
                isNull(sessions.revokedAt),
                gt(sessions.expiresAt, now),
            ),
            columns: {
                id: true,
                tokenHash: true,
                provider: true,
                createdAt: true,
                lastSeenAt: true,
                expiresAt: true,
                ipAddress: true,
                userAgent: true,
            },
        });
        const currentHash = sha256Hex(t.token);
        return ok(
            rows.map((r) => ({
                id: r.id,
                provider: r.provider,
                createdAt: r.createdAt,
                lastSeenAt: r.lastSeenAt,
                expiresAt: r.expiresAt,
                ipAddress: maskIp(r.ipAddress),
                device: parseAgent(r.userAgent),
                current: r.tokenHash === currentHash,
            })),
        );
    } catch (e) {
        return handleRouteError("GET /api/account/sessions", e);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        const body = await parseBody(deleteSchema, request);
        const currentHash = sha256Hex(t.token);
        if (body.id) {
            const row = await t.db.query.sessions.findFirst({
                where: and(eq(sessions.id, body.id), eq(sessions.userId, t.userId)),
                columns: { id: true, tokenHash: true },
            });
            if (!row) return apiError("Session not found", 404);
            if (row.tokenHash === currentHash) {
                return apiError("Cannot revoke the current session here. Use logout instead.", 400);
            }
            await t.db
                .update(sessions)
                .set({ revokedAt: new Date() })
                .where(eq(sessions.id, row.id));
            return ok({ revoked: true });
        }
        await t.db
            .update(sessions)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(sessions.userId, t.userId),
                    ne(sessions.tokenHash, currentHash),
                    isNull(sessions.revokedAt),
                ),
            );
        return ok({ revokedOthers: true });
    } catch (e) {
        return handleRouteError("DELETE /api/account/sessions", e);
    }
}
