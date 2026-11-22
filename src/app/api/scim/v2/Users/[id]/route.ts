import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { and, eq, inArray } from "drizzle-orm";
import { isSingleDbMode } from "@/db/client";
import { memberships, users } from "@/db/schema";
import { ApiError, isUuid } from "@/lib/api";
import {
    authorize,
    scimAudit,
    scimError,
    toScimUser,
    type Detail,
    workspaceContext,
} from "../../../shared";

interface UserPatch {
    disabled?: boolean;
    name?: string | null;
}

function parsePatch(body: unknown, td: Detail): UserPatch | NextResponse {
    const invalid = () => scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    const operations = (body as Record<string, unknown>).Operations;
    if (!Array.isArray(operations) || operations.length === 0) return invalid();
    const patch: UserPatch = {};
    for (const raw of operations) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid();
        const op = raw as Record<string, unknown>;
        const kind = typeof op.op === "string" ? op.op.toLowerCase() : "";
        const path = typeof op.path === "string" ? op.path.toLowerCase() : "";
        if (kind !== "add" && kind !== "replace" && kind !== "remove") return invalid();
        if (path === "active") {
            if (kind === "remove" || typeof op.value !== "boolean") return invalid();
            patch.disabled = !op.value;
            continue;
        }
        if (path === "name") {
            if (kind === "remove") {
                patch.name = null;
                continue;
            }
            if (typeof op.value === "string") {
                patch.name = op.value.trim().slice(0, 200) || null;
                continue;
            }
            if (op.value && typeof op.value === "object" && !Array.isArray(op.value)) {
                const value = op.value as Record<string, unknown>;
                const given = typeof value.givenName === "string" ? value.givenName.trim() : "";
                const family = typeof value.familyName === "string" ? value.familyName.trim() : "";
                patch.name = [given, family].filter(Boolean).join(" ").slice(0, 200) || null;
                continue;
            }
        }
        return invalid();
    }
    return patch;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const auth = authorize(request, td);
    if (auth instanceof NextResponse) return auth;
    const id = (await params).id;
    if (!isUuid(id)) return scimError(404, td("notFound", "User not found."));
    try {
        const ctx = await workspaceContext(auth.slug, td);
        if (ctx instanceof NextResponse) return ctx;
        const rows = await ctx.db
            .select({ user: users })
            .from(users)
            .innerJoin(memberships, eq(memberships.userId, users.id))
            .where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(users.id, id)))
            .limit(1);
        const user = rows[0]?.user;
        if (!user) return scimError(404, td("notFound", "User not found."));
        return NextResponse.json(toScimUser(user));
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "User not found."));
        }
        console.error("SCIM GET /Users/[id]", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const auth = authorize(request, td);
    if (auth instanceof NextResponse) return auth;
    if (isSingleDbMode()) {
        return scimError(403, "SCIM user modification is not supported in single-database mode.");
    }
    const id = (await params).id;
    if (!isUuid(id)) return scimError(404, td("notFound", "User not found."));
    try {
        const ctx = await workspaceContext(auth.slug, td);
        if (ctx instanceof NextResponse) return ctx;
        const rows = await ctx.db
            .select({ user: users })
            .from(users)
            .innerJoin(memberships, eq(memberships.userId, users.id))
            .where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(users.id, id)))
            .limit(1);
        if (!rows[0]) return scimError(404, td("notFound", "User not found."));
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        const patch = parsePatch(body, td);
        if (patch instanceof NextResponse) return patch;
        if (Object.keys(patch).length === 0) {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        await ctx.db
            .update(users)
            .set({ ...patch, updatedAt: new Date() })
            .where(
                and(
                    eq(users.id, id),
                    inArray(
                        users.id,
                        ctx.db
                            .select({ userId: memberships.userId })
                            .from(memberships)
                            .where(eq(memberships.workspaceId, ctx.workspaceId)),
                    ),
                ),
            );
        const updated = await ctx.db.query.users.findFirst({ where: eq(users.id, id) });
        if (!updated) return scimError(404, td("notFound", "User not found."));
        await scimAudit({
            db: ctx.db,
            workspaceId: ctx.workspaceId,
            request,
            action: "scim.patch_user",
            entityType: "user",
            entityId: id,
            metadata: patch as Record<string, unknown>,
        });
        return NextResponse.json(toScimUser(updated));
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "User not found."));
        }
        console.error("SCIM PATCH /Users/[id]", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}
